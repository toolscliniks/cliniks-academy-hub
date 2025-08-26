import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookData = await req.json();
    console.log('Received webhook:', webhookData);

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Extract payment information from webhook
    const { event, payment } = webhookData;
    
    if (!payment?.externalReference) {
      console.log('No external reference found in webhook');
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const planId = payment.externalReference;

    // Handle different payment events
    switch (event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        // Update subscription status to active
        const { error: updateError } = await supabaseService
          .from('subscriptions')
          .update({ 
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('plan_id', planId)
          .eq('status', 'pending');

        if (updateError) {
          console.error('Error updating subscription:', updateError);
        } else {
          console.log('Subscription activated for plan:', planId);
        }

        // Get user ID from subscription to enroll in courses
        const { data: subscription } = await supabaseService
          .from('subscriptions')
          .select('user_id, plan_id')
          .eq('plan_id', planId)
          .eq('status', 'active')
          .single();

        if (subscription) {
          // Auto-enroll user in all courses (for full access plans)
          const { data: courses } = await supabaseService
            .from('courses')
            .select('id')
            .eq('is_published', true);

          if (courses && courses.length > 0) {
            const enrollments = courses.map(course => ({
              user_id: subscription.user_id,
              course_id: course.id,
              enrolled_at: new Date().toISOString()
            }));

            await supabaseService
              .from('course_enrollments')
              .upsert(enrollments, { 
                onConflict: 'user_id,course_id',
                ignoreDuplicates: true 
              });

            console.log(`Auto-enrolled user ${subscription.user_id} in ${courses.length} courses`);
          }
        }
        break;

      case 'PAYMENT_OVERDUE':
        // Handle overdue payment
        await supabaseService
          .from('subscriptions')
          .update({ 
            status: 'overdue',
            updated_at: new Date().toISOString()
          })
          .eq('plan_id', planId);

        console.log('Subscription marked as overdue for plan:', planId);
        break;

      case 'PAYMENT_CANCELLED':
        // Handle cancelled payment
        await supabaseService
          .from('subscriptions')
          .update({ 
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('plan_id', planId);

        console.log('Subscription cancelled for plan:', planId);
        break;

      default:
        console.log('Unhandled webhook event:', event);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});