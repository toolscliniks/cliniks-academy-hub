-- Create plan_courses junction table to relate plans with courses
CREATE TABLE public.plan_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(plan_id, course_id)
);

-- Enable RLS
ALTER TABLE public.plan_courses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin can manage plan courses" ON public.plan_courses
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Anyone can view plan courses" ON public.plan_courses
FOR SELECT USING (true);

-- Add payment_mode setting to control direct vs n8n payments
INSERT INTO public.site_settings (setting_key, setting_value) 
VALUES ('payment_mode', '"direct"'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;