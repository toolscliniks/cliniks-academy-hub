import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log('Subscription webhook payload:', JSON.stringify(payload, null, 2));

    const { event, subscription } = payload;

    if (!subscription?.externalReference) {
      console.log('No external reference found in subscription');
      return new Response(JSON.stringify({ status: 'ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Extract plan ID and user ID from external reference
    const planMatch = subscription.externalReference.match(/plan_([^_]+)_user_(.+)/);
    
    if (!planMatch) {
      console.log('Invalid external reference format:', subscription.externalReference);
      return new Response(JSON.stringify({ status: 'ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const [, planId, userId] = planMatch;
    console.log('Processing subscription event:', { event, planId, userId, subscriptionId: subscription.id });

    let newStatus: string;
    let updateData: any = {
      updated_at: new Date().toISOString()
    };

    switch (event) {
      case 'SUBSCRIPTION_CREATED':
      case 'SUBSCRIPTION_ACTIVATED':
        newStatus = 'active';
        updateData.status = 'active';
        updateData.activated_at = new Date().toISOString();
        break;

      case 'SUBSCRIPTION_SUSPENDED':
      case 'SUBSCRIPTION_OVERDUE':
        newStatus = 'overdue';
        updateData.status = 'overdue';
        break;

      case 'SUBSCRIPTION_CANCELLED':
      case 'SUBSCRIPTION_EXPIRED':
        newStatus = 'cancelled';
        updateData.status = 'cancelled';
        updateData.cancelled_at = new Date().toISOString();
        break;

      case 'SUBSCRIPTION_RENEWED':
        newStatus = 'active';
        updateData.status = 'active';
        updateData.renewed_at = new Date().toISOString();
        // Update end date based on billing cycle
        const currentDate = new Date();
        if (subscription.cycle === 'YEARLY') {
          updateData.ends_at = new Date(currentDate.setFullYear(currentDate.getFullYear() + 1)).toISOString();
        } else {
          updateData.ends_at = new Date(currentDate.setMonth(currentDate.getMonth() + 1)).toISOString();
        }
        break;

      default:
        console.log('Unhandled subscription event:', event);
        return new Response(JSON.stringify({ status: 'ignored' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
    }

    // Update subscription in database
    const { error: subscriptionError } = await supabaseClient
      .from('subscriptions')
      .update(updateData)
      .eq('user_id', userId)
      .eq('plan_id', planId)
      .eq('asaas_subscription_id', subscription.id);

    if (subscriptionError) {
      console.error('Error updating subscription:', subscriptionError);
      throw subscriptionError;
    }

    console.log('Subscription updated successfully:', { userId, planId, newStatus });

    // If subscription is activated, enroll user in all plan courses
    if (newStatus === 'active' && (event === 'SUBSCRIPTION_CREATED' || event === 'SUBSCRIPTION_ACTIVATED' || event === 'SUBSCRIPTION_RENEWED')) {
      // Get plan courses
      const { data: planCourses, error: planCoursesError } = await supabaseClient
        .from('plan_courses')
        .select('course_id')
        .eq('plan_id', planId);

      if (planCoursesError) {
        console.error('Error fetching plan courses:', planCoursesError);
      } else if (planCourses && planCourses.length > 0) {
        // Enroll user in all plan courses
        const enrollments = planCourses.map(pc => ({
          user_id: userId,
          course_id: pc.course_id,
          enrolled_at: new Date().toISOString(),
          access_type: 'plan'
        }));

        const { error: enrollmentError } = await supabaseClient
          .from('course_enrollments')
          .upsert(enrollments, { 
            onConflict: 'user_id,course_id',
            ignoreDuplicates: true 
          });

        if (enrollmentError) {
          console.error('Error enrolling user in plan courses:', enrollmentError);
        } else {
          console.log('User enrolled in plan courses:', { userId, planId, coursesCount: planCourses.length });
        }
      }
    }

    return new Response(JSON.stringify({ 
      status: 'success',
      subscriptionId: subscription.id,
      newStatus: newStatus
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('ERROR in subscription-webhook-asaas:', errorMessage);
    
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