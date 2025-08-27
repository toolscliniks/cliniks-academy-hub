-- Add trailer video URL to courses table
ALTER TABLE public.courses 
ADD COLUMN trailer_video_url text;