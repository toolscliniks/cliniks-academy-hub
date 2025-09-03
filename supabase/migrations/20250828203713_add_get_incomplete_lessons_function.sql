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
    ul.last_accessed,
    COALESCE(ul.progress, 0) AS progress
  FROM lessons l
  JOIN modules m ON l.module_id = m.id
  JOIN courses c ON m.course_id = c.id
  LEFT JOIN user_lessons ul ON l.id = ul.lesson_id AND ul.user_id = p_user_id
  WHERE 
    c.is_published = true
    AND (ul.completed_at IS NULL OR ul.completed_at > CURRENT_TIMESTAMP - INTERVAL '30 days')
  ORDER BY 
    ul.last_accessed DESC NULLS LAST,
    c.title,
    m.order_number,
    l.order_number
  LIMIT p_limit;
$$;
