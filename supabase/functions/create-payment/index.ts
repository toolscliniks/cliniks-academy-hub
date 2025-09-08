import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  courseId?: string;
  planId?: string;
  type?: 'course' | 'plan';
  billingType?: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  customerName?: string;
  customerEmail?: string;
  customerCpfCnpj?: string;
  customerPhone?: string;
}

interface WebhookData {
  nome: string;
  email: string;
  whatsapp: string;
  cpf_cnpj: string;
  id_curso?: string;
  id_plano?: string;
  forma_pagamento: string;
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
    logStep("Function started");
    
    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    logStep("Supabase client initialized");

    // Rate limiting check (simple implementation)
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimitKey = `rate_limit_${clientIP}`;
    
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

    // Authenticate user (required for production)
    const authHeader = req.headers.get("Authorization");
    let user = null;
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
      if (!userError && userData.user) {
        user = userData.user;
        logStep("User authenticated", { userId: user.id, email: user.email });
      }
    }
    
    // In production, require authentication
    const isProduction = Deno.env.get('ENVIRONMENT') === 'production';
    if (isProduction && !user) {
      logStep("Authentication required in production");
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    
    if (!user) {
      logStep("No authentication - using test mode");
    }

    const body = await req.json();
    console.log('Received request body:', body);

    const { 
      courseId, 
      planId, 
      type, 
      billingType = 'PIX',
      customerName = 'Cliente Teste',
      customerEmail = user?.email || 'teste@cliniks.com.br',
      customerCpfCnpj,
      customerPhone
    }: PaymentRequest = body;
    
    // Input validation and sanitization
    const validBillingTypes = ['PIX', 'CREDIT_CARD', 'BOLETO'];
    if (!validBillingTypes.includes(billingType)) {
      throw new Error(`Invalid billing type: ${billingType}`);
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
      courseId, 
      planId, 
      type, 
      billingType, 
      customerName: sanitizedCustomerName, 
      customerEmail: sanitizedCustomerEmail 
    });
     
     // Basic validation - accept either courseId or planId
    if (!courseId && !planId) {
      console.error('Missing courseId or planId');
      return new Response(
        JSON.stringify({ error: 'courseId ou planId é obrigatório' }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    if (!billingType) {
      console.error('Missing billingType');
      return new Response(
        JSON.stringify({ error: 'billingType é obrigatório' }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    // Fetch item data (course or plan) from database
    let itemData;
    let itemType;
    
    if (courseId) {
      const { data, error } = await supabaseClient
        .from('courses')
        .select('id, title, price')
        .eq('id', courseId)
        .single();
      
      if (error || !data) {
        throw new Error(`Course not found: ${courseId}`);
      }
      
      itemData = data;
      itemType = 'course';
    } else if (planId) {
      const { data, error } = await supabaseClient
        .from('plans')
        .select('id, name, price_monthly, price_yearly')
        .eq('id', planId)
        .single();
      
      if (error || !data) {
        throw new Error(`Plan not found: ${planId}`);
      }
      
      // Adapt plan data to match expected structure
      itemData = {
        id: data.id,
        title: data.name,
        price: billingType === 'YEARLY' ? data.price_yearly : data.price_monthly
      };
      itemType = 'plan';
    }

    logStep("Item found and validated", { 
      id: itemData.id, 
      title: itemData.title, 
      price: itemData.price,
      type: itemType
    });

    // Get webhook URL from settings
    const { data: webhookSettings } = await supabaseClient
      .from('site_settings')
      .select('setting_value')
      .eq('setting_key', 'payment_webhook_url')
      .single();

    const webhookUrl = webhookSettings?.setting_value?.replace(/"/g, '') || 'https://n8n.clinicagestao.com.br/webhook/sucesso';

    // Prepare webhook data
    const webhookData: WebhookData = {
      nome: sanitizedCustomerName,
      email: sanitizedCustomerEmail,
      whatsapp: customerPhone || '',
      cpf_cnpj: customerCpfCnpj || '',
      forma_pagamento: billingType
    };

    // Add course or plan ID
    if (courseId) {
      webhookData.id_curso = courseId;
    } else if (planId) {
      webhookData.id_plano = planId;
    }

    logStep("Webhook data prepared", webhookData);

    // Send data to n8n webhook using the webhook handler function
    const { data: webhookResult, error: webhookError } = await supabaseClient.functions.invoke('n8n-webhook-handler', {
      body: {
        event_type: 'payment_webhook',
        webhook_url: webhookUrl,
        data: webhookData,
        metadata: {
          user_id: user?.id || null,
          item_type: itemType,
          item_id: itemData.id,
          source: 'create_payment_function'
        }
      }
    });

    if (webhookError) {
      logStep("Webhook error", { error: webhookError.message });
      throw new Error(`Failed to send data to webhook: ${webhookError.message}`);
    }

    logStep("Data sent to webhook successfully", { webhookUrl, result: webhookResult });

    // Store purchase record in Supabase for tracking
    const { error: insertError } = await supabaseClient
      .from('purchases')
      .insert({
        user_id: user?.id || null,
        customer_name: sanitizedCustomerName,
        customer_email: sanitizedCustomerEmail,
        customer_phone: customerPhone,
        customer_cpf_cnpj: customerCpfCnpj,
        course_id: courseId || null,
        plan_id: planId || null,
        payment_method: billingType,
        status: 'email_sent',
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error storing purchase record:', insertError);
      // Don't throw error here, webhook was sent successfully
    }

    // Return success response with message about email
    const response = {
      success: true,
      message: 'Dados enviados com sucesso! Você receberá um email com as instruções de pagamento em breve.',
      itemType: itemType,
      itemTitle: itemData.title,
      customerEmail: sanitizedCustomerEmail
    };

    logStep("Purchase process completed", {
      itemType,
      itemId: itemData.id,
      customerEmail: sanitizedCustomerEmail
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
    console.error('Error in create-payment:', error);
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