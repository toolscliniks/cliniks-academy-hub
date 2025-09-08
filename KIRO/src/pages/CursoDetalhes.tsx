import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, Users, Star, BookOpen, Play } from 'lucide-react';
import { useCourseAccess } from '@/hooks/useCourseAccess';
import CoursePlayer from '@/components/cursos/CoursePlayer';
import { useToast } from '@/hooks/use-toast';

const CursoDetalhes = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { courseAccess, courseAccessLoading } = useCourseAccess(courseId);

  // Buscar detalhes do curso
  const { data: course, isLoading } = useQuery({
    queryKey: ['course-details', courseId],
    queryFn: async () => {
      if (!courseId) throw new Error('ID do curso não fornecido');

      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          course_modules (
            id,
            title,
            order_index,
            course_lessons (
              id,
              title,
              duration_minutes,
              is_free
            )
          )
        `)
        .eq('id', courseId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const handlePurchase = async () => {
    if (!courseId) return;

    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          type: 'course',
          courseId: courseId,
          billingType: 'BOLETO'
        }
      });

      if (error) throw error;

      if (data?.checkoutUrl) {
        window.open(data.checkoutUrl, '_blank');
        toast({
          title: 'Redirecionando para pagamento',
          description: 'Você será redirecionado para completar o pagamento'
        });
      } else if (data?.invoiceUrl) {
        window.open(data.invoiceUrl, '_blank');
        toast({
          title: 'Pagamento criado!',
          description: 'Você será redirecionado para finalizar o pagamento.'
        });
      } else if (data?.message) {
        toast({
          title: 'Solicitação de Compra Enviada!',
          description: 'Você receberá um email em breve com as instruções de pagamento. Verifique sua caixa de entrada e spam.',
          duration: 8000
        });
        
        // Redirect to dashboard after showing the message
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (error: any) {
      toast({
        title: 'Erro na compra',
        description: error.message || 'Erro ao processar compra',
        variant: 'destructive'
      });
    }
  };

  if (isLoading || courseAccessLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="bg-gray-200 h-8 rounded w-1/4"></div>
            <div className="bg-gray-200 h-64 rounded-lg"></div>
            <div className="bg-gray-200 h-32 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <h3 className="text-xl font-semibold mb-2">Curso não encontrado</h3>
              <p className="text-gray-600 text-center mb-4">
                O curso que você está procurando não existe ou foi removido.
              </p>
              <Button onClick={() => navigate('/cursos')}>
                Voltar aos Cursos
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const totalLessons = course.course_modules?.reduce((total, module) => 
    total + (module.course_lessons?.length || 0), 0
  ) || 0;

  const totalDuration = course.course_modules?.reduce((total, module) => 
    total + (module.course_lessons?.reduce((moduleTotal, lesson) => 
      moduleTotal + (lesson.duration_minutes || 0), 0
    ) || 0), 0
  ) || 0;

  const freeLessons = course.course_modules?.reduce((total, module) => 
    total + (module.course_lessons?.filter(lesson => lesson.is_free).length || 0), 0
  ) || 0;

  // Se o usuário tem acesso, mostrar o player
  if (courseAccess?.hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="p-4">
          <Button
            variant="outline"
            onClick={() => navigate('/cursos')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar aos Cursos
          </Button>
        </div>
        <CoursePlayer courseId={courseId!} />
      </div>
    );
  }

  // Se não tem acesso, mostrar página de detalhes e compra
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="outline"
          onClick={() => navigate('/cursos')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar aos Cursos
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Conteúdo Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header do Curso */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex space-x-2">
                    <Badge variant="outline">{course.category}</Badge>
                    <Badge variant="secondary">{course.difficulty_level}</Badge>
                    {course.is_featured && (
                      <Badge className="bg-yellow-500">
                        <Star className="w-3 h-3 mr-1" />
                        Destaque
                      </Badge>
                    )}
                  </div>
                </div>
                
                <CardTitle className="text-3xl mb-2">{course.title}</CardTitle>
                <CardDescription className="text-lg">
                  {course.description}
                </CardDescription>

                <div className="flex items-center space-x-6 mt-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {course.instructor_name}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {Math.floor(totalDuration / 60)}h {totalDuration % 60}min
                  </div>
                  <div className="flex items-center">
                    <BookOpen className="w-4 h-4 mr-1" />
                    {totalLessons} aulas
                  </div>
                </div>
              </CardHeader>

              {/* Vídeo de Preview */}
              {course.trailer_video_url && (
                <CardContent>
                  <div className="relative">
                    <div className="relative w-full h-0 pb-[56.25%]">
                      <iframe
                        className="absolute top-0 left-0 w-full h-full rounded-lg"
                        src={course.trailer_video_url.includes('youtube.com') ? 
                          course.trailer_video_url.replace('watch?v=', 'embed/') : 
                          course.trailer_video_url
                        }
                        title={`Preview - ${course.title}`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                      <div className="bg-white/90 rounded-full p-3">
                        <Play className="w-8 h-8 text-blue-600" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Conteúdo do Curso */}
            <Card>
              <CardHeader>
                <CardTitle>Conteúdo do Curso</CardTitle>
                <CardDescription>
                  {course.course_modules?.length || 0} módulos • {totalLessons} aulas • {freeLessons} aulas gratuitas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {course.course_modules?.map((module, moduleIndex) => (
                    <div key={module.id} className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-2">
                        Módulo {moduleIndex + 1}: {module.title}
                      </h4>
                      <div className="space-y-2">
                        {module.course_lessons?.map((lesson, lessonIndex) => (
                          <div key={lesson.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                            <div className="flex items-center space-x-3">
                              <span className="text-sm text-gray-500">
                                {lessonIndex + 1}.
                              </span>
                              <span className="text-sm">{lesson.title}</span>
                              {lesson.is_free && (
                                <Badge variant="outline" className="text-xs">
                                  Grátis
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              <span>{lesson.duration_minutes} min</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar de Compra */}
          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {formatCurrency(course.price)}
                  </div>
                  <p className="text-sm text-gray-600">
                    Acesso vitalício ao curso
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
                  onClick={handlePurchase}
                >
                  <BookOpen className="w-5 h-5 mr-2" />
                  Comprar Curso
                </Button>

                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    Pagamento seguro via Asaas
                  </p>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <h4 className="font-semibold text-sm">Este curso inclui:</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center">
                      <BookOpen className="w-4 h-4 mr-2 text-green-500" />
                      {totalLessons} aulas em vídeo
                    </li>
                    <li className="flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-green-500" />
                      {Math.floor(totalDuration / 60)}h de conteúdo
                    </li>
                    <li className="flex items-center">
                      <Users className="w-4 h-4 mr-2 text-green-500" />
                      Certificado de conclusão
                    </li>
                    <li className="flex items-center">
                      <Star className="w-4 h-4 mr-2 text-green-500" />
                      Acesso vitalício
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Informações do Instrutor */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Instrutor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{course.instructor_name}</h4>
                    <p className="text-sm text-gray-600">Especialista em Estética</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CursoDetalhes;