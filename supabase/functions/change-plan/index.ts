import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }

    const { subscription_id, new_plan_id, change_type } = await req.json();

    if (!subscription_id || !new_plan_id) {
      throw new Error("Subscription ID and new plan ID are required");
    }

    // Verify the subscription belongs to the user
    const { data: subscription, error: subError } = await supabaseClient
      .from('subscriptions')
      .select('*, plans!inner(*)')
      .eq('id', subscription_id)
      .eq('user_id', userData.user.id)
      .single();

    if (subError || !subscription) {
      throw new Error("Subscription not found or doesn't belong to user");
    }

    // Get the new plan details
    const { data: newPlan, error: planError } = await supabaseClient
      .from('plans')
      .select('*')
      .eq('id', new_plan_id)
      .single();

    if (planError || !newPlan) {
      throw new Error("New plan not found");
    }

    // Calculate prorated amount if needed
    const currentPlan = subscription.plans;
    const priceDifference = newPlan.price_monthly - currentPlan.price_monthly;

    // Update the subscription
    const { error: updateError } = await supabaseClient
      .from('subscriptions')
      .update({ 
        plan_id: new_plan_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription_id);

    if (updateError) {
      throw updateError;
    }

    // Create invoice for price difference if upgrading
    if (change_type === 'upgrade' && priceDifference > 0) {
      await supabaseClient
        .from('invoices')
        .insert({
          user_id: userData.user.id,
          subscription_id: subscription_id,
          amount: priceDifference,
          currency: 'BRL',
          status: 'pending',
          due_date: new Date().toISOString(),
          invoice_type: 'upgrade',
          change_reason: `Upgrade from ${currentPlan.name} to ${newPlan.name}`
        });
    }

    // Here you would typically also call Stripe API to update the subscription
    // For now, we'll just update our database

    console.log(`Subscription ${subscription_id} changed from ${currentPlan.name} to ${newPlan.name} for user ${userData.user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Plan changed successfully",
        price_difference: priceDifference,
        new_plan: newPlan.name
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("Error in change-plan:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to change plan" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});