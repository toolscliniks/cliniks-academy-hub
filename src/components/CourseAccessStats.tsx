import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Clock, Trophy, TrendingUp, Users, PlayCircle, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';

interface CourseStats {
  course_id: string;
  course_title: string;
  instructor_name: string;
  total_views: number;
  unique_viewers: number;
  avg_watch_time: number;
  completion_rate: number;
  total_enrollments: number;
  active_students: number;
  last_accessed: string;
  thumbnail_url?: string;
}

interface CourseAccessStatsProps {
  limit?: number;
  showHeader?: boolean;
}

const CourseAccessStats = ({ limit = 6, showHeader = true }: CourseAccessStatsProps) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<CourseStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'views' | 'completion' | 'recent'>('views');

  useEffect(() => {
    if (user) {
      fetchCourseStats();
    }
  }, [user, sortBy]);

  const fetchCourseStats = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Buscar estatísticas de acesso por curso
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          instructor_name,
          thumbnail_url,
          course_enrollments!inner(
            id,
            user_id,
            enrolled_at,
            progress,
            completed_at
          )
        `)
        .limit(limit * 2); // Buscar mais para filtrar depois

      if (coursesError) throw coursesError;

      // Buscar dados de progresso das aulas
      const { data: progressData, error: progressError } = await supabase
        .from('lesson_progress')
        .select(`
          lesson_id,
          user_id,
          progress,
          completed_at,
          last_accessed_at,
          watch_time_seconds,
          lessons!inner(
            id,
            duration_minutes,
            modules!inner(
              course_id
            )
          )
        `);

      if (progressError) throw progressError;

      // Processar dados para criar estatísticas
      const courseStatsMap = new Map<string, CourseStats>();

      coursesData?.forEach(course => {
        const enrollments = course.course_enrollments || [];
        const courseProgress = progressData?.filter(p => p.lessons?.modules?.course_id === course.id) || [];
        
        // Calcular métricas
        const totalEnrollments = enrollments.length;
        const completedEnrollments = enrollments.filter(e => e.completed_at).length;
        const completionRate = totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0;
        
        // Calcular visualizações únicas e tempo médio
        const uniqueViewers = new Set(courseProgress.map(p => p.user_id)).size;
        const totalViews = courseProgress.length;
        const totalWatchTime = courseProgress.reduce((sum, p) => sum + (p.watch_time_seconds || 0), 0);
        const avgWatchTime = totalViews > 0 ? totalWatchTime / totalViews / 60 : 0; // em minutos
        
        // Estudantes ativos (acessaram nos últimos 7 dias)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const activeStudents = courseProgress.filter(p => 
          p.last_accessed_at && new Date(p.last_accessed_at) > sevenDaysAgo
        ).length;
        
        // Último acesso
        const lastAccessed = courseProgress
          .map(p => p.last_accessed_at)
          .filter(Boolean)
          .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0] || '';

        courseStatsMap.set(course.id, {
          course_id: course.id,
          course_title: course.title,
          instructor_name: course.instructor_name || 'Instrutor',
          total_views: totalViews,
          unique_viewers: uniqueViewers,
          avg_watch_time: Math.round(avgWatchTime),
          completion_rate: Math.round(completionRate),
          total_enrollments: totalEnrollments,
          active_students: activeStudents,
          last_accessed: lastAccessed,
          thumbnail_url: course.thumbnail_url
        });
      });

      // Converter para array e ordenar
      let sortedStats = Array.from(courseStatsMap.values());
      
      switch (sortBy) {
        case 'views':
          sortedStats.sort((a, b) => b.total_views - a.total_views);
          break;
        case 'completion':
          sortedStats.sort((a, b) => b.completion_rate - a.completion_rate);
          break;
        case 'recent':
          sortedStats.sort((a, b) => 
            new Date(b.last_accessed || 0).getTime() - new Date(a.last_accessed || 0).getTime()
          );
          break;
      }

      setStats(sortedStats.slice(0, limit));
    } catch (error) {
      console.error('Error fetching course stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatLastAccessed = (dateString: string) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'Agora há pouco';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h atrás`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  const getSortButtonVariant = (sortType: typeof sortBy) => {
    return sortBy === sortType ? 'default' : 'outline';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {showHeader && (
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Estatísticas de Acesso</h3>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: limit }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-300 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-2">
                  <div className="h-2 bg-gray-200 rounded"></div>
                  <div className="h-2 bg-gray-200 rounded"></div>
                </div>
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
              Estatísticas de Acesso
            </h3>
            <p className="text-zinc-400 mt-1">Acompanhe o desempenho dos seus cursos</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={getSortButtonVariant('views')}
              size="sm"
              onClick={() => setSortBy('views')}
              className="text-xs"
            >
              <Eye className="w-3 h-3 mr-1" />
              Visualizações
            </Button>
            <Button
              variant={getSortButtonVariant('completion')}
              size="sm"
              onClick={() => setSortBy('completion')}
              className="text-xs"
            >
              <Trophy className="w-3 h-3 mr-1" />
              Conclusão
            </Button>
            <Button
              variant={getSortButtonVariant('recent')}
              size="sm"
              onClick={() => setSortBy('recent')}
              className="text-xs"
            >
              <Clock className="w-3 h-3 mr-1" />
              Recentes
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Card key={stat.course_id} className="bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900/70 transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg font-bold line-clamp-2 leading-tight mb-1">
                    {stat.course_title}
                  </CardTitle>
                  <p className="text-sm text-zinc-400">
                    Por {stat.instructor_name}
                  </p>
                </div>
                {stat.thumbnail_url && (
                  <div className="w-12 h-12 rounded-lg overflow-hidden ml-3 flex-shrink-0">
                    <img 
                      src={stat.thumbnail_url} 
                      alt={stat.course_title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Métricas principais */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center justify-center mb-1">
                    <Eye className="w-4 h-4 text-blue-400 mr-1" />
                    <span className="text-lg font-bold text-blue-400">{stat.total_views}</span>
                  </div>
                  <p className="text-xs text-zinc-400">Visualizações</p>
                </div>
                <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center justify-center mb-1">
                    <Users className="w-4 h-4 text-green-400 mr-1" />
                    <span className="text-lg font-bold text-green-400">{stat.unique_viewers}</span>
                  </div>
                  <p className="text-xs text-zinc-400">Espectadores</p>
                </div>
              </div>

              {/* Métricas secundárias */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <Clock className="w-3 h-3 text-yellow-400 mr-1" />
                    <span className="text-zinc-300">Tempo médio</span>
                  </div>
                  <span className="font-medium">{stat.avg_watch_time}min</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <Trophy className="w-3 h-3 text-purple-400 mr-1" />
                    <span className="text-zinc-300">Taxa de conclusão</span>
                  </div>
                  <Badge variant={stat.completion_rate > 70 ? 'default' : stat.completion_rate > 40 ? 'secondary' : 'destructive'}>
                    {stat.completion_rate}%
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <TrendingUp className="w-3 h-3 text-orange-400 mr-1" />
                    <span className="text-zinc-300">Estudantes ativos</span>
                  </div>
                  <span className="font-medium">{stat.active_students}</span>
                </div>
              </div>

              {/* Último acesso */}
              <div className="pt-2 border-t border-zinc-800">
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>Último acesso:</span>
                  <span>{formatLastAccessed(stat.last_accessed)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats.length === 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="w-12 h-12 text-zinc-600 mb-4" />
            <h3 className="text-lg font-semibold text-zinc-300 mb-2">Nenhuma estatística disponível</h3>
            <p className="text-zinc-500 text-center max-w-md">
              As estatísticas aparecerão aqui quando houver atividade dos estudantes nos cursos.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CourseAccessStats;