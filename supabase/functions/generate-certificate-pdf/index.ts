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

    // Generate certificate HTML
    const certificateDate = new Date().toLocaleDateString('pt-BR');
    const studentName = customName || profile.full_name || profile.email?.split('@')[0] || 'Estudante';
    
    logStep("Certificate name determined", { 
      customName, 
      profileName: profile.full_name, 
      finalName: studentName 
    });
    
    const certificateHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Certificado - ${course.title}</title>
        <style>
            @page {
                margin: 0;
                size: A4 landscape;
            }
            body {
                font-family: 'Georgia', serif;
                margin: 0;
                padding: 40px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: #333;
                height: 100vh;
                box-sizing: border-box;
            }
            .certificate {
                background: white;
                padding: 60px;
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                text-align: center;
                height: calc(100vh - 80px);
                display: flex;
                flex-direction: column;
                justify-content: center;
                position: relative;
                border: 8px solid #f8f9fa;
            }
            .certificate::before {
                content: '';
                position: absolute;
                top: 20px;
                left: 20px;
                right: 20px;
                bottom: 20px;
                border: 3px solid #667eea;
                border-radius: 15px;
            }
            .header {
                margin-bottom: 30px;
            }
            .title {
                font-size: 48px;
                font-weight: bold;
                color: #667eea;
                margin-bottom: 20px;
                text-transform: uppercase;
                letter-spacing: 3px;
            }
            .subtitle {
                font-size: 18px;
                color: #666;
                margin-bottom: 40px;
            }
            .student-name {
                font-size: 36px;
                font-weight: bold;
                color: #333;
                margin: 30px 0;
                text-decoration: underline;
                text-decoration-color: #667eea;
            }
            .course-info {
                font-size: 20px;
                color: #555;
                margin: 30px 0;
                line-height: 1.6;
            }
            .course-title {
                font-weight: bold;
                color: #667eea;
                font-size: 24px;
            }
            .completion-info {
                margin-top: 40px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .date {
                font-size: 16px;
                color: #666;
            }
            .instructor {
                text-align: center;
            }
            .instructor-name {
                font-weight: bold;
                border-top: 2px solid #333;
                padding-top: 10px;
                margin-top: 20px;
            }
            .logo {
                position: absolute;
                top: 40px;
                left: 60px;
                font-size: 24px;
                font-weight: bold;
                color: #667eea;
            }
            .seal {
                position: absolute;
                bottom: 40px;
                right: 60px;
                width: 80px;
                height: 80px;
                border: 4px solid #667eea;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                background: white;
                font-weight: bold;
                font-size: 12px;
                color: #667eea;
            }
        </style>
    </head>
    <body>
        <div class="certificate">
            <div class="logo">Cliniks Academy</div>
            
            <div class="header">
                <div class="title">Certificado</div>
                <div class="subtitle">de conclusão de curso</div>
            </div>
            
            <div>
                <p>Certificamos que</p>
                <div class="student-name">${studentName}</div>
                <p>concluiu com êxito o curso</p>
                <div class="course-title">${course.title}</div>
            </div>
            
            <div class="course-info">
                <p>Curso ministrado por <strong>${course.instructor_name || 'Cliniks Academy'}</strong></p>
                <p>com carga horária de <strong>${course.duration_hours} horas</strong></p>
            </div>
            
            <div class="completion-info">
                <div class="date">
                    <p>Data de conclusão:</p>
                    <strong>${certificateDate}</strong>
                </div>
                <div class="instructor">
                    <div style="width: 200px;">
                        <div class="instructor-name">${course.instructor_name || 'Cliniks Academy'}</div>
                        <div style="font-size: 14px; color: #666;">Instrutor</div>
                    </div>
                </div>
            </div>
            
            <div class="seal">
                VÁLIDO
            </div>
        </div>
    </body>
    </html>`;

    // For now, we'll generate a simple certificate URL
    // In production, you would use a PDF generation library
    const certificateId = crypto.randomUUID();
    
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