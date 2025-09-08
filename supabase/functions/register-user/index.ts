import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegisterRequest {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerCpfCnpj?: string;
  source?: string;
}

interface WebhookData {
  nome: string;
  email: string;
  whatsapp: string;
  cpf_cnpj: string;
  source: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    logStep("Register user function started");
    
    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    logStep("Supabase client initialized");

    // Rate limiting check (simple implementation)
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    
    // Check if this IP has made too many requests recently
    const { data: rateLimitData } = await supabaseClient
      .from('rate_limits')
      .select('*')
      .eq('ip_address', clientIP)
      .gte('created_at', new Date(Date.now() - 60000).toISOString()) // Last minute
      .order('created_at', { ascending: false });
    
    if (rateLimitData && rateLimitData.length >= 10) { // Max 10 requests per minute
      logStep("Rate limit exceeded", { clientIP, requestCount: rateLimitData.length });
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 429,
      });
    }
    
    // Log this request for rate limiting
    await supabaseClient
      .from('rate_limits')
      .insert({ ip_address: clientIP, created_at: new Date().toISOString() });

    const body = await req.json();
    console.log('Received request body:', body);

    const { 
      customerName,
      customerEmail,
      customerPhone,
      customerCpfCnpj,
      source = 'cliniks academy'
    }: RegisterRequest = body;
    
    // Input validation
    if (!customerName || !customerEmail) {
      return new Response(
        JSON.stringify({ error: 'Nome e email são obrigatórios' }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      throw new Error('Invalid email format');
    }
    
    // Validate CPF/CNPJ format if provided
    if (customerCpfCnpj) {
      const cpfCnpjRegex = /^\d{11}$|^\d{14}$/;
      const cleanCpfCnpj = customerCpfCnpj.replace(/\D/g, '');
      if (!cpfCnpjRegex.test(cleanCpfCnpj)) {
        throw new Error('Invalid CPF/CNPJ format');
      }
    }
    
    // Validate phone format if provided
    if (customerPhone) {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      const cleanPhone = customerPhone.replace(/\D/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        throw new Error('Invalid phone format');
      }
    }
    
    // Sanitize string inputs
    const sanitizedCustomerName = customerName.trim().substring(0, 100);
    const sanitizedCustomerEmail = customerEmail.trim().toLowerCase();
    
    logStep("Request data validated and sanitized", { 
      customerName: sanitizedCustomerName, 
      customerEmail: sanitizedCustomerEmail,
      source
    });

    // Prepare webhook data
    const webhookData: WebhookData = {
      nome: sanitizedCustomerName,
      email: sanitizedCustomerEmail,
      whatsapp: customerPhone || '',
      cpf_cnpj: customerCpfCnpj || '',
      source: source
    };

    logStep("Webhook data prepared", webhookData);

    // Get webhook URL from settings
    const { data: webhookSettings } = await supabaseClient
      .from('site_settings')
      .select('setting_value')
      .eq('setting_key', 'register_webhook_url')
      .single();

    const webhookUrl = webhookSettings?.setting_value?.replace(/"/g, '') || 'https://n8n.clinicagestao.com.br/webhook/cadastroclinica';

    // Send data to n8n webhook
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookData)
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      logStep("Webhook error", { status: webhookResponse.status, error: errorText });
      throw new Error(`Failed to send data to webhook: ${webhookResponse.status} - ${errorText}`);
    }

    logStep("Data sent to webhook successfully", { webhookUrl, status: webhookResponse.status });

    // Store registration record in Supabase for tracking
    const { error: insertError } = await supabaseClient
      .from('user_registrations')
      .insert({
        customer_name: sanitizedCustomerName,
        customer_email: sanitizedCustomerEmail,
        customer_phone: customerPhone,
        customer_cpf_cnpj: customerCpfCnpj,
        source: source,
        status: 'sent_to_webhook',
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error storing registration record:', insertError);
      // Don't throw error here, webhook was sent successfully
    }

    // Return success response
    const response = {
      success: true,
      message: 'Cadastro enviado com sucesso! Você receberá informações em breve.',
      customerEmail: sanitizedCustomerEmail
    };

    logStep("Registration process completed", {
      customerEmail: sanitizedCustomerEmail,
      source
    });

    console.log('Sending response:', response);

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );

  } catch (error) {
    console.error('Error in register-user:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: error.message }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
});

function logStep(message: string, data?: any) {
  console.log(`[STEP] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}