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

    const { subscription_id } = await req.json();

    if (!subscription_id) {
      throw new Error("Subscription ID is required");
    }

    // Verify the subscription belongs to the user
    const { data: subscription, error: subError } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('id', subscription_id)
      .eq('user_id', userData.user.id)
      .single();

    if (subError || !subscription) {
      throw new Error("Subscription not found or doesn't belong to user");
    }

    // Cancel the subscription
    const { error: updateError } = await supabaseClient
      .from('subscriptions')
      .update({ 
        status: 'cancelled',
        ends_at: new Date().toISOString()
      })
      .eq('id', subscription_id);

    if (updateError) {
      throw updateError;
    }

    // Here you would typically also call Stripe API to cancel the subscription
    // For now, we'll just update our database

    console.log(`Subscription ${subscription_id} cancelled for user ${userData.user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Subscription cancelled successfully" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("Error in cancel-subscription:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to cancel subscription" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});