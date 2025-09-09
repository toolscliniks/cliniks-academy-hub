import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebhookPayload {
  event_type: string;
  webhook_url: string;
  user_id?: string;
  data: any;
  metadata?: any;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check for authorization header
    const authHeader = req.headers.get('Authorization');
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!authHeader || !authHeader.includes(`Bearer ${serviceRoleKey}`)) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid or missing Bearer token" }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const payload: WebhookPayload = await req.json();
    
    const { event_type, webhook_url, user_id, data, metadata } = payload;

    if (!event_type || !webhook_url) {
      throw new Error("Event type and webhook URL are required");
    }

    console.log(`Processing webhook: ${event_type} -> ${webhook_url}`);

    // Prepare webhook payload
    const webhookPayload = {
      event_type,
      timestamp: new Date().toISOString(),
      user_id,
      data,
      metadata,
      source: 'cliniks-academy'
    };

    // Prepare payload based on event type
    let finalPayload;
    
    if (event_type === 'test_payment_webhook' || event_type === 'test_register_webhook') {
      // For test webhooks, send data directly with test flag
      finalPayload = {
        ...data,
        test: true,
        event_type: event_type.replace('test_', ''),
        timestamp: new Date().toISOString(),
        source: 'cliniks-academy-test'
      };
    } else {
      // For regular webhooks, use the original format
      finalPayload = webhookPayload;
    }

    // Send webhook to n8n
    const webhookResponse = await fetch(webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Cliniks-Academy-Webhook/1.0'
      },
      body: JSON.stringify(finalPayload)
    });

    const responseText = await webhookResponse.text();
    const success = webhookResponse.ok;

    // Log webhook attempt
    const { error: logError } = await supabaseClient
      .from('webhook_logs')
      .insert({
        webhook_url,
        payload: finalPayload,
        response_status: webhookResponse.status,
        response_body: responseText,
        event_type,
        user_id,
        success,
        metadata: {
          headers: Object.fromEntries(webhookResponse.headers.entries()),
          request_id: crypto.randomUUID()
        }
      });

    if (logError) {
      console.error('Error logging webhook:', logError);
    }

    if (!success) {
      throw new Error(`Webhook failed with status ${webhookResponse.status}: ${responseText}`);
    }

    console.log(`Webhook sent successfully: ${event_type}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Webhook sent successfully",
        webhook_url,
        event_type,
        response_status: webhookResponse.status,
        payload_sent: finalPayload
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("Error in n8n-webhook-handler:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to process webhook"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

// Helper function to handle common webhook events
export const sendWebhookEvent = async (
  eventType: string,
  userData: any,
  additionalData?: any
) => {
  // Get active webhook configurations
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const { data: webhookConfigs } = await supabaseClient
    .from('webhook_configs')
    .select('*')
    .eq('is_active', true)
    .contains('event_types', [eventType]);

  if (!webhookConfigs || webhookConfigs.length === 0) {
    console.log(`No active webhooks configured for event: ${eventType}`);
    return;
  }

  // Send to all configured webhooks
  for (const config of webhookConfigs) {
    try {
      const response = await fetch('http://localhost:54321/functions/v1/n8n-webhook-handler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
        },
        body: JSON.stringify({
          event_type: eventType,
          webhook_url: config.webhook_url,
          user_id: userData?.id,
          data: { user: userData, ...additionalData },
          metadata: { config_name: config.name }
        })
      });

      if (!response.ok) {
        console.error(`Failed to send webhook for config ${config.name}`);
      }
    } catch (error) {
      console.error(`Error sending webhook for config ${config.name}:`, error);
    }
  }
};