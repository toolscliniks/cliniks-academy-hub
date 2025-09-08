-- Add access_type column to course_enrollments table
ALTER TABLE public.course_enrollments 
ADD COLUMN IF NOT EXISTS access_type TEXT DEFAULT 'individual' CHECK (access_type IN ('individual', 'plan', 'package'));

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_course_enrollments_access_type ON public.course_enrollments(access_type);

-- Update existing enrollments to have 'individual' access type
UPDATE public.course_enrollments 
SET access_type = 'individual' 
WHERE access_type IS NULL;