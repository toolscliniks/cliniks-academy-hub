import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Clock, Trophy, TrendingUp, Users, PlayCircle, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';

interface SimpleStats {
  totalUsers: number;
  totalWatchTime: number;
  completionRate: number;
  lastAccessedAt: string;
}

interface CourseAccessStatsSimpleProps {
  courseId?: string;
  limit?: number;
  showHeader?: boolean;
}

const CourseAccessStatsSimple = ({ courseId, limit = 6, showHeader = true }: CourseAccessStatsSimpleProps) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<SimpleStats>({
    totalUsers: 0,
    totalWatchTime: 0,
    completionRate: 0,
    lastAccessedAt: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user, courseId]);

  const fetchStats = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Buscar progresso das lições com informações do curso
      const query = supabase
        .from('lesson_progress')
        .select(`
          user_id,
          watch_time_seconds,
          is_completed,
          updated_at,
          created_at,
          lessons!inner(
            id,
            modules!inner(
              course_id
            )
          )
        `);

      if (courseId) {
        query.eq('lessons.modules.course_id', courseId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching course access stats:', error);
        return;
      }

      if (data && data.length > 0) {
        const uniqueUsers = [...new Set(data.map(item => item.user_id))].length;
        const totalWatchTime = data.reduce((sum, item) => sum + (item.watch_time_seconds || 0), 0);
        const completedLessons = data.filter(item => item.is_completed).length;
        const totalLessons = data.length;
        
        const lastAccessed = data.reduce((latest, current) => {
          const currentTime = current.updated_at || current.created_at || new Date().toISOString();
          return currentTime > latest ? currentTime : latest;
        }, data[0]?.updated_at || data[0]?.created_at || new Date().toISOString());

        setStats({
          totalUsers: uniqueUsers,
          totalWatchTime: Math.round(totalWatchTime / 60), // Convert to minutes
          completionRate: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
          lastAccessedAt: lastAccessed
        });
      }
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

  if (loading) {
    return (
      <div className="space-y-4">
        {showHeader && (
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Estatísticas de Acesso</h3>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
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
              Estatísticas de Acesso
            </h3>
            <p className="text-zinc-400 mt-1">Resumo do desempenho</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Usuários Únicos</p>
                <p className="text-2xl font-bold text-blue-400">{stats.totalUsers}</p>
                <p className="text-xs text-zinc-500 mt-1">Total de espectadores</p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Tempo Assistido</p>
                <p className="text-2xl font-bold text-green-400">{stats.totalWatchTime}min</p>
                <p className="text-xs text-zinc-500 mt-1">Total acumulado</p>
              </div>
              <Clock className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Taxa de Conclusão</p>
                <p className="text-2xl font-bold text-purple-400">{stats.completionRate}%</p>
                <p className="text-xs text-zinc-500 mt-1">Média de conclusão</p>
              </div>
              <Trophy className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Último Acesso</p>
                <p className="text-lg font-bold text-orange-400">{formatLastAccessed(stats.lastAccessedAt)}</p>
                <p className="text-xs text-zinc-500 mt-1">Atividade recente</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {stats.totalUsers === 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="w-12 h-12 text-zinc-600 mb-4" />
            <h3 className="text-lg font-semibold text-zinc-300 mb-2">Nenhuma estatística disponível</h3>
            <p className="text-zinc-500 text-center max-w-md">
              As estatísticas aparecerão aqui quando houver atividade dos estudantes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CourseAccessStatsSimple;