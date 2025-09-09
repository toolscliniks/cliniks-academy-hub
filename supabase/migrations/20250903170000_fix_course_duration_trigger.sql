-- Fix course duration calculation with automatic trigger
-- This migration creates a trigger to automatically update course duration_hours
-- whenever lessons are added, updated, or deleted

-- Function to update course duration based on lessons
CREATE OR REPLACE FUNCTION update_course_duration()
RETURNS TRIGGER AS $$
DECLARE
    course_id_var UUID;
    total_minutes INTEGER;
    total_hours INTEGER;
BEGIN
    -- Get the course_id from the affected lesson
    IF TG_OP = 'DELETE' THEN
        SELECT m.course_id INTO course_id_var
        FROM modules m
        WHERE m.id = OLD.module_id;
    ELSE
        SELECT m.course_id INTO course_id_var
        FROM modules m
        WHERE m.id = NEW.module_id;
    END IF;
    
    -- Calculate total duration in minutes for the course
    SELECT COALESCE(SUM(l.duration_minutes), 0) INTO total_minutes
    FROM lessons l
    JOIN modules m ON l.module_id = m.id
    WHERE m.course_id = course_id_var;
    
    -- Convert to hours (rounded up)
    total_hours := CEIL(total_minutes::DECIMAL / 60);
    
    -- Update the course duration_hours
    UPDATE courses
    SET duration_hours = total_hours,
        updated_at = NOW()
    WHERE id = course_id_var;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for lessons table
DROP TRIGGER IF EXISTS trigger_update_course_duration ON lessons;
CREATE TRIGGER trigger_update_course_duration
    AFTER INSERT OR UPDATE OR DELETE ON lessons
    FOR EACH ROW
    EXECUTE FUNCTION update_course_duration();

-- Update existing courses with correct duration
UPDATE courses
SET duration_hours = (
    SELECT CEIL(COALESCE(SUM(l.duration_minutes), 0)::DECIMAL / 60)
    FROM lessons l
    JOIN modules m ON l.module_id = m.id
    WHERE m.course_id = courses.id
),
updated_at = NOW()
WHERE duration_hours = 0 OR duration_hours IS NULL;