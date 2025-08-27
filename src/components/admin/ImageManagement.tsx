import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Image, Trash2, Edit, Save, X } from 'lucide-react';
import { useCourses } from '@/hooks/useCourses';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface LessonImage {
  id: string;
  lesson_id: string;
  image_url: string;
  lesson_title: string;
  course_title: string;
}

const ImageManagement = () => {
  const { courses, loading: coursesLoading } = useCourses();
  const { toast } = useToast();
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [lessons, setLessons] = useState<any[]>([]);
  const [lessonImages, setLessonImages] = useState<LessonImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingLessonId, setUploadingLessonId] = useState<string | null>(null);
  const [editingCoverCourse, setEditingCoverCourse] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCourse) {
      fetchCourseLessons();
    }
  }, [selectedCourse]);

  const fetchCourseLessons = async () => {
    if (!selectedCourse) return;
    
    setLoading(true);
    try {
      // Fetch lessons with modules
      const { data: lessonsData, error } = await supabase
        .from('lessons')
        .select(`
          id,
          title,
          video_url,
          modules!inner (
            course_id,
            title,
            courses!inner (
              id,
              title
            )
          )
        `)
        .eq('modules.course_id', selectedCourse);

      if (error) throw error;

      const transformedLessons = lessonsData?.map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        video_url: lesson.video_url,
        course_title: lesson.modules.courses.title,
        module_title: lesson.modules.title
      })) || [];

      setLessons(transformedLessons);

      // Create lesson images data for display
      const lessonImagesData: LessonImage[] = transformedLessons
        .filter(lesson => lesson.video_url)
        .map(lesson => ({
          id: lesson.id,
          lesson_id: lesson.id,
          image_url: lesson.video_url,
          lesson_title: lesson.title,
          course_title: lesson.course_title
        }));

      setLessonImages(lessonImagesData);
    } catch (error) {
      console.error('Error fetching lessons:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar aulas do curso.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (lessonId: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo de imagem válido.",
        variant: "destructive"
      });
      return;
    }

    setUploadingLessonId(lessonId);
    try {
      // Upload to storage
      const fileName = `lesson-covers/${lessonId}-${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage
        .from('course-covers')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('course-covers')
        .getPublicUrl(fileName);

      // Update lesson with new video_url (using as cover image)
      const { error: updateError } = await supabase
        .from('lessons')
        .update({ video_url: data.publicUrl })
        .eq('id', lessonId);

      if (updateError) throw updateError;

      toast({
        title: "Sucesso!",
        description: "Imagem da aula atualizada com sucesso."
      });

      fetchCourseLessons(); // Refresh the list
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao fazer upload da imagem.",
        variant: "destructive"
      });
    } finally {
      setUploadingLessonId(null);
    }
  };

  const handleCourseImageUpload = async (courseId: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo de imagem válido.",
        variant: "destructive"
      });
      return;
    }

    setEditingCoverCourse(courseId);
    try {
      // Upload to storage
      const fileName = `course-covers/${courseId}-${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage
        .from('course-covers')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('course-covers')
        .getPublicUrl(fileName);

      // Update course with new cover image
      const { error: updateError } = await supabase
        .from('courses')
        .update({ cover_image_url: data.publicUrl })
        .eq('id', courseId);

      if (updateError) throw updateError;

      toast({
        title: "Sucesso!",
        description: "Capa do curso atualizada com sucesso."
      });
    } catch (error: any) {
      console.error('Error uploading course image:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao fazer upload da capa do curso.",
        variant: "destructive"
      });
    } finally {
      setEditingCoverCourse(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Gerenciar Imagens</h2>
        <p className="text-muted-foreground">
          Gerencie capas dos cursos e imagens das aulas. As imagens das aulas devem ter tamanho 260x146.
        </p>
      </div>

      {/* Course Covers Section */}
      <Card>
        <CardHeader>
          <CardTitle>Capas dos Cursos</CardTitle>
          <CardDescription>
            Gerencie as imagens de capa que aparecem na tela inicial
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <Card key={course.id} className="overflow-hidden">
                <div className="aspect-video bg-muted relative">
                  {course.cover_image_url ? (
                    <img
                      src={course.cover_image_url}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="w-12 h-12 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id={`course-cover-${course.id}`}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleCourseImageUpload(course.id, file);
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => document.getElementById(`course-cover-${course.id}`)?.click()}
                      disabled={editingCoverCourse === course.id}
                    >
                      {editingCoverCourse === course.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="p-3">
                  <h4 className="font-medium text-sm line-clamp-2">{course.title}</h4>
                  {course.is_featured && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      Destaque
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lesson Images Section */}
      <Card>
        <CardHeader>
          <CardTitle>Imagens das Aulas</CardTitle>
          <CardDescription>
            Gerencie as imagens das aulas (tamanho recomendado: 260x146)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label htmlFor="course-select">Selecionar Curso</Label>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um curso..." />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : selectedCourse ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lessons.map((lesson) => (
                <Card key={lesson.id} className="overflow-hidden">
                  <div className="aspect-[260/146] bg-muted relative">
                    {lesson.video_url ? (
                      <img
                        src={lesson.video_url}
                        alt={lesson.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="w-8 h-8 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id={`lesson-image-${lesson.id}`}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(lesson.id, file);
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => document.getElementById(`lesson-image-${lesson.id}`)?.click()}
                        disabled={uploadingLessonId === lesson.id}
                      >
                        {uploadingLessonId === lesson.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="font-medium text-sm line-clamp-2">{lesson.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{lesson.module_title}</p>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Selecione um curso para gerenciar as imagens das aulas</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ImageManagement;