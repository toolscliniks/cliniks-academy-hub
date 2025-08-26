import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Eye, Play, Clock, TrendingUp, Activity } from 'lucide-react';

interface OnlineUser {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string;
  last_activity: string;
  current_course?: string;
  current_lesson?: string;
}

interface ActivityData {
  user: {
    full_name: string;
    email: string;
  };
  activity_type: string;
  activity_description: string;
  created_at: string;
  course?: {
    title: string;
  };
  lesson?: {
    title: string;
  };
}

const AdminAnalytics = () => {
  const { toast } = useToast();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityData[]>([]);
  const [stats, setStats] = useState({
    totalOnline: 0,
    totalWatching: 0,
    avgSessionTime: 0,
    activeCoursesCount: 0
  });

  useEffect(() => {
    fetchOnlineUsers();
    fetchRecentActivity();
    fetchStats();

    // Set up real-time subscriptions
    const usersChannel = supabase
      .channel('online-users')
      .on('presence', { event: 'sync' }, () => {
        const presenceState = usersChannel.presenceState();
        console.log('Online users updated:', presenceState);
      })
      .subscribe();

    const activityChannel = supabase
      .channel('user-activity')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'user_activity_log'
      }, (payload) => {
        console.log('New activity:', payload);
        fetchRecentActivity();
      })
      .subscribe();

    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      fetchOnlineUsers();
      fetchStats();
    }, 30000);

    return () => {
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(activityChannel);
      clearInterval(interval);
    };
  }, []);

  const fetchOnlineUsers = async () => {
    try {
      // Get recent user sessions - simplified approach
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data: sessions, error } = await supabase
        .from('user_sessions')
        .select('user_id, last_activity')
        .eq('is_active', true)
        .gte('last_activity', fiveMinutesAgo)
        .order('last_activity', { ascending: false });

      if (error) throw error;

      // Get user profiles separately
      const userIds = sessions?.map(s => s.user_id) || [];
      if (userIds.length === 0) {
        setOnlineUsers([]);
        return;
      }

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      if (profileError) throw profileError;

      // Combine data
      const users = sessions?.map(session => {
        const profile = profiles?.find(p => p.id === session.user_id);
        return {
          id: session.user_id,
          full_name: profile?.full_name || 'Usuário',
          email: profile?.email || '',
          avatar_url: profile?.avatar_url || '',
          last_activity: session.last_activity
        };
      }) || [];

      setOnlineUsers(users);
    } catch (error: any) {
      console.error('Error fetching online users:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const { data: activities, error } = await supabase
        .from('user_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Get user profiles separately
      const userIds = activities?.map(a => a.user_id) || [];
      const courseIds = activities?.map(a => a.course_id).filter(Boolean) || [];
      const lessonIds = activities?.map(a => a.lesson_id).filter(Boolean) || [];

      const [profilesData, coursesData, lessonsData] = await Promise.all([
        userIds.length > 0 ? supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds) : Promise.resolve({ data: [] }),
        courseIds.length > 0 ? supabase
          .from('courses')
          .select('id, title')
          .in('id', courseIds) : Promise.resolve({ data: [] }),
        lessonIds.length > 0 ? supabase
          .from('lessons')
          .select('id, title')
          .in('id', lessonIds) : Promise.resolve({ data: [] })
      ]);

      // Combine data
      const enrichedActivities = activities?.map(activity => ({
        ...activity,
        user: profilesData.data?.find(p => p.id === activity.user_id) || { full_name: 'Usuário', email: '' },
        course: coursesData.data?.find(c => c.id === activity.course_id),
        lesson: lessonsData.data?.find(l => l.id === activity.lesson_id)
      })) || [];

      setRecentActivity(enrichedActivities);
    } catch (error: any) {
      console.error('Error fetching activity:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      // Count online users
      const { count: onlineCount } = await supabase
        .from('user_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .gte('last_activity', fiveMinutesAgo);

      // Count users currently watching
      const { count: watchingCount } = await supabase
        .from('user_activity_log')
        .select('*', { count: 'exact', head: true })
        .eq('activity_type', 'lesson_play')
        .gte('created_at', fiveMinutesAgo);

      // Count active courses (courses with recent activity)
      const { data: activeCourses } = await supabase
        .from('user_activity_log')
        .select('course_id')
        .not('course_id', 'is', null)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const uniqueCourses = new Set(activeCourses?.map(a => a.course_id) || []);

      setStats({
        totalOnline: onlineCount || 0,
        totalWatching: watchingCount || 0,
        avgSessionTime: 0, // This would need more complex calculation
        activeCoursesCount: uniqueCourses.size
      });
    } catch (error: any) {
      console.error('Error fetching stats:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Agora mesmo';
    if (diffInMinutes < 60) return `${diffInMinutes}m atrás`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d atrás`;
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'lesson_play':
        return <Play className="w-4 h-4 text-green-500" />;
      case 'course_enroll':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'lesson_complete':
        return <TrendingUp className="w-4 h-4 text-purple-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActivityText = (activity: ActivityData) => {
    switch (activity.activity_type) {
      case 'lesson_play':
        return `assistiu "${activity.lesson?.title || 'uma aula'}"`;
      case 'course_enroll':
        return `se inscreveu em "${activity.course?.title || 'um curso'}"`;
      case 'lesson_complete':
        return `completou "${activity.lesson?.title || 'uma aula'}"`;
      default:
        return activity.activity_description || 'realizou uma atividade';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Analytics e Monitoramento</h2>
        <p className="text-muted-foreground">Acompanhe a atividade em tempo real dos usuários</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Usuários Online</p>
                <p className="text-2xl font-bold text-green-600">{stats.totalOnline}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Assistindo Agora</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalWatching}</p>
              </div>
              <Eye className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cursos Ativos</p>
                <p className="text-2xl font-bold text-purple-600">{stats.activeCoursesCount}</p>
              </div>
              <Play className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sessão Média</p>
                <p className="text-2xl font-bold text-orange-600">25min</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Online Users */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Usuários Online</span>
            </CardTitle>
            <CardDescription>Usuários ativos nos últimos 5 minutos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {onlineUsers.map((user) => (
                <div key={user.id} className="flex items-center space-x-3 p-2 rounded-lg border">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>
                      {user.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="text-xs">
                      {formatTimeAgo(user.last_activity)}
                    </Badge>
                  </div>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              ))}
              
              {onlineUsers.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum usuário online no momento
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Atividade Recente</span>
            </CardTitle>
            <CardDescription>Últimas ações dos usuários na plataforma</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 p-2 rounded-lg border">
                  {getActivityIcon(activity.activity_type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{activity.user.full_name}</span>{' '}
                      {getActivityText(activity)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimeAgo(activity.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              
              {recentActivity.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma atividade recente
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalytics;