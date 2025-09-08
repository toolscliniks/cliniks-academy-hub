import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAYMENT-WEBHOOK-ASAAS] ${step}${detailsStr}`);
};

// Function to generate webhook signature for validation
async function generateWebhookSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const payloadData = encoder.encode(payload);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, payloadData);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received", { 
      method: req.method, 
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    });

    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Enhanced security validations
    const userAgent = req.headers.get('user-agent') || '';
    const asaasToken = req.headers.get('asaas-access-token');
    const webhookSignature = req.headers.get('x-asaas-signature');
    
    // Validate User-Agent
    if (!userAgent.includes('Asaas')) {
      logStep('Invalid User-Agent', { userAgent });
      return new Response('Forbidden', { status: 403 });
    }
    
    // Parse webhook payload first for signature validation
    const webhookData = await req.json();
    
    // Validate webhook signature if available (recommended for production)
    const webhookSecret = Deno.env.get('ASAAS_WEBHOOK_SECRET');
    if (webhookSecret && webhookSignature) {
      const expectedSignature = await generateWebhookSignature(JSON.stringify(webhookData), webhookSecret);
      if (webhookSignature !== expectedSignature) {
        logStep('Invalid webhook signature', { received: webhookSignature, expected: expectedSignature });
        return new Response('Unauthorized', { status: 401 });
      }
    }
    
    // Rate limiting for webhook endpoint
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const { data: rateLimitData } = await supabaseClient
      .from('rate_limits')
      .select('*')
      .eq('ip_address', clientIP)
      .gte('created_at', new Date(Date.now() - 60000).toISOString())
      .order('created_at', { ascending: false });
    
    if (rateLimitData && rateLimitData.length >= 50) { // Higher limit for webhooks
      logStep('Webhook rate limit exceeded', { clientIP, requestCount: rateLimitData.length });
      return new Response('Rate limit exceeded', { status: 429 });
    }
    
    // Log this webhook request
    await supabaseClient
      .from('rate_limits')
      .insert({ ip_address: clientIP, created_at: new Date().toISOString() });

    logStep("Webhook payload received", webhookData);

    const { event, payment } = webhookData;
    
    if (!payment || !payment.id) {
      throw new Error("Invalid webhook payload: missing payment information");
    }

    // Find the invoice in our database
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('invoices')
      .select('*')
      .eq('asaas_payment_id', payment.id)
      .single();

    if (invoiceError || !invoice) {
      logStep("Invoice not found", { paymentId: payment.id });
      // Return 200 to acknowledge webhook even if invoice not found
      return new Response(JSON.stringify({ status: 'invoice_not_found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    logStep("Invoice found", { invoiceId: invoice.id, currentStatus: invoice.status });

    // Update invoice status based on payment event
    let newStatus = invoice.status;
    let shouldEnrollUser = false;
    let shouldRevokeAccess = false;

    switch (event) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED':
        newStatus = 'paid';
        shouldEnrollUser = true;
        logStep("Payment confirmed - will enroll user", { paymentId: payment.id });
        break;
      case 'PAYMENT_PENDING':
        newStatus = 'pending';
        logStep("Payment pending", { paymentId: payment.id });
        break;
      case 'PAYMENT_OVERDUE':
        newStatus = 'overdue';
        logStep("Payment overdue", { paymentId: payment.id });
        break;
      case 'PAYMENT_DELETED':
      case 'PAYMENT_REFUNDED':
      case 'PAYMENT_CHARGEBACK_REQUESTED':
      case 'PAYMENT_CHARGEBACK_DISPUTE':
        newStatus = 'cancelled';
        shouldRevokeAccess = true;
        logStep("Payment cancelled/refunded - will revoke access", { paymentId: payment.id, event });
        break;
      case 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL':
        newStatus = 'disputed';
        logStep("Payment disputed", { paymentId: payment.id });
        break;
      default:
        logStep("Unhandled event type", { event, paymentId: payment.id });
        break;
    }

    // Update invoice status
    if (newStatus !== invoice.status) {
      const { error: updateError } = await supabaseClient
        .from('invoices')
        .update({ 
          status: newStatus,
          paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoice.id);

      if (updateError) {
        throw new Error(`Failed to update invoice: ${updateError.message}`);
      }

      logStep("Invoice status updated", { invoiceId: invoice.id, newStatus });
    }

    // Process enrollment or access revocation
    if ((shouldEnrollUser || shouldRevokeAccess) && payment.externalReference && invoice.user_id) {
      // Extract course, package or plan ID from external reference
      const courseMatch = payment.externalReference.match(/course_([^_]+)_user_/);
      const packageMatch = payment.externalReference.match(/package_([^_]+)_user_/);
      const planMatch = payment.externalReference.match(/plan_([^_]+)_user_/);
      
      if (courseMatch) {
        // Handle individual course purchase
        const courseId = courseMatch[1];
        
        // Check if user is already enrolled
        const { data: existingEnrollment } = await supabaseClient
          .from('course_enrollments')
          .select('id')
          .eq('user_id', invoice.user_id)
          .eq('course_id', courseId)
          .single();

        if (!existingEnrollment) {
          const { error: enrollmentError } = await supabaseClient
            .from('course_enrollments')
            .insert({
              user_id: invoice.user_id,
              course_id: courseId,
              enrolled_at: new Date().toISOString()
            });

          if (enrollmentError) {
            logStep("Failed to enroll user in course", { error: enrollmentError.message });
          } else {
            logStep("User enrolled in course successfully", { userId: invoice.user_id, courseId });
          }
        } else {
          logStep("User already enrolled in course", { userId: invoice.user_id, courseId });
        }
      } else if (packageMatch) {
        // Handle package purchase
        const packageId = packageMatch[1];
        
        // Get all courses in the package
        const { data: packageCourses, error: packageError } = await supabaseClient
          .from('course_package_courses')
          .select('course_id')
          .eq('package_id', packageId);

        if (packageError || !packageCourses) {
          logStep("Failed to get package courses", { error: packageError?.message });
        } else {
          // Enroll user in all courses from the package
          for (const packageCourse of packageCourses) {
            const { data: existingEnrollment } = await supabaseClient
              .from('course_enrollments')
              .select('id')
              .eq('user_id', invoice.user_id)
              .eq('course_id', packageCourse.course_id)
              .single();

            if (!existingEnrollment) {
              const { error: enrollmentError } = await supabaseClient
                .from('course_enrollments')
                .insert({
                  user_id: invoice.user_id,
                  course_id: packageCourse.course_id,
                  enrolled_at: new Date().toISOString()
                });

              if (enrollmentError) {
                logStep("Failed to enroll user in package course", { 
                  error: enrollmentError.message, 
                  courseId: packageCourse.course_id 
                });
              } else {
                logStep("User enrolled in package course successfully", { 
                  userId: invoice.user_id, 
                  courseId: packageCourse.course_id 
                });
              }
            }
          }
          logStep("Package enrollment completed", { userId: invoice.user_id, packageId });
        }
      } else if (planMatch) {
        // Handle subscription plan purchase
        const planId = planMatch[1];
        
        // Update subscription status to active
        const { error: subscriptionError } = await supabaseClient
          .from('subscriptions')
          .update({ 
            status: 'active',
            activated_at: new Date().toISOString()
          })
          .eq('user_id', invoice.user_id)
          .eq('plan_id', planId);

        if (subscriptionError) {
          logStep("Failed to activate subscription", { error: subscriptionError.message });
        } else {
          logStep("Subscription activated successfully", { userId: invoice.user_id, planId });
        }
      } else {
        logStep("Could not determine course, package or plan ID", { 
          userId: invoice.user_id,
          externalReference: payment.externalReference 
        });
      }
    }

    // Handle access revocation if needed
    if (shouldRevokeAccess && payment.externalReference && invoice.user_id) {
      const courseMatch = payment.externalReference.match(/course_([^_]+)_user_/);
      const planMatch = payment.externalReference.match(/plan_([^_]+)_user_/);
      
      if (courseMatch) {
        const courseId = courseMatch[1];
        
        // Remove course enrollment
        const { error: revokeError } = await supabaseClient
          .from('course_enrollments')
          .delete()
          .eq('user_id', invoice.user_id)
          .eq('course_id', courseId);

        if (revokeError) {
          logStep("Failed to revoke course access", { error: revokeError.message });
        } else {
          logStep("Course access revoked successfully", { userId: invoice.user_id, courseId });
        }
      } else if (planMatch) {
        const planId = planMatch[1];
        
        // Deactivate subscription
        const { error: deactivateError } = await supabaseClient
          .from('subscriptions')
          .update({ 
            status: 'cancelled',
            cancelled_at: new Date().toISOString()
          })
          .eq('user_id', invoice.user_id)
          .eq('plan_id', planId);

        if (deactivateError) {
          logStep("Failed to deactivate subscription", { error: deactivateError.message });
        } else {
          logStep("Subscription deactivated successfully", { userId: invoice.user_id, planId });
        }
      }
    }

    return new Response(JSON.stringify({ 
      status: 'success',
      invoiceId: invoice.id,
      newStatus: newStatus
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in payment-webhook-asaas", { message: errorMessage });
    
    // Always return 200 for webhooks to prevent retries
    return new Response(JSON.stringify({ 
      status: 'error', 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});