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
    console.log('=== CREATE PAYMENT FUNCTION START ===');

    // Create Supabase client that forwards the caller's auth so RLS policies run as the user
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: authHeader ? { Authorization: authHeader } : {},
        },
      }
    );

    const requestBody = await req.json();
    console.log('Request body received:', JSON.stringify(requestBody, null, 2));
    console.log('Checking for _testUser:', !!requestBody._testUser);
    
    let user;
    
    // Verificar se há dados de usuário de teste
    if (requestBody._testUser) {
      console.log('Using test user data:', requestBody._testUser);
      user = requestBody._testUser;
    } else {
      // Get authenticated user
      console.log('Getting authenticated user...');
      
      if (!authHeader) {
        console.error('Missing authorization header');
        return new Response(JSON.stringify({ 
          error: 'Missing authorization header',
          message: 'Para testes, inclua _testUser no corpo da requisição',
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        });
      }
      
      try {
        const token = authHeader.replace("Bearer ", "");
        const { data } = await supabaseClient.auth.getUser(token);
        user = data.user;
        
        if (!user) {
          console.error('User not found or invalid token');
          return new Response(JSON.stringify({ 
            error: 'User not authenticated',
            message: 'Token inválido ou usuário não encontrado',
            timestamp: new Date().toISOString()
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 401,
          });
        }
      } catch (authError) {
        console.error('Authentication error:', authError);
        return new Response(JSON.stringify({ 
          error: 'Authentication failed',
          message: 'Falha na autenticação: ' + authError.message,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        });
      }
    }

    console.log('User authenticated:', user.id, user.email);
    console.log('User found:', { id: user.id, email: user.email });
    
    // Get user profile with CPF/CNPJ
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('full_name, whatsapp, cpf_cnpj')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('Error fetching user profile:', profileError);
    }
    
    console.log('User profile:', userProfile);
    
    const { planId, courseId, packageId, billingType = 'CREDIT_CARD' } = requestBody;

    // Check payment mode
    const { data: paymentModeSetting } = await supabaseClient
      .from('site_settings')
      .select('setting_value')
      .eq('setting_key', 'payment_mode')
      .single();

    const paymentMode = paymentModeSetting?.setting_value || 'direct';

    // If n8n mode, send webhook instead of direct payment
    if (paymentMode === 'n8n') {
      const { data: n8nSetting } = await supabaseClient
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'n8n_webhook_url')
        .single();

      const n8nUrl = n8nSetting?.setting_value;
      if (n8nUrl) {
        const webhookData = {
          user_id: user.id,
          user_email: user.email,
          user_name: user.user_metadata?.full_name || user.email.split('@')[0],
          plan_id: planId,
          course_id: courseId,
          package_id: packageId,
          billing_type: billingType,
          timestamp: new Date().toISOString()
        };

        const webhookResponse = await fetch(n8nUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookData)
        });

        return new Response(JSON.stringify({
          success: true,
          message: 'Pagamento enviado para processamento via n8n',
          webhook_sent: true
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // Get plan, course or package details
    let itemData, itemType, itemPrice, itemName;
    
    if (planId) {
      console.log('Searching for plan with ID:', planId);
      const { data: plan, error: planError } = await supabaseClient
        .from('plans')
        .select('*')
        .eq('id', planId)
        .single();

      console.log('Plan query result:', { plan, planError });
      if (planError || !plan) throw new Error("Plano não encontrado");
      itemData = plan;
      itemType = 'plan';
      itemPrice = billingType === 'PIX' || billingType === 'BOLETO' ? plan.price_yearly : plan.price_monthly;
      itemName = `Plano ${plan.name}`;
      console.log('Plan details:', { itemName, itemPrice, billingType });
    } else if (packageId) {
      const { data: package_data, error: packageError } = await supabaseClient
        .from('course_packages')
        .select('*')
        .eq('id', packageId)
        .single();

      if (packageError || !package_data) throw new Error("Pacote não encontrado");
      itemData = package_data;
      itemType = 'package';
      itemPrice = package_data.sale_price || 0;
      itemName = `Pacote ${package_data.name}`;
    } else if (courseId) {
      const { data: course, error: courseError } = await supabaseClient
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (courseError || !course) throw new Error("Curso não encontrado");
      itemData = course;
      itemType = 'course';
      itemPrice = course.price || 0;
      itemName = `Curso ${course.title}`;
    } else {
      throw new Error("planId, packageId ou courseId deve ser fornecido");
    }

    // Get Asaas API configuration from database using RPC function
    console.log('Getting Asaas API key using RPC function...');
    
    const { data: asaasApiKey, error: keyError } = await supabaseClient
      .rpc('get_secure_api_key', { key_name: 'asaas_api_key' });

    const { data: asaasEnvSetting, error: envError } = await supabaseClient
      .from('site_settings')
      .select('setting_value')
      .eq('setting_key', 'asaas_environment')
      .single();

    console.log('Asaas key from RPC:', !!asaasApiKey, 'Error:', keyError);
    console.log('Asaas env setting:', asaasEnvSetting, 'Error:', envError);
    
    if (keyError) {
      console.error('Failed to get Asaas API key from RPC:', keyError);
      throw new Error('Erro ao buscar chave da API do Asaas: ' + keyError.message);
    }

    // Try to get API key from environment variable first, then fallback to RPC result
    let ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY") || asaasApiKey;
    const ASAAS_ENVIRONMENT = Deno.env.get("ASAAS_ENVIRONMENT") || asaasEnvSetting?.setting_value || 'sandbox';
    
    console.log('Using ASAAS_API_KEY from:', Deno.env.get("ASAAS_API_KEY") ? 'environment variable' : 'database');
    console.log('Using ASAAS_ENVIRONMENT from:', Deno.env.get("ASAAS_ENVIRONMENT") ? 'environment variable' : 'database');
    const ASAAS_BASE_URL = ASAAS_ENVIRONMENT === 'production' 
      ? "https://www.asaas.com/api/v3" 
      : "https://sandbox.asaas.com/api/v3";

    console.log('Raw API Key from DB:', ASAAS_API_KEY);
    console.log('API Key type:', typeof ASAAS_API_KEY);
    console.log('API Key length:', ASAAS_API_KEY?.length);

    if (!ASAAS_API_KEY) {
      console.error('ASAAS_API_KEY is null, undefined, or empty');
      throw new Error('Chave da API do Asaas não configurada');
    }

    // Handle API key format - production keys with $aact_prod_000 should be used as-is
    if (ASAAS_API_KEY && ASAAS_API_KEY.startsWith('$aact_')) {
      if (ASAAS_API_KEY.startsWith('$aact_prod_000')) {
        console.log('Using production key format - no decoding needed');
        console.log('Production key format:', ASAAS_API_KEY.substring(0, 20) + '...');
        // Use the key as-is for production format
      } else {
        // Decode other formats
        try {
          console.log('Decoding Asaas API key...');
          const base64Part = ASAAS_API_KEY.substring(6); // Remove $aact_ prefix
          console.log('Using standard key format with $aact_ prefix');
          console.log('Base64 part length:', base64Part.length);
          
          // Decode the base64 string directly
          const decodedString = atob(base64Part);
          console.log('Decoded string:', decodedString.substring(0, 50) + '...');
          
          // Extract the actual API key from the decoded string
          // The format is usually: api_key::other_data::more_data
          const parts = decodedString.split('::');
          if (parts.length > 0) {
            ASAAS_API_KEY = parts[0]; // Use the first part as the API key
            console.log('Extracted API key from decoded string:', ASAAS_API_KEY.substring(0, 20) + '...');
          } else {
            ASAAS_API_KEY = decodedString; // Use the whole decoded string if no separator found
          }
          
          console.log('Decoded Asaas API key successfully');
          console.log('Final key format:', ASAAS_API_KEY.substring(0, 20) + '...');
        } catch (e) {
          console.error('Failed to decode API key:', e);
          console.error('Error details:', e.message);
          // If decoding fails, try using the key as-is (maybe it's not base64 encoded)
          console.log('Trying to use key as-is without decoding');
          ASAAS_API_KEY = ASAAS_API_KEY.substring(6); // Just remove the prefix
        }
      }
    }

    console.log('Using Asaas environment:', ASAAS_ENVIRONMENT);
    console.log('Final API Key configured:', !!ASAAS_API_KEY);
    console.log('Final API Key format:', ASAAS_API_KEY?.substring(0, 10) + '...');

    // Check if customer exists in Asaas
    let customerId = null;
    console.log('Checking customer with URL:', `${ASAAS_BASE_URL}/customers?email=${user.email}`);
    
    const customerResponse = await fetch(`${ASAAS_BASE_URL}/customers?email=${user.email}`, {
      headers: {
        "access_token": ASAAS_API_KEY!,
        "Content-Type": "application/json"
      }
    });

    console.log('Customer response status:', customerResponse.status);
    const customerResponseText = await customerResponse.text();
    console.log('Customer response body:', customerResponseText);

    if (!customerResponse.ok || customerResponse.status >= 400) {
      console.error('Error checking customer - Status:', customerResponse.status);
      console.error('Error checking customer - Body:', customerResponseText);
      
      let errorMessage = 'Erro na API do Asaas';
      try {
        const errorData = JSON.parse(customerResponseText);
        if (errorData.errors && errorData.errors.length > 0) {
          errorMessage = errorData.errors[0].description || errorData.errors[0].code;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        console.error('Failed to parse error response:', e);
      }
      
      throw new Error(errorMessage);
    }

    const customerData = JSON.parse(customerResponseText);
    
    if (customerData.data && customerData.data.length > 0) {
      customerId = customerData.data[0].id;
    } else {
      // Create new customer in Asaas
      const createCustomerResponse = await fetch(`${ASAAS_BASE_URL}/customers`, {
        method: "POST",
        headers: {
          "access_token": ASAAS_API_KEY!,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: userProfile?.full_name || user.user_metadata?.full_name || user.email.split('@')[0],
          email: user.email,
          mobilePhone: userProfile?.whatsapp?.replace(/\D/g, '') || user.user_metadata?.phone || "",
          cpfCnpj: userProfile?.cpf_cnpj?.replace(/\D/g, '') || user.user_metadata?.cpf || "",
          address: user.user_metadata?.address || "",
          addressNumber: user.user_metadata?.address_number || "",
          complement: user.user_metadata?.complement || "",
          province: user.user_metadata?.neighborhood || "",
          city: user.user_metadata?.city || "",
          state: user.user_metadata?.state || "",
          postalCode: user.user_metadata?.postal_code || ""
        })
      });

      console.log('Create customer response status:', createCustomerResponse.status);
      console.log('Create customer response headers:', Object.fromEntries(createCustomerResponse.headers.entries()));
      
      const createCustomerResponseText = await createCustomerResponse.text();
      console.log('Create customer response body:', createCustomerResponseText);
      
      let newCustomer;
      try {
        newCustomer = JSON.parse(createCustomerResponseText);
      } catch (e) {
        console.error('Failed to parse create customer response as JSON:', e);
        throw new Error('Resposta inválida da API do Asaas: ' + createCustomerResponseText);
      }
      
      if (!createCustomerResponse.ok || newCustomer.errors) {
        console.error('Error creating customer - Status:', createCustomerResponse.status);
        console.error('Error creating customer - Response:', newCustomer);
        
        let errorMessage = 'Erro ao criar cliente no Asaas';
        if (newCustomer.errors && newCustomer.errors.length > 0) {
          errorMessage = newCustomer.errors[0].description || newCustomer.errors[0].code || errorMessage;
          console.error('Specific error from Asaas:', newCustomer.errors[0]);
        }
        
        throw new Error(errorMessage);
      }
      
      customerId = newCustomer.id;
    }

    let paymentResult: any;
    
    if (itemType === 'plan') {
      // Create subscription in Asaas for plans
      const subscriptionData = {
        customer: customerId,
        billingType: billingType,
        value: itemPrice,
        nextDueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        cycle: billingType === 'PIX' || billingType === 'BOLETO' ? 'YEARLY' : 'MONTHLY',
        description: `${itemName} - Cliniks Academy`,
        externalReference: `plan_${planId}_user_${user.id}`
      };

      console.log('Creating subscription with data:', subscriptionData);

      const subscriptionResponse = await fetch(`${ASAAS_BASE_URL}/subscriptions`, {
        method: "POST",
        headers: {
          "access_token": ASAAS_API_KEY!,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(subscriptionData)
      });

      paymentResult = await subscriptionResponse.json();
      console.log('Asaas subscription response:', paymentResult);

      if (!subscriptionResponse.ok) {
        throw new Error(paymentResult.errors?.[0]?.description || "Erro ao criar assinatura");
      }
    } else {
      // Create single payment for courses and packages
      const paymentData = {
        customer: customerId,
        billingType: billingType,
        value: itemPrice,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        description: `${itemName} - Cliniks Academy`,
        externalReference: itemType === 'course' ? `course_${courseId}_user_${user.id}` : 
                          `package_${packageId}_user_${user.id}`
      };

      console.log('Creating payment with data:', paymentData);

      const paymentResponse = await fetch(`${ASAAS_BASE_URL}/payments`, {
        method: "POST",
        headers: {
          "access_token": ASAAS_API_KEY!,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(paymentData)
      });

      paymentResult = await paymentResponse.json();
      console.log('Asaas payment response:', paymentResult);

      if (!paymentResponse.ok) {
        throw new Error(paymentResult.errors?.[0]?.description || "Erro ao criar pagamento");
      }
    }

    // Store subscription or enrollment in Supabase

    if (itemType === 'plan') {
      const { error: subscriptionError } = await supabaseClient
        .from("subscriptions")
        .insert({
          user_id: user.id,
          plan_id: planId,
          status: 'pending',
          asaas_subscription_id: paymentResult.id,
          billing_cycle: billingType === 'PIX' || billingType === 'BOLETO' ? 'yearly' : 'monthly',
          starts_at: new Date().toISOString(),
          ends_at: billingType === 'PIX' || billingType === 'BOLETO'
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });

      if (subscriptionError) {
        console.error('Error creating subscription:', subscriptionError);
      }
    } else {
      // For individual course or package purchase, create invoice record
      const { error: invoiceError } = await supabaseClient
        .from("invoices")
        .insert({
          user_id: user.id,
          amount: itemPrice,
          status: 'pending',
          asaas_payment_id: paymentResult.id,
          invoice_type: itemType === 'course' ? 'course' : 'package',
          payment_method: billingType
        });

      if (invoiceError) {
        console.error('Error creating invoice:', invoiceError);
      }
    }

    // Return appropriate response based on payment method
    const response: any = {
      paymentId: paymentResult.id,
      status: paymentResult.status
    };

    if (billingType === 'PIX') {
      response.pixQrCode = paymentResult.encodedImage;
      response.pixCopyPaste = paymentResult.payload;
      response.invoiceUrl = paymentResult.invoiceUrl;
    } else if (billingType === 'BOLETO') {
      response.bankSlipUrl = paymentResult.bankSlipUrl;
      response.invoiceUrl = paymentResult.invoiceUrl;
    } else {
      // Credit/Debit card
      response.invoiceUrl = paymentResult.invoiceUrl;
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('=== PAYMENT CREATION ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error object:', error);
    
    // Retornar informações detalhadas do erro para debug
    const errorInfo = {
      error: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause,
      timestamp: new Date().toISOString(),
      // Adicionar informações do contexto se disponível
      context: {
        hasAuthHeader: !!req.headers.get('Authorization'),
        method: req.method,
        url: req.url
      }
    };
    
    return new Response(JSON.stringify(errorInfo), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});