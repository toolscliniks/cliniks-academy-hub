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
    if (!user) throw new Error("User not authenticated");

    const { courseId, customName } = await req.json();

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Call the generate_certificate function
    const { data: certificateId, error } = await supabaseService
      .rpc('generate_certificate', {
        p_user_id: user.id,
        p_course_id: courseId
      });

    if (error) throw error;

    // Get certificate with course and user details
    const { data: certificate, error: certError } = await supabaseService
      .from('certificates')
      .select(`
        *,
        courses!inner(title, instructor_name),
        profiles!inner(full_name)
      `)
      .eq('id', certificateId)
      .single();

    if (certError) throw certError;

    // Get certificate template
    const { data: template, error: templateError } = await supabaseService
      .from('certificate_templates')
      .select('template_html')
      .eq('is_active', true)
      .single();

    if (templateError) throw templateError;

    // Generate certificate HTML
    let certificateHtml = template.template_html;
    const studentName = customName || certificate.profiles.full_name || 'Estudante';
    certificateHtml = certificateHtml.replace(/{{STUDENT_NAME}}/g, studentName);
    certificateHtml = certificateHtml.replace(/{{COURSE_NAME}}/g, certificate.courses.title);
    certificateHtml = certificateHtml.replace(/{{COMPLETION_DATE}}/g, new Date(certificate.issued_at).toLocaleDateString('pt-BR'));
    certificateHtml = certificateHtml.replace(/{{INSTRUCTOR_NAME}}/g, certificate.courses.instructor_name || 'Instrutor');
    certificateHtml = certificateHtml.replace(/{{CERTIFICATE_ID}}/g, certificateId);

    return new Response(JSON.stringify({ 
      certificateId,
      certificateHtml,
      downloadUrl: `${req.headers.get("origin")}/certificate/${certificateId}`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Certificate generation error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});