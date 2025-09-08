import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Calendar,
  Clock,
  BookOpen,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Play,
  User,
  LogOut
} from 'lucide-react';

interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  starts_at: string;
  ends_at?: string;
  created_at: string;
  plans: {
    id: string;
    name: string;
    description?: string;
    price_monthly: number;
    price_yearly?: number;
    features?: string[];
  };
}

interface PlanCourse {
  id: string;
  title: string;
  description?: string;
  instructor_name?: string;
  cover_image_url?: string;
  duration_minutes?: number;
  total_lessons?: number;
}

interface CourseEnrollment {
  id: string;
  course_id: string;
  progress: number;
  enrolled_at: string;
  last_accessed?: string;
  courses: PlanCourse;
}

const MySubscriptions = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [planCourses, setPlanCourses] = useState<{ [key: string]: PlanCourse[] }>({});
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [loading, setLoading] = useState(true);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getDaysRemaining = (endDate?: string) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isExpiringSoon = (endDate?: string) => {
    const daysRemaining = getDaysRemaining(endDate);
    return daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0;
  };

  const isExpired = (endDate?: string) => {
    const daysRemaining = getDaysRemaining(endDate);
    return daysRemaining !== null && daysRemaining <= 0;
  };

  const fetchSubscriptions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plans(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubscriptions(data || []);

      // Buscar cursos de cada plano
      const coursesData: { [key: string]: PlanCourse[] } = {};
      for (const subscription of data || []) {
        const { data: planCoursesData, error: planCoursesError } = await supabase
          .from('plan_courses')
          .select(`
            courses:courses(*)
          `)
          .eq('plan_id', subscription.plan_id);

        if (planCoursesError) throw planCoursesError;
        coursesData[subscription.plan_id] = planCoursesData.map((pc: any) => pc.courses);
      }
      setPlanCourses(coursesData);

    } catch (error: any) {
      console.error('Error fetching subscriptions:', error);
      toast({
        title: "Erro ao carregar assinaturas",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const fetchEnrollments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('course_enrollments')
        .select(`
          *,
          courses(*)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      setEnrollments(data || []);
    } catch (error: any) {
      console.error('Error fetching enrollments:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchSubscriptions(), fetchEnrollments()]);
      setLoading(false);
    };

    if (user) {
      loadData();
    }
  }, [user]);

  const getEnrollmentForCourse = (courseId: string) => {
    return enrollments.find(e => e.course_id === courseId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-zinc-400">Carregando suas assinaturas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">
                Minhas Assinaturas
              </h1>
            </div>
            <div className="flex items-center space-x-2">
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
        {/* Navigation */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent mb-2">
            Minhas Assinaturas
          </h1>
          <p className="text-zinc-400 text-lg">
            Gerencie suas assinaturas ativas e acesse seus cursos
          </p>
        </div>

        {/* Subscriptions */}
        {subscriptions.length === 0 ? (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-12 text-center">
              <CreditCard className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhuma assinatura ativa</h3>
              <p className="text-zinc-400 mb-6">Assine um plano para ter acesso ilimitado aos cursos</p>
              <Button onClick={() => navigate('/plans')} className="bg-primary hover:bg-primary/90">
                Ver Planos Disponíveis
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {subscriptions.map((subscription) => {
              const courses = planCourses[subscription.plan_id] || [];
              const daysRemaining = getDaysRemaining(subscription.ends_at);
              
              return (
                <Card key={subscription.id} className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center space-x-2">
                        <CreditCard className="w-5 h-5" />
                        <span>{subscription.plans.name}</span>
                      </CardTitle>
                      <Badge 
                        variant={subscription.status === 'active' ? 'default' : 'destructive'}
                        className={subscription.status === 'active' ? 'bg-green-600' : ''}
                      >
                        {subscription.status === 'active' ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    {/* Plan Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-zinc-400">Valor Mensal</p>
                        <p className="font-semibold text-lg text-primary">
                          {formatCurrency(subscription.plans.price_monthly)}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-zinc-400">Iniciado em</p>
                        <p className="font-semibold">
                          {formatDate(subscription.starts_at)}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-zinc-400">
                          {isExpired(subscription.ends_at) ? 'Expirou em' : 'Válido até'}
                        </p>
                        <p className={`font-semibold ${
                          isExpired(subscription.ends_at) ? 'text-red-500' : 
                          isExpiringSoon(subscription.ends_at) ? 'text-yellow-500' : 
                          'text-green-500'
                        }`}>
                          {subscription.ends_at ? formatDate(subscription.ends_at) : 'Indefinido'}
                          {daysRemaining !== null && daysRemaining > 0 && (
                            <span className="text-sm text-zinc-400 ml-2">
                              ({daysRemaining} dias restantes)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Expiry Warning */}
                    {(isExpiringSoon(subscription.ends_at) || isExpired(subscription.ends_at)) && (
                      <div className={`p-3 rounded-lg border ${
                        isExpired(subscription.ends_at) 
                          ? 'bg-red-950/50 border-red-800 text-red-300' 
                          : 'bg-yellow-950/50 border-yellow-800 text-yellow-300'
                      }`}>
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="w-4 h-4" />
                          <span className="font-medium">
                            {isExpired(subscription.ends_at) ? 'Assinatura Expirada' : 'Assinatura Expirando'}
                          </span>
                        </div>
                        <p className="text-sm mt-1">
                          {isExpired(subscription.ends_at) 
                            ? 'Sua assinatura expirou. Renove para continuar acessando os cursos.'
                            : 'Sua assinatura expira em breve. Considere renovar para manter o acesso.'
                          }
                        </p>
                      </div>
                    )}

                    {/* Plan Features */}
                    {subscription.plans.features && subscription.plans.features.length > 0 && (
                      <div>
                        <p className="text-sm text-zinc-400 mb-2">Recursos Inclusos</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                          {subscription.plans.features.map((feature, index) => (
                            <div key={index} className="flex items-center space-x-2 text-sm">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Available Courses */}
                    <div>
                      <h4 className="text-lg font-semibold mb-4 flex items-center">
                        <BookOpen className="w-5 h-5 mr-2" />
                        Cursos Disponíveis ({courses.length})
                      </h4>
                      
                      {courses.length === 0 ? (
                        <p className="text-zinc-400 text-center py-4">
                          Nenhum curso disponível neste plano
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {courses.map((course) => {
                            const enrollment = getEnrollmentForCourse(course.id);
                            
                            return (
                              <Card key={course.id} className="bg-zinc-800/50 border-zinc-700 hover:border-zinc-600 transition-all duration-300 group cursor-pointer"
                                    onClick={() => navigate(`/courses/${course.id}`)}>
                                <div className="relative overflow-hidden rounded-t-lg">
                                  <img
                                    src={course.cover_image_url || '/placeholder-course.jpg'}
                                    alt={course.title}
                                    className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                    <Play className="w-8 h-8 text-white" />
                                  </div>
                                  {enrollment && enrollment.progress > 0 && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2">
                                      <Progress value={enrollment.progress} className="h-1" />
                                      <p className="text-xs text-white mt-1">{enrollment.progress}% concluído</p>
                                    </div>
                                  )}
                                </div>
                                
                                <CardContent className="p-4">
                                  <h5 className="font-semibold mb-1 group-hover:text-primary transition-colors line-clamp-2">
                                    {course.title}
                                  </h5>
                                  {course.instructor_name && (
                                    <p className="text-sm text-zinc-400 mb-2">
                                      {course.instructor_name}
                                    </p>
                                  )}
                                  <div className="flex items-center justify-between text-xs text-zinc-500">
                                    {course.duration_minutes && (
                                      <div className="flex items-center">
                                        <Clock className="w-3 h-3 mr-1" />
                                        {Math.floor(course.duration_minutes / 60)}h {course.duration_minutes % 60}min
                                      </div>
                                    )}
                                    {course.total_lessons && (
                                      <div className="flex items-center">
                                        <BookOpen className="w-3 h-3 mr-1" />
                                        {course.total_lessons} aulas
                                      </div>
                                    )}
                                  </div>
                                  
                                  {enrollment ? (
                                    <Badge variant="default" className="mt-2 bg-green-600">
                                      Matriculado
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="mt-2">
                                      Disponível
                                    </Badge>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-zinc-800">
                      <Button
                        variant="outline"
                        onClick={() => navigate('/plans')}
                        className="flex-1"
                      >
                        Ver Outros Planos
                      </Button>
                      
                      <Button
                        onClick={() => navigate('/my-courses')}
                        className="flex-1 bg-primary hover:bg-primary/90"
                      >
                        <BookOpen className="w-4 h-4 mr-2" />
                        Meus Cursos
                      </Button>
                    </div>
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

export default MySubscriptions;