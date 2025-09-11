import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { Play, Calendar, Clock, Award } from 'lucide-react';

interface SimpleEnrolledCourse {
  id: string;
  course_id: string;
  enrolled_at: string;
  progress: number;
  completed_at: string | null;
  user_id: string;
  payment_amount: number;
  payment_status: string;
  access_type: string;
  courses: {
    id: string;
    title: string;
    description: string | null;
    cover_image_url: string | null;
    instructor_name: string | null;
    duration_hours: number;
    difficulty_level: string;
    category: string | null;
    is_published: boolean;
  };
}

const MyCoursesFixed = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [enrolledCourses, setEnrolledCourses] = useState<SimpleEnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchEnrolledCourses();
    }
  }, [user]);

  const fetchEnrolledCourses = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('course_enrollments')
        .select(`
          *,
          courses!inner(
            id,
            title,
            description,
            cover_image_url,
            instructor_name,
            duration_hours,
            difficulty_level,
            category,
            is_published
          )
        `)
        .eq('user_id', user.id)
        .eq('courses.is_published', true)
        .order('enrolled_at', { ascending: false });

      if (error) throw error;
      setEnrolledCourses(data || []);
    } catch (error) {
      console.error('Erro ao buscar cursos matriculados:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  };

  const navigateToCourse = (courseId: string) => {
    navigate(`/courses/${courseId}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg text-muted-foreground">Carregando seus cursos...</div>
        </div>
      </div>
    );
  }

  if (enrolledCourses.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Meus Cursos</h1>
          <div className="bg-muted/50 rounded-lg p-8 max-w-md mx-auto">
            <p className="text-muted-foreground mb-4">
              Você ainda não está inscrito em nenhum curso.
            </p>
            <Button onClick={() => navigate('/courses')}>
              Explorar Cursos
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Meus Cursos</h1>
        <p className="text-muted-foreground">
          Continue seu aprendizado onde parou
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {enrolledCourses.map((enrollment) => (
          <Card key={enrollment.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <div onClick={() => navigateToCourse(enrollment.course_id)}>
              <div className="aspect-video relative overflow-hidden rounded-t-lg">
                {enrollment.courses.cover_image_url ? (
                  <img
                    src={enrollment.courses.cover_image_url}
                    alt={enrollment.courses.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    <Play className="w-12 h-12 text-primary/60" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <Badge variant={enrollment.completed_at ? "default" : "secondary"}>
                    {enrollment.completed_at ? "Concluído" : "Em Andamento"}
                  </Badge>
                </div>
              </div>

              <CardHeader>
                <CardTitle className="line-clamp-2">{enrollment.courses.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {enrollment.courses.description}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  {/* Progress */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progresso</span>
                      <span>{Math.round(enrollment.progress)}%</span>
                    </div>
                    <Progress value={enrollment.progress} className="h-2" />
                  </div>

                  {/* Course Info */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{enrollment.courses.duration_hours}h</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(enrollment.enrolled_at)}</span>
                    </div>
                  </div>

                  {/* Instructor and Level */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {enrollment.courses.instructor_name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {enrollment.courses.difficulty_level}
                    </Badge>
                  </div>

                  {/* Certificate Button */}
                  {enrollment.completed_at && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/certificates/${enrollment.course_id}`);
                      }}
                    >
                      <Award className="w-4 h-4 mr-2" />
                      Ver Certificado
                    </Button>
                  )}
                </div>
              </CardContent>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MyCoursesFixed;