import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

interface CourseStats {
  course_id: string;
  course_title: string;
  instructor_name: string;
  total_enrollments: number;
  completion_rate: number;
  unique_viewers: number;
  total_views: number;
  avg_watch_time: number;
  active_students: number;
  last_accessed: string;
}

interface CourseAccessStatsProps {
  courseId?: string;
}

export const CourseAccessStatsFixed = ({ courseId }: CourseAccessStatsProps) => {
  const [stats, setStats] = useState<CourseStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [courseId]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Get course data
      let coursesQuery = supabase
        .from('courses')
        .select(`
          id,
          title,
          instructor_name,
          course_enrollments(
            id,
            enrolled_at,
            completed_at,
            user_id
          )
        `)
        .eq('is_published', true);

      if (courseId) {
        coursesQuery = coursesQuery.eq('id', courseId);
      }

      const { data: coursesData, error: coursesError } = await coursesQuery;
      if (coursesError) throw coursesError;

      // Get lesson progress data
      const { data: progressData, error: progressError } = await supabase
        .from('lesson_progress')
        .select(`
          user_id,
          lesson_id,
          is_completed,
          watch_time_seconds,
          updated_at
        `);

      if (progressError) throw progressError;

      // Process stats
      const processedStats: CourseStats[] = coursesData?.map(course => {
        const enrollments = course.course_enrollments || [];
        
        const totalEnrollments = enrollments.length;
        const completedEnrollments = enrollments.filter(e => e.completed_at).length;
        const completionRate = totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0;
        
        // Calculate progress stats
        const courseProgress = progressData?.filter(p => p.user_id) || [];
        const uniqueViewers = new Set(courseProgress.map(p => p.user_id)).size;
        const totalViews = courseProgress.length;
        const totalWatchTime = courseProgress.reduce((sum, p) => sum + (p.watch_time_seconds || 0), 0);
        const avgWatchTime = totalViews > 0 ? totalWatchTime / totalViews / 60 : 0;
        
        // Active students (accessed in last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const activeStudents = courseProgress.filter(p => 
          p.updated_at && new Date(p.updated_at) > sevenDaysAgo
        ).length;
        
        // Last accessed
        const lastAccessed = courseProgress
          .map(p => p.updated_at)
          .filter(Boolean)
          .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0] || '';

        return {
          course_id: course.id,
          course_title: course.title,
          instructor_name: course.instructor_name || 'Instrutor',
          total_enrollments: totalEnrollments,
          completion_rate: Math.round(completionRate),
          unique_viewers: uniqueViewers,
          total_views: totalViews,
          avg_watch_time: Math.round(avgWatchTime),
          active_students: activeStudents,
          last_accessed: lastAccessed
        };
      }) || [];

      setStats(processedStats);
    } catch (error) {
      console.error('Error fetching course stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Estatísticas de Acesso</CardTitle>
          <CardDescription>Carregando dados...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (stats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Estatísticas de Acesso</CardTitle>
          <CardDescription>Nenhum dado disponível</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Estatísticas de Acesso dos Cursos</CardTitle>
          <CardDescription>
            Métricas de engajamento e progresso dos estudantes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="course_title" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total_enrollments" fill="#8884d8" name="Inscrições" />
                <Bar dataKey="unique_viewers" fill="#82ca9d" name="Visualizadores Únicos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Taxa de Conclusão</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="course_title" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="completion_rate" 
                  stroke="#8884d8" 
                  name="Taxa de Conclusão (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};