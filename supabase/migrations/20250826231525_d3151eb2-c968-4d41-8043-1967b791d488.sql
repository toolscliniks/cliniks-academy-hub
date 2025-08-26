-- Fix security issue: Restrict site_settings access to admin only
DROP POLICY IF EXISTS "Anyone can view site settings" ON public.site_settings;

CREATE POLICY "Admin can view site settings" 
ON public.site_settings 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
));

-- Create performance monitoring table
CREATE TABLE IF NOT EXISTS public.performance_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  page_path TEXT NOT NULL,
  load_time_ms INTEGER NOT NULL,
  performance_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on performance_logs
ALTER TABLE public.performance_logs ENABLE ROW LEVEL SECURITY;

-- Performance logs policies
CREATE POLICY "Admin can view all performance logs" 
ON public.performance_logs 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
));

CREATE POLICY "Users can log their own performance data" 
ON public.performance_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Create error logs table for debugging
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  error_message TEXT NOT NULL,
  error_stack TEXT,
  page_path TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on error_logs
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Error logs policies
CREATE POLICY "Admin can view all error logs" 
ON public.error_logs 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
));

CREATE POLICY "Users can log their own errors" 
ON public.error_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Create test results table
CREATE TABLE IF NOT EXISTS public.test_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_suite TEXT NOT NULL,
  test_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'skipped')),
  execution_time_ms INTEGER,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on test_results
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- Test results policies (admin only)
CREATE POLICY "Admin can manage test results" 
ON public.test_results 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_performance_logs_user_id ON public.performance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_logs_created_at ON public.performance_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON public.error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_test_results_suite ON public.test_results(test_suite);
CREATE INDEX IF NOT EXISTS idx_test_results_status ON public.test_results(status);