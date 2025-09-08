-- Create a function to get incomplete lessons for a user
CREATE OR REPLACE FUNCTION public.get_incomplete_lessons(
  p_user_id uuid,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  lesson_id uuid,
  lesson_title text,
  lesson_description text,
  duration_minutes integer,
  course_id uuid,
  course_title text,
  instructor_name text,
  module_title text,
  cover_image_url text,
  last_accessed timestamp with time zone,
  progress numeric
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    l.id AS lesson_id,
    l.title AS lesson_title,
    l.description AS lesson_description,
    l.duration_minutes,
    c.id AS course_id,
    c.title AS course_title,
    c.instructor_name,
    m.title AS module_title,
    c.cover_image_url,
    lp.updated_at AS last_accessed,
    CASE 
      WHEN lp.is_completed = true THEN 100
      WHEN lp.watch_time_seconds > 0 AND l.duration_minutes > 0 THEN 
        LEAST(100, (lp.watch_time_seconds::numeric / (l.duration_minutes * 60)) * 100)
      ELSE 0
    END AS progress
  FROM lessons l
  JOIN modules m ON l.module_id = m.id
  JOIN courses c ON m.course_id = c.id
  JOIN course_enrollments ce ON c.id = ce.course_id AND ce.user_id = p_user_id
  LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = p_user_id
  WHERE 
    c.is_published = true
    AND (lp.is_completed IS NULL OR lp.is_completed = false)
  ORDER BY 
    lp.updated_at DESC NULLS LAST,
    c.title,
    m.order_index,
    l.order_index
  LIMIT p_limit;
$$;
