import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CertificateRequest {
  courseId: string;
  userId?: string;
  customName?: string;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-CERTIFICATE-PDF] ${step}${detailsStr}`);
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

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    let userId: string;
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
      if (userError) throw new Error(`Authentication error: ${userError.message}`);
      
      if (!userData.user?.id) {
        throw new Error("User not authenticated");
      }
      userId = userData.user.id;
    } else {
      throw new Error("No authorization header provided");
    }

    logStep("User authenticated", { userId });

    // Parse request body
    const { courseId, customName }: CertificateRequest = await req.json();
    
    if (!courseId) {
      throw new Error("Missing required field: courseId");
    }

    // Verify course completion
    const { data: enrollment, error: enrollmentError } = await supabaseClient
      .from('course_enrollments')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .single();

    if (enrollmentError || !enrollment) {
      throw new Error("User is not enrolled in this course");
    }

    if (!enrollment.completed_at) {
      throw new Error("Course not completed yet");
    }

    logStep("Course completion verified", { enrollmentId: enrollment.id, completedAt: enrollment.completed_at });

    // Check if certificate already exists
    const { data: existingCertificate } = await supabaseClient
      .from('certificates')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (existingCertificate) {
      logStep("Certificate already exists", { certificateId: existingCertificate.id });
      return new Response(JSON.stringify({
        certificateId: existingCertificate.id,
        certificateUrl: existingCertificate.certificate_url,
        issuedAt: existingCertificate.issued_at
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Get user and course information
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error("User profile not found");
    }

    const { data: course, error: courseError } = await supabaseClient
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      throw new Error("Course not found");
    }

    logStep("User and course data retrieved", { 
      userName: profile.full_name, 
      courseTitle: course.title,
      instructor: course.instructor_name
    });

    // Get active certificate template
    const { data: template, error: templateError } = await supabaseClient
      .from('certificate_templates')
      .select('template_html')
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      throw new Error("Active certificate template not found");
    }

    logStep("Active template retrieved", { templateFound: !!template });

    // Generate certificate HTML using active template
    const certificateDate = new Date().toLocaleDateString('pt-BR');
    const studentName = customName || profile.full_name || profile.email?.split('@')[0] || 'Estudante';
    
    logStep("Certificate name determined", { 
      customName, 
      profileName: profile.full_name, 
      finalName: studentName 
    });
    
    // Replace template variables with more robust regex that handles spaces
    let certificateHTML = template.template_html;
    certificateHTML = certificateHTML.replace(/{{\s*STUDENT_NAME\s*}}/g, studentName);
    certificateHTML = certificateHTML.replace(/{{\s*COURSE_NAME\s*}}/g, course.title);
    certificateHTML = certificateHTML.replace(/{{\s*COMPLETION_DATE\s*}}/g, certificateDate);
    certificateHTML = certificateHTML.replace(/{{\s*INSTRUCTOR_NAME\s*}}/g, course.instructor_name || 'Cliniks Academy');
    
    // Generate certificate ID for template
    const certificateId = crypto.randomUUID();
    certificateHTML = certificateHTML.replace(/{{\s*CERTIFICATE_ID\s*}}/g, certificateId);
    
    logStep("Template variables replaced", { 
      originalLength: template.template_html.length,
      finalLength: certificateHTML.length,
      studentName,
      courseTitle: course.title,
      certificateDate,
      instructorName: course.instructor_name || 'Cliniks Academy'
    });

    // For now, we'll generate a simple certificate URL
    // In production, you would use a PDF generation library
    
    // Store certificate in database
    const { data: certificate, error: certificateError } = await supabaseClient
      .from('certificates')
      .insert({
        id: certificateId,
        user_id: userId,
        course_id: courseId,
        certificate_url: `data:text/html;base64,${btoa(certificateHTML)}`,
        issued_at: new Date().toISOString()
      })
      .select()
      .single();

    if (certificateError) {
      throw new Error(`Failed to create certificate: ${certificateError.message}`);
    }

    logStep("Certificate created successfully", { certificateId: certificate.id });

    return new Response(JSON.stringify({
      certificateId: certificate.id,
      certificateUrl: certificate.certificate_url,
      issuedAt: certificate.issued_at,
      studentName,
      courseTitle: course.title,
      completionDate: certificateDate
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in generate-certificate-pdf", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});