-- Create storage buckets for course cover images and lesson videos
INSERT INTO storage.buckets (id, name, public) VALUES ('course-covers', 'course-covers', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('lesson-videos', 'lesson-videos', false);

-- Create policies for course cover images (public access)
CREATE POLICY "Course covers are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'course-covers');

CREATE POLICY "Authenticated users can upload course covers" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'course-covers' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update course covers" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'course-covers' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete course covers" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'course-covers' AND auth.role() = 'authenticated');

-- Create policies for lesson videos (restricted access)
CREATE POLICY "Users can view lesson videos if enrolled" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'lesson-videos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload lesson videos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'lesson-videos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update lesson videos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'lesson-videos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete lesson videos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'lesson-videos' AND auth.role() = 'authenticated');

-- Add admin role to profiles table and create admin policies
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Create admin policies for content management
CREATE POLICY "Admin can manage courses" ON public.courses
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admin can manage modules" ON public.modules
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admin can manage lessons" ON public.lessons
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admin can manage plans" ON public.plans
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Add external video support to lessons
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS video_type TEXT DEFAULT 'upload';
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS external_video_id TEXT;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS external_video_platform TEXT;