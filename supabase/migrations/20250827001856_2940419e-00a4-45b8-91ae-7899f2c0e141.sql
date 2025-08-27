-- Add cover image to modules
ALTER TABLE public.modules 
ADD COLUMN cover_image_url TEXT;