import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  // Set CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userData } = await req.json();

    console.log('Register user webhook called:', userData);

    if (!userData || !userData.email) {
      throw new Error('User data with email is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get register webhook URL from site_settings
    const { data: settings, error: settingsError } = await supabase
      .from('site_settings')
      .select('setting_value')
      .eq('setting_key', 'register_webhook_url')
      .single();

    if (settingsError) {
      console.error('Error fetching register webhook URL:', settingsError);
      throw new Error('Register webhook URL not configured');
    }

    const webhookUrl = settings?.setting_value?.replace(/"/g, '');
    if (!webhookUrl) {
      throw new Error('Register webhook URL not configured');
    }

    console.log('Sending registration data to webhook:', webhookUrl);

    // Prepare webhook data
    const webhookData = {
      event_type: 'user_registration',
      webhook_url: webhookUrl,
      data: {
        nome: userData.full_name || userData.name,
        email: userData.email,
        whatsapp: userData.whatsapp || '',
        cpf_cnpj: userData.cpf_cnpj || '',
        source: 'cliniks academy',
        registration_date: new Date().toISOString()
      },
      metadata: {
        user_id: userData.id,
        timestamp: new Date().toISOString(),
        source: 'cliniks-academy-registration'
      }
    };

    // Send data to n8n webhook via n8n-webhook-handler function
    const { data: webhookResult, error: webhookError } = await supabase.functions.invoke('n8n-webhook-handler', {
      body: webhookData
    });

    if (webhookError) {
      console.error('Webhook error:', webhookError);
      throw new Error(`Webhook failed: ${webhookError.message}`);
    }

    console.log('Registration webhook sent successfully:', webhookResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Dados de cadastro enviados para o webhook com sucesso',
        webhook_result: webhookResult
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Register user webhook error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});