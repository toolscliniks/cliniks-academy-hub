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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Parse webhook payload
    const webhookData = await req.json();
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

    switch (event) {
      case 'PAYMENT_RECEIVED':
        newStatus = 'paid';
        shouldEnrollUser = true;
        break;
      case 'PAYMENT_OVERDUE':
        newStatus = 'overdue';
        break;
      case 'PAYMENT_DELETED':
      case 'PAYMENT_REFUNDED':
        newStatus = 'cancelled';
        break;
      default:
        logStep("Unhandled event type", { event });
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

    // Enroll user in course if payment was successful
    if (shouldEnrollUser) {
      // Extract course ID from external reference or find it another way
      let courseId = null;
      
      if (payment.externalReference) {
        const match = payment.externalReference.match(/course_([^_]+)_user_/);
        if (match) {
          courseId = match[1];
        }
      }

      if (courseId && invoice.user_id) {
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
            logStep("Failed to enroll user", { error: enrollmentError.message });
          } else {
            logStep("User enrolled successfully", { userId: invoice.user_id, courseId });
          }
        } else {
          logStep("User already enrolled", { userId: invoice.user_id, courseId });
        }
      } else {
        logStep("Could not determine course ID or user ID", { 
          courseId, 
          userId: invoice.user_id,
          externalReference: payment.externalReference 
        });
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