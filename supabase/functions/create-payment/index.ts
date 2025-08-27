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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    const { planId, courseId, billingType = 'CREDIT_CARD' } = await req.json();

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

    // Get plan or course details
    let itemData, itemType, itemPrice, itemName;
    
    if (planId) {
      const { data: plan, error: planError } = await supabaseClient
        .from('plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError || !plan) throw new Error("Plano não encontrado");
      itemData = plan;
      itemType = 'plan';
      itemPrice = billingType === 'PIX' || billingType === 'BOLETO' ? plan.price_yearly : plan.price_monthly;
      itemName = `Plano ${plan.name}`;
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
      throw new Error("planId ou courseId deve ser fornecido");
    }

    // Asaas API configuration
    const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");
    const ASAAS_BASE_URL = "https://www.asaas.com/api/v3";

    // Check if customer exists in Asaas
    let customerId = null;
    const customerResponse = await fetch(`${ASAAS_BASE_URL}/customers?email=${user.email}`, {
      headers: {
        "access_token": ASAAS_API_KEY!,
        "Content-Type": "application/json"
      }
    });

    const customerData = await customerResponse.json();
    
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
          name: user.user_metadata?.full_name || user.email.split('@')[0],
          email: user.email,
          mobilePhone: user.user_metadata?.phone || "",
          cpfCnpj: user.user_metadata?.cpf || "",
          address: user.user_metadata?.address || "",
          addressNumber: user.user_metadata?.address_number || "",
          complement: user.user_metadata?.complement || "",
          province: user.user_metadata?.neighborhood || "",
          city: user.user_metadata?.city || "",
          state: user.user_metadata?.state || "",
          postalCode: user.user_metadata?.postal_code || ""
        })
      });

      const newCustomer = await createCustomerResponse.json();
      customerId = newCustomer.id;
    }

    // Create payment in Asaas
    const paymentData = {
      customer: customerId,
      billingType: billingType,
      value: itemPrice,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: `${itemName} - Cliniks Academy`,
      externalReference: planId || courseId
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

    const paymentResult = await paymentResponse.json();
    console.log('Asaas payment response:', paymentResult);

    if (!paymentResponse.ok) {
      throw new Error(paymentResult.errors?.[0]?.description || "Erro ao criar pagamento");
    }

    // Store subscription or enrollment in Supabase
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    if (itemType === 'plan') {
      const { error: subscriptionError } = await supabaseService
        .from("subscriptions")
        .insert({
          user_id: user.id,
          plan_id: planId,
          status: 'pending',
          starts_at: new Date().toISOString(),
          ends_at: billingType === 'PIX' || billingType === 'BOLETO'
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });

      if (subscriptionError) {
        console.error('Error creating subscription:', subscriptionError);
      }
    } else {
      // For individual course purchase, create invoice record
      const { error: invoiceError } = await supabaseService
        .from("invoices")
        .insert({
          user_id: user.id,
          amount: itemPrice,
          status: 'pending',
          asaas_payment_id: paymentResult.id,
          invoice_type: 'course',
          payment_method: billingType
        });

      if (invoiceError) {
        console.error('Error creating invoice:', invoiceError);
      }
    }

    return new Response(JSON.stringify({ 
      paymentId: paymentResult.id,
      invoiceUrl: paymentResult.invoiceUrl,
      bankSlipUrl: paymentResult.bankSlipUrl,
      pixQrCode: paymentResult.pixQrCode,
      status: paymentResult.status
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Payment creation error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});