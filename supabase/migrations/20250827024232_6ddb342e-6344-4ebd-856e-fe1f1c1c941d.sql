-- Add featured flag to courses table
ALTER TABLE public.courses 
ADD COLUMN is_featured BOOLEAN DEFAULT false;