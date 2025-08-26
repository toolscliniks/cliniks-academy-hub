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

    const { planId, billingType = 'CREDIT_CARD' } = await req.json();

    // Get plan details
    const { data: plan, error: planError } = await supabaseClient
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) throw new Error("Plano não encontrado");

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

    // Create payment/subscription in Asaas
    const paymentData = {
      customer: customerId,
      billingType: billingType,
      value: billingType === 'CREDIT_CARD' ? plan.price_monthly : plan.price_yearly,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      description: `Assinatura ${plan.name} - Cliniks Academy`,
      externalReference: planId,
      cycle: billingType === 'CREDIT_CARD' ? 'MONTHLY' : 'YEARLY',
      callbackUrl: `${req.headers.get("origin")}/payment-callback`,
      successUrl: `${req.headers.get("origin")}/payment-success`,
      cancelUrl: `${req.headers.get("origin")}/payment-canceled`
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

    // Store subscription in Supabase
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { error: subscriptionError } = await supabaseService
      .from("subscriptions")
      .insert({
        user_id: user.id,
        plan_id: planId,
        status: 'pending',
        starts_at: new Date().toISOString(),
        ends_at: billingType === 'CREDIT_CARD' 
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() 
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      });

    if (subscriptionError) {
      console.error('Error creating subscription:', subscriptionError);
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