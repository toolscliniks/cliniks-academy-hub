import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useCourses } from '@/hooks/useCourses';
import CourseCard from '@/components/CourseCard';
import { Loader2, BookOpen, Users, Trophy, Clock, Play, User, Settings, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Course } from '@/hooks/useCourses';

const Dashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { courses, loading: coursesLoading } = useCourses();
  const navigate = useNavigate();
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState({
    totalCourses: 0,
    completedCourses: 0,
    totalHours: 0,
    certificates: 0
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { state: { from: { pathname: '/dashboard' } } });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && courses) {
      // Simulate enrolled courses (in real app, fetch from course_enrollments)
      const userEnrolledCourses = courses.slice(0, 3); // Mock: first 3 courses
      setEnrolledCourses(userEnrolledCourses);
      
      // Calculate stats
      const totalHours = userEnrolledCourses.reduce((sum, course) => sum + course.duration_hours, 0);
      setStats({
        totalCourses: userEnrolledCourses.length,
        completedCourses: 1, // Mock
        totalHours,
        certificates: 1 // Mock
      });
    }
  }, [user, courses]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-bold">C</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">Cliniks Academy</h1>
                <p className="text-sm text-muted-foreground">Dashboard do Aluno</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/profile')}
                className="flex items-center space-x-2"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Perfil</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="flex items-center space-x-2 text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Olá, {user.user_metadata?.full_name || user.email}! 👋
          </h1>
          <p className="text-muted-foreground">
            Continue sua jornada de aprendizado na Cliniks Academy
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cursos Ativos</CardTitle>
              <BookOpen className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCourses}</div>
              <p className="text-xs text-muted-foreground">
                +2 neste mês
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
              <Trophy className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedCourses}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((stats.completedCourses / stats.totalCourses) * 100)}% de conclusão
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Horas de Estudo</CardTitle>
              <Clock className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalHours}h</div>
              <p className="text-xs text-muted-foreground">
                +5h nesta semana
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Certificados</CardTitle>
              <Users className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.certificates}</div>
              <p className="text-xs text-muted-foreground">
                Parabéns! 🎉
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Continue Learning Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Continue Aprendendo</h2>
            <Button variant="outline" size="sm">
              Ver Todos
            </Button>
          </div>

          {coursesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCourses.map((course) => (
                <div key={course.id} className="relative">
                  <CourseCard
                    course={course}
                    onEnroll={() => navigate(`/course/${course.id}`)}
                  />
                  <div className="absolute top-3 right-3">
                    <Badge variant="secondary" className="bg-success/20 text-success border-success/30">
                      Matriculado
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Ações Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-gradient-card border-border/50 hover:border-primary/30 transition-all cursor-pointer"
                  onClick={() => navigate('/courses')}>
              <CardHeader>
                <Play className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Explorar Cursos</CardTitle>
                <CardDescription>
                  Descubra novos cursos e especializações
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-gradient-card border-border/50 hover:border-primary/30 transition-all cursor-pointer"
                  onClick={() => navigate('/profile')}>
              <CardHeader>
                <Settings className="h-8 w-8 text-accent mb-2" />
                <CardTitle>Configurar Perfil</CardTitle>
                <CardDescription>
                  Atualize suas informações pessoais
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-gradient-card border-border/50 hover:border-primary/30 transition-all cursor-pointer">
              <CardHeader>
                <Trophy className="h-8 w-8 text-success mb-2" />
                <CardTitle>Meus Certificados</CardTitle>
                <CardDescription>
                  Visualize e baixe seus certificados
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;