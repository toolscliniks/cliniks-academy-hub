import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  courseId: string;
  customerName: string;
  customerEmail: string;
  customerCpfCnpj?: string;
  customerPhone?: string;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYMENT-ASAAS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get Asaas API key from secure storage
    const supabaseServiceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    
    const { data: keyData, error: keyError } = await supabaseServiceClient
      .rpc('get_secure_api_key', { p_key_name: 'asaas_api_key' });

    if (keyError) {
      console.error('RPC Error:', keyError);
      throw new Error(`Failed to retrieve Asaas API key: ${keyError.message}`);
    }

    if (!keyData) {
      throw new Error('Asaas API key not found in secure storage');
    }

    const asaasApiKey = keyData;
    if (!asaasApiKey || typeof asaasApiKey !== 'string') {
      throw new Error(`Invalid Asaas API key format: ${typeof asaasApiKey}`);
    }
    
    if (!asaasApiKey.startsWith('$aact_')) {
      throw new Error(`Invalid Asaas API key prefix: ${asaasApiKey.substring(0, 10)}`);
    }
    
    logStep("Secure API key retrieved", { 
      keyLength: asaasApiKey.length, 
      prefix: asaasApiKey.substring(0, 10),
      isValid: asaasApiKey.startsWith('$aact_')
    });

    // Authenticate user (skip for testing)
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
    
    if (!user) {
      logStep("No authentication - using test mode");
    }

    // Parse request body
    const { courseId, customerName, customerEmail, customerCpfCnpj, customerPhone }: PaymentRequest = await req.json();
    
    if (!courseId || !customerName || !customerEmail) {
      throw new Error("Missing required fields: courseId, customerName, customerEmail");
    }
    logStep("Request data validated", { courseId, customerName, customerEmail });

    // Get course information
    const { data: course, error: courseError } = await supabaseClient
      .from('courses')
      .select('id, title, price, currency')
      .eq('id', courseId)
      .eq('is_published', true)
      .single();

    if (courseError || !course) {
      throw new Error("Course not found or not published");
    }

    if (!course.price || course.price <= 0) {
      throw new Error("Course is free, no payment required");
    }
    logStep("Course found", { courseId: course.id, title: course.title, price: course.price });

    // Create or get customer in Asaas
    const customerData = {
      name: customerName,
      email: customerEmail,
      ...(customerCpfCnpj && { cpfCnpj: customerCpfCnpj }),
      ...(customerPhone && { phone: customerPhone })
    };

    // Check if customer already exists
    const existingCustomerResponse = await fetch(`https://www.asaas.com/api/v3/customers?email=${encodeURIComponent(customerEmail)}`, {
      headers: {
        'access_token': asaasApiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'Cliniks-Academy-Hub'
      }
    });

    let customerId;
    if (existingCustomerResponse.ok) {
      const existingCustomerData = await existingCustomerResponse.json();
      if (existingCustomerData.data && existingCustomerData.data.length > 0) {
        customerId = existingCustomerData.data[0].id;
        logStep("Found existing customer", { customerId });
      }
    }

    // Create customer if not exists
    if (!customerId) {
      const createCustomerResponse = await fetch('https://www.asaas.com/api/v3/customers', {
        method: 'POST',
        headers: {
          'access_token': asaasApiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'Cliniks-Academy-Hub'
        },
        body: JSON.stringify(customerData)
      });

      if (!createCustomerResponse.ok) {
        const errorData = await createCustomerResponse.json();
        throw new Error(`Failed to create customer: ${JSON.stringify(errorData)}`);
      }

      const newCustomer = await createCustomerResponse.json();
      customerId = newCustomer.id;
      logStep("Created new customer", { customerId });
    }

    // Create payment in Asaas
    const paymentData = {
      customer: customerId,
      billingType: 'PIX', // Default to PIX, can be changed to support other methods
      value: course.price,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
      description: `Curso: ${course.title}`,
      externalReference: `course_${courseId}_user_${user?.id || 'test_user'}`,
      callback: {
        successUrl: `${Deno.env.get('SITE_URL') || 'https://cliniks-academy-hub.vercel.app'}/payment-success?payment_id={{PAYMENT_ID}}`,
        autoRedirect: false
      },
      // Webhook will be configured globally in Asaas dashboard
      // URL: https://kisnmhcncgiwysbrcdkw.supabase.co/functions/v1/payment-webhook-asaas
    };

    const createPaymentResponse = await fetch('https://www.asaas.com/api/v3/payments', {
      method: 'POST',
      headers: {
        'access_token': asaasApiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'Cliniks-Academy-Hub'
      },
      body: JSON.stringify(paymentData)
    });

    if (!createPaymentResponse.ok) {
      const errorData = await createPaymentResponse.json();
      throw new Error(`Failed to create payment: ${JSON.stringify(errorData)}`);
    }

    const payment = await createPaymentResponse.json();
    logStep("Payment created", { paymentId: payment.id, status: payment.status });

    // Store payment record in Supabase
    const { error: insertError } = await supabaseClient
      .from('invoices')
      .insert({
        user_id: user?.id || 'test_user',
        amount: course.price,
        currency: course.currency || 'BRL',
        status: 'pending',
        payment_method: 'PIX',
        asaas_payment_id: payment.id,
        due_date: paymentData.dueDate
      });

    if (insertError) {
      console.error('Error storing invoice:', insertError);
      // Don't throw error here, payment was created successfully
    }

    // Return payment information
    return new Response(JSON.stringify({
      paymentId: payment.id,
      status: payment.status,
      value: payment.value,
      dueDate: payment.dueDate,
      pixQrCode: payment.encodedImage, // PIX QR Code
      pixCopyPaste: payment.payload, // PIX copy & paste code
      invoiceUrl: payment.invoiceUrl,
      bankSlipUrl: payment.bankSlipUrl
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-payment-asaas", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});