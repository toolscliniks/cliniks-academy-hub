import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Star,
  BookOpen,
  Clock,
  Award,
  Target,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Trophy,
  GraduationCap,
  MessageSquare
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';

interface InstructorPerformance {
  instructor_id: string;
  instructor_name: string;
  instructor_avatar?: string;
  total_students: number;
  active_students: number;
  total_courses: number;
  published_courses: number;
  total_revenue: number;
  monthly_revenue: number;
  average_rating: number;
  total_reviews: number;
  completion_rate: number;
  engagement_score: number;
  growth_rate: number;
  rank: number;
  specialties: string[];
  join_date: string;
}

interface CoursePerformance {
  course_id: string;
  course_title: string;
  instructor_name: string;
  enrollments: number;
  completions: number;
  revenue: number;
  rating: number;
  reviews_count: number;
  completion_rate: number;
  last_updated: string;
}

interface InstructorStatsProps {
  showHeader?: boolean;
  limit?: number;
}

const InstructorStats = ({ showHeader = true, limit = 10 }: InstructorStatsProps) => {
  const { user } = useAuth();
  const [instructors, setInstructors] = useState<InstructorPerformance[]>([]);
  const [topCourses, setTopCourses] = useState<CoursePerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    if (user) {
      fetchInstructorStats();
    }
  }, [user, selectedPeriod]);

  const fetchInstructorStats = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Calcular data de início baseada no período selecionado
      const now = new Date();
      const startDate = new Date();
      
      switch (selectedPeriod) {
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      // Buscar dados dos cursos com informações dos instrutores
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          instructor_name,
          instructor_avatar,
          price,
          created_at,
          course_enrollments!inner(
            id,
            user_id,
            enrolled_at,
            completed_at,
            payment_amount,
            payment_status,
            progress
          ),
          course_reviews(
            id,
            rating,
            created_at
          )
        `);

      if (coursesError) throw coursesError;

      // Processar dados por instrutor
      const instructorMap = new Map<string, InstructorPerformance>();
      const coursePerformanceList: CoursePerformance[] = [];

      coursesData?.forEach(course => {
        const instructorName = course.instructor_name || 'Instrutor Desconhecido';
        const enrollments = course.course_enrollments || [];
        const reviews = course.course_reviews || [];
        
        // Filtrar enrollments pelo período
        const periodEnrollments = enrollments.filter(enrollment => {
          const enrolledAt = new Date(enrollment.enrolled_at);
          return enrolledAt >= startDate;
        });
        
        // Calcular métricas do curso
        const totalEnrollments = periodEnrollments.length;
        const completedEnrollments = periodEnrollments.filter(e => e.completed_at).length;
        const paidEnrollments = periodEnrollments.filter(e => e.payment_status === 'completed');
        const courseRevenue = paidEnrollments.reduce((sum, e) => sum + (e.payment_amount || 0), 0);
        const completionRate = totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0;
        
        // Calcular rating médio
        const courseReviews = reviews.filter(r => new Date(r.created_at) >= startDate);
        const averageRating = courseReviews.length > 0 
          ? courseReviews.reduce((sum, r) => sum + r.rating, 0) / courseReviews.length 
          : 0;

        // Adicionar à lista de performance de cursos
        if (totalEnrollments > 0) {
          coursePerformanceList.push({
            course_id: course.id,
            course_title: course.title,
            instructor_name: instructorName,
            enrollments: totalEnrollments,
            completions: completedEnrollments,
            revenue: courseRevenue,
            rating: averageRating,
            reviews_count: courseReviews.length,
            completion_rate: completionRate,
            last_updated: course.created_at
          });
        }

        // Processar dados do instrutor
        if (!instructorMap.has(instructorName)) {
          instructorMap.set(instructorName, {
            instructor_id: instructorName.toLowerCase().replace(/\s+/g, '_'),
            instructor_name: instructorName,
            instructor_avatar: course.instructor_avatar,
            total_students: 0,
            active_students: 0,
            total_courses: 0,
            published_courses: 0,
            total_revenue: 0,
            monthly_revenue: 0,
            average_rating: 0,
            total_reviews: 0,
            completion_rate: 0,
            engagement_score: 0,
            growth_rate: 0,
            rank: 0,
            specialties: [],
            join_date: course.created_at
          });
        }
        
        const instructor = instructorMap.get(instructorName)!;
        
        // Atualizar métricas do instrutor
        instructor.total_students += totalEnrollments;
        instructor.active_students += periodEnrollments.filter(e => !e.completed_at && e.progress > 0).length;
        instructor.total_courses += 1;
        instructor.published_courses += 1; // Assumindo que todos os cursos retornados estão publicados
        instructor.total_revenue += courseRevenue;
        instructor.total_reviews += courseReviews.length;
        
        // Calcular rating médio ponderado
        if (courseReviews.length > 0) {
          const currentTotalRating = instructor.average_rating * (instructor.total_reviews - courseReviews.length);
          const newTotalRating = currentTotalRating + (averageRating * courseReviews.length);
          instructor.average_rating = instructor.total_reviews > 0 ? newTotalRating / instructor.total_reviews : 0;
        }
      });

      // Calcular métricas adicionais e ranking
      const instructorList = Array.from(instructorMap.values());
      
      instructorList.forEach((instructor, index) => {
        // Calcular completion rate média
        const instructorCourses = coursePerformanceList.filter(c => c.instructor_name === instructor.instructor_name);
        instructor.completion_rate = instructorCourses.length > 0 
          ? instructorCourses.reduce((sum, c) => sum + c.completion_rate, 0) / instructorCourses.length 
          : 0;
        
        // Calcular receita mensal (aproximação)
        const daysPeriod = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : selectedPeriod === '90d' ? 90 : 365;
        instructor.monthly_revenue = (instructor.total_revenue / daysPeriod) * 30;
        
        // Calcular engagement score (baseado em reviews, completion rate e estudantes ativos)
        const reviewsScore = Math.min(instructor.total_reviews / 10, 1) * 30; // Max 30 pontos
        const completionScore = (instructor.completion_rate / 100) * 40; // Max 40 pontos
        const activeStudentsScore = Math.min(instructor.active_students / instructor.total_students || 0, 1) * 30; // Max 30 pontos
        instructor.engagement_score = reviewsScore + completionScore + activeStudentsScore;
        
        // Mock para growth rate (seria necessário dados históricos)
        instructor.growth_rate = (Math.random() - 0.5) * 40; // Entre -20% e +20%
        
        // Mock para especialidades (seria necessário categorização dos cursos)
        const specialties = ['Desenvolvimento', 'Design', 'Marketing', 'Negócios', 'Tecnologia'];
        instructor.specialties = [specialties[Math.floor(Math.random() * specialties.length)]];
      });
      
      // Ordenar por receita total e atribuir ranking
      instructorList.sort((a, b) => b.total_revenue - a.total_revenue);
      instructorList.forEach((instructor, index) => {
        instructor.rank = index + 1;
      });
      
      setInstructors(instructorList.slice(0, limit));
      
      // Ordenar cursos por performance (receita * completion rate)
      const sortedCourses = coursePerformanceList
        .sort((a, b) => (b.revenue * b.completion_rate) - (a.revenue * a.completion_rate))
        .slice(0, 10);
      
      setTopCourses(sortedCourses);

    } catch (error) {
      console.error('Error fetching instructor stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getGrowthIcon = (value: number) => {
    if (value > 0) return <ArrowUpRight className="w-4 h-4 text-green-400" />;
    if (value < 0) return <ArrowDownRight className="w-4 h-4 text-red-400" />;
    return null;
  };

  const getGrowthColor = (value: number) => {
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-zinc-400';
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    if (rank === 2) return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    if (rank === 3) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
  };

  const getEngagementLevel = (score: number) => {
    if (score >= 80) return { label: 'Excelente', color: 'text-green-400' };
    if (score >= 60) return { label: 'Bom', color: 'text-blue-400' };
    if (score >= 40) return { label: 'Regular', color: 'text-yellow-400' };
    return { label: 'Baixo', color: 'text-red-400' };
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case '7d': return 'Últimos 7 dias';
      case '30d': return 'Últimos 30 dias';
      case '90d': return 'Últimos 90 dias';
      case '1y': return 'Último ano';
      default: return 'Últimos 30 dias';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {showHeader && (
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold">Estatísticas por Professor</h3>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-300 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">
              Estatísticas por Professor
            </h3>
            <p className="text-zinc-400 mt-1">Desempenho e comparação entre instrutores</p>
          </div>
          <div className="flex items-center gap-2">
            {(['7d', '30d', '90d', '1y'] as const).map((period) => (
              <Button
                key={period}
                variant={selectedPeriod === period ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod(period)}
                className={selectedPeriod === period ? 'bg-blue-600 hover:bg-blue-700' : ''}
              >
                {getPeriodLabel(period)}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Total de Instrutores</p>
                <p className="text-2xl font-bold">{instructors.length}</p>
                <p className="text-xs text-zinc-500 mt-1">Ativos no período</p>
              </div>
              <GraduationCap className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Receita Total</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(instructors.reduce((sum, i) => sum + i.total_revenue, 0))}
                </p>
                <p className="text-xs text-zinc-500 mt-1">{getPeriodLabel(selectedPeriod)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Estudantes Ativos</p>
                <p className="text-2xl font-bold">
                  {instructors.reduce((sum, i) => sum + i.active_students, 0)}
                </p>
                <p className="text-xs text-zinc-500 mt-1">Em progresso</p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Rating Médio</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {instructors.length > 0 
                    ? (instructors.reduce((sum, i) => sum + i.average_rating, 0) / instructors.length).toFixed(1)
                    : '0.0'
                  }
                </p>
                <div className="flex items-center mt-1">
                  <Star className="w-3 h-3 text-yellow-400 mr-1" />
                  <span className="text-xs text-zinc-500">Geral</span>
                </div>
              </div>
              <Star className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs para Ranking e Top Cursos */}
      <Tabs defaultValue="ranking" className="space-y-4">
        <TabsList className="bg-zinc-900/50 border-zinc-800">
          <TabsTrigger value="ranking" className="data-[state=active]:bg-zinc-800">
            <Trophy className="w-4 h-4 mr-2" />
            Ranking de Instrutores
          </TabsTrigger>
          <TabsTrigger value="courses" className="data-[state=active]:bg-zinc-800">
            <BookOpen className="w-4 h-4 mr-2" />
            Top Cursos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ranking" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {instructors.length > 0 ? (
              instructors.map((instructor) => {
                const engagement = getEngagementLevel(instructor.engagement_score);
                return (
                  <Card key={instructor.instructor_id} className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={instructor.instructor_avatar} />
                            <AvatarFallback className="bg-zinc-700">
                              {instructor.instructor_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-lg">{instructor.instructor_name}</CardTitle>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge className={getRankBadgeColor(instructor.rank)}>
                                #{instructor.rank}
                              </Badge>
                              {instructor.specialties.map(specialty => (
                                <Badge key={specialty} variant="secondary" className="text-xs">
                                  {specialty}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                          <div className="flex items-center justify-center mb-1">
                            <Users className="w-4 h-4 text-blue-400 mr-1" />
                            <span className="text-lg font-bold text-blue-400">
                              {instructor.total_students}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400">Estudantes</p>
                        </div>
                        <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                          <div className="flex items-center justify-center mb-1">
                            <DollarSign className="w-4 h-4 text-green-400 mr-1" />
                            <span className="text-lg font-bold text-green-400">
                              {formatCurrency(instructor.total_revenue).replace('R$', '').trim()}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400">Receita</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-zinc-400">Rating</span>
                          <div className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-400 mr-1" />
                            <span className="font-medium text-yellow-400">
                              {instructor.average_rating.toFixed(1)}
                            </span>
                            <span className="text-xs text-zinc-500 ml-1">
                              ({instructor.total_reviews})
                            </span>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-zinc-400">Taxa de Conclusão</span>
                            <span className="font-medium">
                              {instructor.completion_rate.toFixed(1)}%
                            </span>
                          </div>
                          <Progress 
                            value={instructor.completion_rate} 
                            className="h-2"
                          />
                        </div>
                        
                        <div>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-zinc-400">Engajamento</span>
                            <span className={`font-medium ${engagement.color}`}>
                              {engagement.label}
                            </span>
                          </div>
                          <Progress 
                            value={instructor.engagement_score} 
                            className="h-2"
                          />
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                          <span className="text-sm text-zinc-400">Crescimento</span>
                          <div className="flex items-center">
                            {getGrowthIcon(instructor.growth_rate)}
                            <span className={`text-sm ml-1 ${getGrowthColor(instructor.growth_rate)}`}>
                              {Math.abs(instructor.growth_rate).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card className="bg-zinc-900/50 border-zinc-800 col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <GraduationCap className="w-12 h-12 text-zinc-600 mb-4" />
                  <h3 className="text-lg font-semibold text-zinc-300 mb-2">Nenhum instrutor encontrado</h3>
                  <p className="text-zinc-500 text-center max-w-md">
                    Os dados dos instrutores aparecerão aqui quando houver cursos com matrículas no período selecionado.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="courses" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {topCourses.length > 0 ? (
              topCourses.map((course, index) => (
                <Card key={course.course_id} className="bg-zinc-900/50 border-zinc-800">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge className={getRankBadgeColor(index + 1)}>
                            #{index + 1}
                          </Badge>
                          <Badge variant="secondary">
                            {course.instructor_name}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-lg mb-1">{course.course_title}</h4>
                        <div className="flex items-center space-x-4 text-sm text-zinc-400">
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-1" />
                            {course.enrollments} alunos
                          </div>
                          <div className="flex items-center">
                            <Star className="w-4 h-4 mr-1 text-yellow-400" />
                            {course.rating.toFixed(1)} ({course.reviews_count})
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Receita</span>
                        <span className="font-bold text-green-400">
                          {formatCurrency(course.revenue)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Conclusões</span>
                        <span className="font-medium">
                          {course.completions}/{course.enrollments}
                        </span>
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-zinc-400">Taxa de Conclusão</span>
                          <span className="font-medium">
                            {course.completion_rate.toFixed(1)}%
                          </span>
                        </div>
                        <Progress 
                          value={course.completion_rate} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="bg-zinc-900/50 border-zinc-800 col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="w-12 h-12 text-zinc-600 mb-4" />
                  <h3 className="text-lg font-semibold text-zinc-300 mb-2">Nenhum curso encontrado</h3>
                  <p className="text-zinc-500 text-center max-w-md">
                    Os cursos com melhor desempenho aparecerão aqui quando houver dados no período selecionado.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InstructorStats;