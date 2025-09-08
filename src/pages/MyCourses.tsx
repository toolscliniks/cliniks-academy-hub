import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, BookOpen, Clock, Calendar, Play, CheckCircle, User, LogOut, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Course } from '@/hooks/useCourses';
import NotificationCenter from '@/components/NotificationCenter';

interface EnrolledCourse {
  id: string;
  user_id: string;
  course_id: string;
  progress: number;
  enrolled_at: string;
  completed_at?: string;
  last_accessed?: string;
  access_expires_at?: string;
  courses?: Course;
}

const MyCourses = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  useEffect(() => {
    if (user) {
      fetchEnrolledCourses();
    }
  }, [user]);

  // Função para recalcular o progresso de um curso específico
  const recalculateCourseProgress = async (courseId: string, userId: string) => {
    try {
      // Buscar todas as aulas do curso
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select(`
          id,
          modules!inner (
            course_id
          )
        `)
        .eq('modules.course_id', courseId);

      if (lessonsError) throw lessonsError;
      
      const lessonIds = lessonsData?.map(l => l.id) || [];
      if (lessonIds.length === 0) return;

      // Buscar aulas concluídas
      const { data: completedLessons, error: progressError } = await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('user_id', userId)
        .eq('is_completed', true)
        .in('lesson_id', lessonIds);

      if (progressError) throw progressError;

      // Calcular progresso
      const completedCount = completedLessons?.length || 0;
      const totalLessons = lessonIds.length;
      const progressPercentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
      
      // Verificar se o curso está completo
      const isCompleted = progressPercentage === 100;
      const completedAt = isCompleted ? new Date().toISOString() : null;

      // Atualizar progresso no banco
      const { error: updateError } = await supabase
        .from('course_enrollments')
        .update({
          progress: progressPercentage,
          completed_at: completedAt
        })
        .eq('user_id', userId)
        .eq('course_id', courseId);

      if (updateError) throw updateError;

      return progressPercentage;
    } catch (error) {
      console.error('Erro ao recalcular progresso do curso:', error);
      return null;
    }
  };

  // Função para recalcular progresso de todos os cursos do usuário
  const recalculateAllProgress = async () => {
    if (!user) return;
    
    try {
      for (const enrollment of enrolledCourses) {
        await recalculateCourseProgress(enrollment.course_id, user.id);
      }
      // Recarregar dados após recalcular
      await fetchEnrolledCourses();
    } catch (error) {
      console.error('Erro ao recalcular progresso de todos os cursos:', error);
    }
  };

  const fetchEnrolledCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('course_enrollments')
        .select(`
          *,
          courses (
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
        .eq('user_id', user?.id)
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

  const getDaysRemaining = (expiresAt?: string) => {
    if (!expiresAt) return null;
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const getStatusBadge = (course: EnrolledCourse) => {
    if (course.completed_at) {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Concluído</Badge>;
    }
    if (course.progress > 0) {
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Em Progresso</Badge>;
    }
    return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Não Iniciado</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-black/95 backdrop-blur-sm border-b border-zinc-800/50 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                GUSTAVO MEDEIROS
              </h1>
              <nav className="hidden md:flex space-x-6">
                <Button variant="ghost" className="text-zinc-400 hover:text-white transition-colors" onClick={() => navigate('/dashboard')}>Início</Button>
                <Button variant="ghost" className="text-white hover:text-primary transition-colors">Meus Cursos</Button>
                <Button variant="ghost" className="text-zinc-400 hover:text-white transition-colors" onClick={() => navigate('/courses')}>Cursos</Button>
                <Button variant="ghost" className="text-zinc-400 hover:text-white transition-colors" onClick={() => navigate('/certificates')}>Certificados</Button>
                <Button variant="ghost" className="text-zinc-400 hover:text-white transition-colors" onClick={() => navigate('/plans')}>Planos</Button>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <NotificationCenter />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/profile')}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <User className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={recalculateAllProgress}
              className="text-zinc-400 hover:text-white border-zinc-700 hover:border-zinc-600"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar Progresso
            </Button>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent mb-2">
            Meus Cursos
          </h1>
          <p className="text-zinc-400 text-lg">
            Acompanhe seu progresso e gerencie seus cursos adquiridos
          </p>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-sm border border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <BookOpen className="w-8 h-8 text-blue-400" />
                <span className="text-2xl font-bold text-blue-400">{enrolledCourses.length}</span>
              </div>
              <h3 className="text-lg font-semibold mb-1">Total de Cursos</h3>
              <p className="text-zinc-400 text-sm">Cursos adquiridos</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-600/20 to-green-800/20 backdrop-blur-sm border border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
                <span className="text-2xl font-bold text-green-400">
                  {enrolledCourses.filter(c => c.completed_at).length}
                </span>
              </div>
              <h3 className="text-lg font-semibold mb-1">Concluídos</h3>
              <p className="text-zinc-400 text-sm">Certificados obtidos</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 backdrop-blur-sm border border-purple-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Play className="w-8 h-8 text-purple-400" />
                <span className="text-2xl font-bold text-purple-400">
                  {enrolledCourses.filter(c => c.progress > 0 && !c.completed_at).length}
                </span>
              </div>
              <h3 className="text-lg font-semibold mb-1">Em Progresso</h3>
              <p className="text-zinc-400 text-sm">Cursos iniciados</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-600/20 to-orange-800/20 backdrop-blur-sm border border-orange-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Clock className="w-8 h-8 text-orange-400" />
                <span className="text-2xl font-bold text-orange-400">
                  {Math.round(enrolledCourses.reduce((acc, course) => acc + (course.progress || 0), 0) / Math.max(enrolledCourses.length, 1))}%
                </span>
              </div>
              <h3 className="text-lg font-semibold mb-1">Progresso Médio</h3>
              <p className="text-zinc-400 text-sm">Todos os cursos</p>
            </CardContent>
          </Card>
        </div>

        {/* Courses Grid */}
        {enrolledCourses.length === 0 ? (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-12 text-center">
              <BookOpen className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhum curso adquirido</h3>
              <p className="text-zinc-400 mb-6">Explore nossa biblioteca de cursos e comece sua jornada de aprendizado</p>
              <Button onClick={() => navigate('/courses')} className="bg-primary hover:bg-primary/90">
                Explorar Cursos
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledCourses.map((enrollment) => {
              const course = enrollment.courses;
              if (!course) return null;
              
              const daysRemaining = getDaysRemaining(enrollment.access_expires_at);
              
              return (
                <Card key={enrollment.id} className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-all duration-300 group">
                  <div className="relative overflow-hidden rounded-t-lg">
                    <img
                      src={course.cover_image_url || '/placeholder-course.jpg'}
                      alt={course.title}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-4 right-4">
                      {getStatusBadge(enrollment)}
                    </div>
                    {enrollment.progress > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2">
                        <Progress value={enrollment.progress} className="h-2" />
                        <p className="text-xs text-white mt-1">{enrollment.progress}% concluído</p>
                      </div>
                    )}
                  </div>
                  
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-zinc-400 text-sm mb-4 line-clamp-2">
                      {course.description}
                    </p>
                    
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-400">Instrutor:</span>
                        <span className="text-white">{course.instructor_name}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-400">Matriculado em:</span>
                        <span className="text-white">{formatDate(enrollment.enrolled_at)}</span>
                      </div>
                      
                      {enrollment.last_accessed && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-400">Último acesso:</span>
                          <span className="text-white">{formatDate(enrollment.last_accessed)}</span>
                        </div>
                      )}
                      
                      {daysRemaining !== null && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-400">Acesso expira em:</span>
                          <span className={`font-semibold ${
                            daysRemaining <= 7 ? 'text-red-400' : 
                            daysRemaining <= 30 ? 'text-yellow-400' : 'text-green-400'
                          }`}>
                            {daysRemaining} dias
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <Button 
                      onClick={() => navigate(`/courses/${course.id}`)}
                      className="w-full bg-primary hover:bg-primary/90 transition-colors"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {enrollment.progress > 0 ? 'Continuar Curso' : 'Iniciar Curso'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyCourses;