import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createHmac } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UnifiedPayload {
  type: 'user_signup' | 'course_purchase' | 'plan_purchase';
  request_id: string;
  timestamp: string;
  user: {
    id: string;
    name: string;
    email: string;
    cpf: string;
    phone: string;
  };
  item: {
    kind: 'course' | 'plan';
    id: string;
    name: string;
    price_cents: number;
    currency: 'BRL';
    interval?: 'monthly' | 'annual';
    included_courses?: Array<{
      course_id: string;
      title: string;
    }>;
  };
  meta: {
    source: 'web';
    ip?: string;
    user_agent?: string;
  };
}

const validatePayload = (payload: any): payload is UnifiedPayload => {
  try {
    // Validação básica dos campos obrigatórios
    if (!payload.type || !['user_signup', 'course_purchase', 'plan_purchase'].includes(payload.type)) {
      return false;
    }
    
    if (!payload.request_id || typeof payload.request_id !== 'string') {
      return false;
    }
    
    if (!payload.user?.name || !payload.user?.email || !payload.user?.cpf || !payload.user?.phone) {
      return false;
    }
    
    // Validar CPF (deve ter exatamente 11 dígitos)
    const cpf = payload.user.cpf.replace(/[^\d]/g, '');
    if (cpf.length !== 11) {
      return false;
    }
    
    // Validar telefone (deve ter 10 ou 11 dígitos)  
    const phone = payload.user.phone.replace(/[^\d]/g, '');
    if (phone.length < 10 || phone.length > 11) {
      return false;
    }
    
    if (!payload.item?.kind || !['course', 'plan'].includes(payload.item?.kind)) {
      return false;
    }
    
    if (!payload.item?.id || !payload.item?.name || typeof payload.item?.price_cents !== 'number') {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
};

const generateSignature = async (payload: string, secret: string): Promise<string> => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const sendToN8n = async (payload: UnifiedPayload, webhookUrl: string, secret: string, retryCount = 0): Promise<any> => {
  const maxRetries = 3;
  const backoffMultiplier = 1000; // 1s, 2s, 4s
  
  try {
    const payloadString = JSON.stringify(payload);
    const signature = await generateSignature(payloadString, secret);
    
    console.log(`[${payload.request_id}] Sending to n8n (attempt ${retryCount + 1}/${maxRetries + 1})`);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': `sha256=${signature}`,
        'User-Agent': 'Cliniks-Academy-Gateway/1.0'
      },
      body: payloadString
    });
    
    const responseText = await response.text();
    
    if (!response.ok) {
      throw new Error(`n8n responded with ${response.status}: ${responseText}`);
    }
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw_response: responseText };
    }
    
    console.log(`[${payload.request_id}] n8n responded successfully:`, responseData);
    
    return {
      success: true,
      status: response.status,
      data: responseData
    };
    
  } catch (error) {
    console.error(`[${payload.request_id}] n8n error (attempt ${retryCount + 1}):`, error.message);
    
    if (retryCount < maxRetries) {
      const delay = backoffMultiplier * Math.pow(2, retryCount);
      console.log(`[${payload.request_id}] Retrying in ${delay}ms...`);
      await sleep(delay);
      return sendToN8n(payload, webhookUrl, secret, retryCount + 1);
    }
    
    throw error;
  }
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // 1. Validação de Auth
    const authHeader = req.headers.get("Authorization");
    let user = null;
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
      if (!userError && userData.user) {
        user = userData.user;
      }
    }
    
    // Permitir service_role também
    const isServiceRole = authHeader?.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
    
    if (!user && !isServiceRole) {
      console.error("Authentication required");
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // 2. Validação de Payload
    const payload = await req.json();
    
    if (!validatePayload(payload)) {
      console.error("Invalid payload:", payload);
      return new Response(
        JSON.stringify({ 
          error: "Invalid payload format",
          details: "Payload must include all required fields with correct types"
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // 3. Verificação de Dados Obrigatórios
    const missingFields = [];
    if (!payload.user.name?.trim()) missingFields.push('nome completo');
    if (!payload.user.email?.trim()) missingFields.push('email');
    if (!payload.user.cpf?.trim()) missingFields.push('CPF');
    if (!payload.user.phone?.trim()) missingFields.push('telefone');
    
    if (missingFields.length > 0) {
      console.error(`[${payload.request_id}] Missing required fields:`, missingFields);
      return new Response(
        JSON.stringify({
          error: 'Dados obrigatórios não preenchidos',
          message: `Para processar, você precisa completar seu perfil com: ${missingFields.join(', ')}`,
          missing_fields: missingFields,
          action: 'complete_profile'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    // 4. Verificação de Idempotência
    const eventTable = payload.type === 'user_signup' ? 'signup_webhook_events' : 'payment_events';
    
    const { data: existingEvent } = await supabaseClient
      .from(eventTable)
      .select('*')
      .eq('request_id', payload.request_id)
      .eq('status', 'completed')
      .single();
    
    if (existingEvent) {
      console.log(`[${payload.request_id}] Request already processed successfully`);
      return new Response(
        JSON.stringify({
          success: true,
          message: "Request already processed",
          request_id: payload.request_id,
          cached: true,
          data: existingEvent.n8n_response
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
    
    // 5. Obter configurações do n8n
    const webhookUrl = Deno.env.get("N8N_WEBHOOK_URL");
    const signingSecret = Deno.env.get("N8N_SIGNING_SECRET") || "default_secret_change_me";
    
    if (!webhookUrl) {
      throw new Error("N8N_WEBHOOK_URL not configured");
    }
    
    // 6. Registrar evento como processing
    const eventData = payload.type === 'user_signup' 
      ? { 
          request_id: payload.request_id,
          status: 'processing',
          user_id: user?.id || null,
          user_data: payload
        }
      : {
          request_id: payload.request_id,
          status: 'processing',
          user_id: user?.id || null,
          item: payload.item
        };
    
    await supabaseClient
      .from(eventTable)
      .upsert(eventData);
    
    console.log(`[${payload.request_id}] Event registered as processing`);
    
    // 7. Enviar para n8n com retry
    try {
      const n8nResponse = await sendToN8n(payload, webhookUrl, signingSecret);
      
      // 8. Salvar resposta de sucesso
      await supabaseClient
        .from(eventTable)
        .update({
          status: 'completed',
          n8n_response: n8nResponse.data,
          error_details: null
        })
        .eq('request_id', payload.request_id);
      
      console.log(`[${payload.request_id}] Event completed successfully`);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Request processed successfully",
          request_id: payload.request_id,
          data: n8nResponse.data
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
      
    } catch (error) {
      // 9. Salvar erro
      await supabaseClient
        .from(eventTable)
        .update({
          status: 'failed',
          error_details: {
            message: error.message,
            timestamp: new Date().toISOString(),
            attempts: 4 // Max retries + 1
          },
          retry_count: 3
        })
        .eq('request_id', payload.request_id);
      
      console.error(`[${payload.request_id}] All retry attempts failed:`, error.message);
      
      return new Response(
        JSON.stringify({
          error: "Failed to process request after retries",
          request_id: payload.request_id,
          details: error.message
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 502,
        }
      );
    }
    
  } catch (error: any) {
    console.error("Unexpected error in payments-n8n-proxy:", error);
    
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});