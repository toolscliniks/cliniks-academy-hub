-- Create certificates generation system
CREATE TABLE public.certificate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  background_image_url TEXT,
  template_html TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Enable RLS on certificate templates
ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;

-- Admin can manage certificate templates
CREATE POLICY "Admin can manage certificate templates" ON public.certificate_templates
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Anyone can view active templates
CREATE POLICY "Anyone can view active templates" ON public.certificate_templates
FOR SELECT USING (is_active = true);

-- Create invoices table for payment management
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  asaas_payment_id TEXT,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Users can view their own invoices
CREATE POLICY "Users can view their own invoices" ON public.invoices
FOR SELECT USING (auth.uid() = user_id);

-- Admin can manage all invoices
CREATE POLICY "Admin can manage invoices" ON public.invoices
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Create user sessions table for online monitoring
CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_start TIMESTAMPTZ DEFAULT now(),
  session_end TIMESTAMPTZ,
  last_activity TIMESTAMPTZ DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Enable RLS on user sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view their own sessions" ON public.user_sessions
FOR SELECT USING (auth.uid() = user_id);

-- Admin can view all sessions
CREATE POLICY "Admin can view all sessions" ON public.user_sessions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Create user activity log
CREATE TABLE public.user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_description TEXT,
  course_id UUID REFERENCES public.courses(id),
  lesson_id UUID REFERENCES public.lessons(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on activity log
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

-- Users can insert their own activity
CREATE POLICY "Users can log their own activity" ON public.user_activity_log
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin can view all activity
CREATE POLICY "Admin can view all activity" ON public.user_activity_log
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Create webhook configuration table
CREATE TABLE public.webhook_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  event_types TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT true,
  secret_key TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on webhook configs
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;

-- Only admin can manage webhooks
CREATE POLICY "Admin can manage webhooks" ON public.webhook_configs
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Create site settings table for admin customization
CREATE TABLE public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on site settings
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Only admin can manage site settings
CREATE POLICY "Admin can manage site settings" ON public.site_settings
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Anyone can view site settings (for public display)
CREATE POLICY "Anyone can view site settings" ON public.site_settings
FOR SELECT USING (true);

-- Insert default certificate template
INSERT INTO public.certificate_templates (name, template_html, is_active) VALUES 
('Default Certificate', 
'<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .certificate { background: white; padding: 60px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); max-width: 800px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 40px; }
    .title { font-size: 42px; font-weight: bold; color: #333; margin-bottom: 20px; }
    .subtitle { font-size: 18px; color: #666; }
    .recipient { text-align: center; margin: 40px 0; }
    .recipient-name { font-size: 36px; font-weight: bold; color: #667eea; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; display: inline-block; }
    .course-info { text-align: center; margin: 40px 0; }
    .course-name { font-size: 24px; font-weight: bold; color: #333; }
    .completion-date { font-size: 16px; color: #666; margin-top: 10px; }
    .footer { display: flex; justify-content: space-between; margin-top: 60px; }
    .signature { text-align: center; }
    .signature-line { width: 200px; border-top: 1px solid #333; margin: 20px auto 10px; }
  </style>
</head>
<body>
  <div class="certificate">
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
        <div>{{INSTRUCTOR_NAME}}</div>
        <div>Instrutor</div>
      </div>
      <div class="signature">
        <div class="signature-line"></div>
        <div>Cliniks Academy</div>
        <div>Plataforma de Ensino</div>
      </div>
    </div>
  </div>
</body>
</html>', 
true);

-- Insert default site settings
INSERT INTO public.site_settings (setting_key, setting_value) VALUES 
('homepage_hero_title', '"Cliniks Academy"'),
('homepage_hero_subtitle', '"Transforme sua carreira com cursos online de alta qualidade"'),
('homepage_stats', '{"courses": 500, "students": 10000, "satisfaction": 95}'),
('payment_mode', '"direct"'),
('n8n_webhook_url', '""'),
('certificate_enabled', 'true');

-- Create function to generate certificates
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
  
  -- Generate certificate HTML
  certificate_html := template_record.template_html;
  certificate_html := REPLACE(certificate_html, '{{STUDENT_NAME}}', COALESCE(user_record.full_name, 'Estudante'));
  certificate_html := REPLACE(certificate_html, '{{COURSE_NAME}}', course_record.title);
  certificate_html := REPLACE(certificate_html, '{{COMPLETION_DATE}}', TO_CHAR(NOW(), 'DD/MM/YYYY'));
  certificate_html := REPLACE(certificate_html, '{{INSTRUCTOR_NAME}}', COALESCE(course_record.instructor_name, 'Instrutor'));
  
  -- Insert certificate
  INSERT INTO certificates (user_id, course_id) 
  VALUES (p_user_id, p_course_id)
  RETURNING id INTO certificate_id;
  
  RETURN certificate_id;
END;
$$;