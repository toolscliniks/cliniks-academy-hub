import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

export const ConsolidatedAnalyticsSimple = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Get basic stats
      const [usersData, coursesData, enrollmentsData] = await Promise.all([
        supabase.from('profiles').select('id').limit(1000),
        supabase.from('courses').select('id').eq('is_published', true),
        supabase.from('course_enrollments').select('id').limit(1000)
      ]);

      setStats({
        totalUsers: usersData.data?.length || 0,
        totalCourses: coursesData.data?.length || 0,
        totalEnrollments: enrollmentsData.data?.length || 0,
        recentActivity: []
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analytics Consolidadas</CardTitle>
          <CardDescription>Carregando dados...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Usuários</CardDescription>
            <CardTitle className="text-3xl">{stats.totalUsers}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cursos Publicados</CardDescription>
            <CardTitle className="text-3xl">{stats.totalCourses}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Inscrições</CardDescription>
            <CardTitle className="text-3xl">{stats.totalEnrollments}</CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
};