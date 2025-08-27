-- Create course_enrollments table for user course access
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  progress DECIMAL(5,2) DEFAULT 0.00,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate enrollments
  UNIQUE(user_id, course_id)
);

-- Enable RLS
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

-- Users can view their own enrollments
CREATE POLICY "Users can view their own enrollments" ON public.course_enrollments
FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own enrollments
CREATE POLICY "Users can insert their own enrollments" ON public.course_enrollments
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own enrollments
CREATE POLICY "Users can update their own enrollments" ON public.course_enrollments
FOR UPDATE USING (auth.uid() = user_id);

-- Create lesson_progress table for tracking individual lesson completion
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT FALSE,
  watch_time_seconds INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate progress entries
  UNIQUE(user_id, lesson_id)
);

-- Enable RLS for lesson progress
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- Users can view their own lesson progress
CREATE POLICY "Users can view their own lesson progress" ON public.lesson_progress
FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own lesson progress
CREATE POLICY "Users can insert their own lesson progress" ON public.lesson_progress
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own lesson progress
CREATE POLICY "Users can update their own lesson progress" ON public.lesson_progress
FOR UPDATE USING (auth.uid() = user_id);

-- Create trigger for updating enrollment progress based on lesson completion
CREATE OR REPLACE FUNCTION update_course_progress()
RETURNS TRIGGER AS $$
DECLARE
    total_lessons INTEGER;
    completed_lessons INTEGER;
    enrollment_progress DECIMAL;
BEGIN
    -- Get total lessons for the course
    SELECT COUNT(*) INTO total_lessons
    FROM lessons l
    INNER JOIN modules m ON l.module_id = m.id
    INNER JOIN course_enrollments ce ON m.course_id = ce.course_id
    WHERE ce.user_id = NEW.user_id AND ce.course_id = (
        SELECT m.course_id 
        FROM modules m 
        INNER JOIN lessons l ON m.id = l.module_id 
        WHERE l.id = NEW.lesson_id
    );
    
    -- Get completed lessons count
    SELECT COUNT(*) INTO completed_lessons
    FROM lesson_progress lp
    INNER JOIN lessons l ON lp.lesson_id = l.id
    INNER JOIN modules m ON l.module_id = m.id
    INNER JOIN course_enrollments ce ON m.course_id = ce.course_id
    WHERE ce.user_id = NEW.user_id 
    AND lp.is_completed = true
    AND ce.course_id = (
        SELECT m.course_id 
        FROM modules m 
        INNER JOIN lessons l ON m.id = l.module_id 
        WHERE l.id = NEW.lesson_id
    );
    
    -- Calculate progress percentage
    IF total_lessons > 0 THEN
        enrollment_progress := (completed_lessons::DECIMAL / total_lessons::DECIMAL) * 100;
    ELSE
        enrollment_progress := 0;
    END IF;
    
    -- Update course enrollment progress
    UPDATE course_enrollments 
    SET 
        progress = enrollment_progress,
        completed_at = CASE 
            WHEN enrollment_progress >= 100 AND completed_at IS NULL 
            THEN NOW() 
            ELSE completed_at 
        END,
        updated_at = NOW()
    WHERE user_id = NEW.user_id 
    AND course_id = (
        SELECT m.course_id 
        FROM modules m 
        INNER JOIN lessons l ON m.id = l.module_id 
        WHERE l.id = NEW.lesson_id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_enrollment_progress
    AFTER INSERT OR UPDATE ON lesson_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_course_progress();