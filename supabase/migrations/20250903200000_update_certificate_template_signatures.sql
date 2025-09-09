-- Update certificate template to change signatures and add watermark
UPDATE public.certificate_templates 
SET template_html = '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { 
      font-family: Arial, sans-serif; 
      margin: 0; 
      padding: 40px; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
    }
    .certificate { 
      background: white; 
      padding: 60px; 
      border-radius: 20px; 
      box-shadow: 0 20px 40px rgba(0,0,0,0.1); 
      max-width: 800px; 
      margin: 0 auto;
      position: relative;
      overflow: hidden;
    }
    .certificate::before {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 400px;
      height: 400px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns=''http://www.w3.org/2000/svg'' viewBox=''0 0 200 200''%3E%3Cdefs%3E%3ClinearGradient id=''grad'' x1=''0%25'' y1=''0%25'' x2=''100%25'' y2=''100%25''%3E%3Cstop offset=''0%25'' style=''stop-color:%23e91e63;stop-opacity:1'' /%3E%3Cstop offset=''50%25'' style=''stop-color:%239c27b0;stop-opacity:1'' /%3E%3Cstop offset=''100%25'' style=''stop-color:%2300bcd4;stop-opacity:1'' /%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle cx=''50'' cy=''50'' r=''40'' fill=''url(%23grad)'' /%3E%3Cpath d=''M30 50 Q50 20 70 50 Q50 80 30 50'' fill=''white'' /%3E%3Ccircle cx=''150'' cy=''50'' r=''40'' fill=''url(%23grad)'' /%3E%3Cpath d=''M130 50 Q150 20 170 50 Q150 80 130 50'' fill=''white'' /%3E%3Ccircle cx=''100'' cy=''150'' r=''40'' fill=''url(%23grad)'' /%3E%3Cpath d=''M80 150 Q100 120 120 150 Q100 180 80 150'' fill=''white'' /%3E%3Ctext x=''100'' y=''105'' text-anchor=''middle'' font-family=''Arial, sans-serif'' font-size=''24'' font-weight=''bold'' fill=''url(%23grad)''%3Ecliniks%3C/text%3E%3C/svg%3E");
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      opacity: 0.05;
      z-index: 1;
    }
    .certificate-content {
      position: relative;
      z-index: 2;
    }
    .header { text-align: center; margin-bottom: 40px; }
    .title { font-size: 42px; font-weight: bold; color: #333; margin-bottom: 20px; }
    .subtitle { font-size: 18px; color: #666; }
    .recipient { text-align: center; margin: 40px 0; }
    .recipient-name { 
      font-size: 36px; 
      font-weight: bold; 
      color: #667eea; 
      border-bottom: 2px solid #f0f0f0; 
      padding-bottom: 10px; 
      display: inline-block; 
    }
    .course-info { text-align: center; margin: 40px 0; }
    .course-name { font-size: 24px; font-weight: bold; color: #333; }
    .completion-date { font-size: 16px; color: #666; margin-top: 10px; }
    .footer { 
      display: flex; 
      justify-content: space-between; 
      margin-top: 60px; 
      align-items: flex-end;
    }
    .signature { text-align: center; }
    .signature-line { 
      width: 200px; 
      border-top: 1px solid #333; 
      margin: 20px auto 10px; 
    }
    .signature-title {
      font-size: 14px;
      color: #666;
      margin-top: 5px;
    }
    .signature-name {
      font-size: 16px;
      font-weight: bold;
      color: #333;
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="certificate-content">
      <div class="header">
        <div class="title">CERTIFICADO DE CONCLUSÃO</div>
        <div class="subtitle">Cliniks Academy</div>
      </div>
      
      <div class="recipient">
        <div>Certificamos que</div>
        <div class="recipient-name">{{STUDENT_NAME}}</div>
        <div>concluiu com êxito o curso</div>
      </div>
      
      <div class="course-info">
        <div class="course-name">{{COURSE_NAME}}</div>
        <div class="completion-date">Concluído em {{COMPLETION_DATE}}</div>
      </div>
      
      <div class="footer">
        <div class="signature">
          <div class="signature-line"></div>
          <div class="signature-name">{{INSTRUCTOR_NAME}}</div>
          <div class="signature-title">Instrutor</div>
        </div>
        <div class="signature">
          <div class="signature-line"></div>
          <div class="signature-name">{{STUDENT_NAME}}</div>
          <div class="signature-title">Aluno</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>',
    updated_at = now()
WHERE name = 'Default Certificate' AND is_active = true;

-- Also update the function to include certificate ID in the template
CREATE OR REPLACE FUNCTION public.generate_certificate(
  p_user_id UUID,
  p_course_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  certificate_id UUID;
  course_record RECORD;
  user_record RECORD;
  template_record RECORD;
  certificate_html TEXT;
BEGIN
  -- Check if user completed the course
  IF NOT EXISTS (
    SELECT 1 FROM course_enrollments 
    WHERE user_id = p_user_id 
    AND course_id = p_course_id 
    AND completed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'User has not completed this course';
  END IF;
  
  -- Check if certificate already exists
  IF EXISTS (
    SELECT 1 FROM certificates 
    WHERE user_id = p_user_id AND course_id = p_course_id
  ) THEN
    SELECT id INTO certificate_id FROM certificates 
    WHERE user_id = p_user_id AND course_id = p_course_id;
    RETURN certificate_id;
  END IF;
  
  -- Get course and user information
  SELECT * INTO course_record FROM courses WHERE id = p_course_id;
  SELECT * INTO user_record FROM profiles WHERE id = p_user_id;
  SELECT * INTO template_record FROM certificate_templates WHERE is_active = true LIMIT 1;
  
  -- Insert certificate first to get ID
  INSERT INTO certificates (user_id, course_id) 
  VALUES (p_user_id, p_course_id)
  RETURNING id INTO certificate_id;
  
  -- Generate certificate HTML with all replacements including certificate ID
  certificate_html := template_record.template_html;
  certificate_html := REPLACE(certificate_html, '{{STUDENT_NAME}}', COALESCE(user_record.certificate_name, user_record.full_name, 'Estudante'));
  certificate_html := REPLACE(certificate_html, '{{COURSE_NAME}}', course_record.title);
  certificate_html := REPLACE(certificate_html, '{{COMPLETION_DATE}}', TO_CHAR(NOW(), 'DD/MM/YYYY'));
  certificate_html := REPLACE(certificate_html, '{{INSTRUCTOR_NAME}}', COALESCE(course_record.instructor_name, 'Instrutor'));
  certificate_html := REPLACE(certificate_html, '{{CERTIFICATE_ID}}', certificate_id::text);
  
  RETURN certificate_id;
END;
$$;