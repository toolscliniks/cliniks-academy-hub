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
    const { eventType, data } = await req.json();

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get active webhooks for this event type
    const { data: webhooks, error } = await supabaseService
      .from('webhook_configs')
      .select('*')
      .eq('is_active', true)
      .contains('event_types', [eventType]);

    if (error) throw error;

    const webhookPromises = webhooks.map(async (webhook) => {
      try {
        const payload = {
          event: eventType,
          timestamp: new Date().toISOString(),
          data: data,
          webhook_id: webhook.id
        };

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'Cliniks-Academy-Webhook/1.0'
        };

        // Add signature if secret key is provided
        if (webhook.secret_key) {
          const signature = await generateSignature(JSON.stringify(payload), webhook.secret_key);
          headers['X-Signature'] = signature;
        }

        const response = await fetch(webhook.webhook_url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        console.log(`Webhook ${webhook.name} response:`, response.status);
        
        return {
          webhook_id: webhook.id,
          status: response.status,
          success: response.ok
        };
      } catch (error) {
        console.error(`Webhook ${webhook.name} failed:`, error);
        return {
          webhook_id: webhook.id,
          status: 500,
          success: false,
          error: error.message
        };
      }
    });

    const results = await Promise.all(webhookPromises);

    return new Response(JSON.stringify({ 
      sent: results.length,
      results
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Webhook sending error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function generateSignature(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload)
  );
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}