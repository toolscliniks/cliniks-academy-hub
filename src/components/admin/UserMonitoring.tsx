import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Activity, Eye, Clock, BookOpen } from 'lucide-react';

interface UserSession {
  id: string;
  user_id: string;
  last_activity: string;
  is_active: boolean;
  user_agent: string;
  profiles: {
    full_name: string;
    email: string;
    avatar_url: string;
  };
}

interface UserActivity {
  id: string;
  user_id: string;
  activity_type: string;
  activity_description: string;
  course_id: string;
  lesson_id: string;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
  courses?: {
    title: string;
  };
  lessons?: {
    title: string;
  };
}

const UserMonitoring = () => {
  const { toast } = useToast();
  const [activeSessions, setActiveSessions] = useState<UserSession[]>([]);
  const [recentActivity, setRecentActivity] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveUsers();
    fetchRecentActivity();

    // Set up real-time subscriptions
    const sessionsChannel = supabase
      .channel('user-sessions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_sessions'
      }, () => {
        fetchActiveUsers();
      })
      .subscribe();

    const activityChannel = supabase
      .channel('user-activity')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'user_activity_log'
      }, () => {
        fetchRecentActivity();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sessionsChannel);
      supabase.removeChannel(activityChannel);
    };
  }, []);

  const fetchActiveUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('is_active', true)
        .gte('last_activity', new Date(Date.now() - 5 * 60 * 1000).toISOString())
        .order('last_activity', { ascending: false });

      if (error) throw error;
      
      // Fetch profiles separately
      if (data && data.length > 0) {
        const userIds = data.map(session => session.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', userIds);

        if (!profilesError && profilesData) {
          const sessionsWithProfiles = data.map(session => ({
            ...session,
            profiles: profilesData.find(profile => profile.id === session.user_id) || {
              full_name: 'Nome não informado',
              email: 'Email não encontrado',
              avatar_url: ''
            }
          }));
          setActiveSessions(sessionsWithProfiles as UserSession[]);
        }
      } else {
        setActiveSessions([]);
      }
    } catch (error: any) {
      console.error('Error fetching active users:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const { data, error } = await supabase
        .from('user_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      if (data && data.length > 0) {
        // Fetch related data separately
        const userIds = [...new Set(data.map(activity => activity.user_id))];
        const courseIds = [...new Set(data.filter(a => a.course_id).map(a => a.course_id))];
        const lessonIds = [...new Set(data.filter(a => a.lesson_id).map(a => a.lesson_id))];

        const [profilesResult, coursesResult, lessonsResult] = await Promise.all([
          supabase.from('profiles').select('id, full_name, email').in('id', userIds),
          courseIds.length > 0 ? supabase.from('courses').select('id, title').in('id', courseIds) : { data: [] },
          lessonIds.length > 0 ? supabase.from('lessons').select('id, title').in('id', lessonIds) : { data: [] }
        ]);

        const activityWithRelations = data.map(activity => ({
          ...activity,
          profiles: profilesResult.data?.find(p => p.id === activity.user_id) || {
            full_name: 'Usuário não encontrado',
            email: ''
          },
          courses: coursesResult.data?.find(c => c.id === activity.course_id) || null,
          lessons: lessonsResult.data?.find(l => l.id === activity.lesson_id) || null
        }));

        setRecentActivity(activityWithRelations as UserActivity[]);
      } else {
        setRecentActivity([]);
      }
    } catch (error: any) {
      console.error('Error fetching activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Agora';
    if (diffInMinutes < 60) return `${diffInMinutes}m atrás`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h atrás`;
    return `${Math.floor(diffInMinutes / 1440)}d atrás`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'course_view':
        return <BookOpen className="w-4 h-4" />;
      case 'lesson_view':
        return <Eye className="w-4 h-4" />;
      case 'lesson_complete':
        return <Activity className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando dados de monitoramento...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Monitoramento de Usuários</h2>
          <p className="text-muted-foreground">Acompanhe usuários online e atividades em tempo real</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Usuários Online</p>
                <p className="text-2xl font-bold text-green-600">{activeSessions.length}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Atividades (24h)</p>
                <p className="text-2xl font-bold">{recentActivity.length}</p>
              </div>
              <Activity className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Média de Sessão</p>
                <p className="text-2xl font-bold">24m</p>
              </div>
              <Clock className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Users */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Usuários Online</span>
            </CardTitle>
            <CardDescription>
              Usuários ativos nos últimos 5 minutos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={session.profiles.avatar_url} />
                      <AvatarFallback>
                        {session.profiles.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">
                        {session.profiles.full_name || 'Nome não informado'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.profiles.email}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                      Online
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTimeAgo(session.last_activity)}
                    </p>
                  </div>
                </div>
              ))}
              
              {activeSessions.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum usuário online no momento</p>
                </div>
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
            <CardDescription>
              Últimas ações dos usuários na plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 bg-muted/20 rounded-lg">
                  <div className="flex-shrink-0 mt-0.5">
                    {getActivityIcon(activity.activity_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {activity.profiles.full_name || 'Usuário'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.activity_description}
                    </p>
                    {(activity.courses?.title || activity.lessons?.title) && (
                      <p className="text-xs text-primary mt-1">
                        {activity.courses?.title} {activity.lessons?.title && `• ${activity.lessons.title}`}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex-shrink-0">
                    {formatTimeAgo(activity.created_at)}
                  </div>
                </div>
              ))}
              
              {recentActivity.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma atividade recente</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserMonitoring;