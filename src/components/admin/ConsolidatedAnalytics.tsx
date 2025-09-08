import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, Activity, PlayCircle, Clock, TrendingUp, Eye, 
  BookOpen, CreditCard, Calendar, BarChart3, PieChart,
  UserCheck, Zap, Target, Award
} from 'lucide-react';

interface OnlineUser {
  id: string;
  full_name: string;
  avatar_url: string;
  last_seen: string;
  current_activity?: string;
}

interface ActivityData {
  id: string;
  user_id: string;
  activity_type: string;
  description: string;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string;
  };
}

interface CourseStats {
  id: string;
  title: string;
  enrollments_count: number;
  completion_rate: number;
  avg_progress: number;
}

interface RevenueData {
  period: string;
  amount: number;
  transactions: number;
}

const ConsolidatedAnalytics = () => {
  const { toast } = useToast();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityData[]>([]);
  const [courseStats, setCourseStats] = useState<CourseStats[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // General Stats
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [totalCourses, setTotalCourses] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [monthlyGrowth, setMonthlyGrowth] = useState(0);
  const [completionRate, setCompletionRate] = useState(0);

  useEffect(() => {
    fetchAllData();
    
    // Set up real-time subscriptions
    const userActivitySubscription = supabase
      .channel('user_activity_log')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'user_activity_log' },
        () => fetchRecentActivities()
      )
      .subscribe();

    return () => {
      userActivitySubscription.unsubscribe();
    };
  }, []);

  const fetchAllData = async () => {
    try {
      await Promise.all([
        fetchGeneralStats(),
        fetchOnlineUsers(),
        fetchRecentActivities(),
        fetchCourseStats(),
        fetchRevenueData()
      ]);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchGeneralStats = async () => {
    try {
      // Total users
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      setTotalUsers(usersCount || 0);

      // Active users (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: activeCount } = await supabase
        .from('user_activity_log')
        .select('user_id', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());
      setActiveUsers(activeCount || 0);

      // Total courses
      const { count: coursesCount } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true);
      setTotalCourses(coursesCount || 0);

      // Total revenue (this month)
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);
      
      const { data: revenueData } = await supabase
        .from('invoices')
        .select('amount')
        .eq('status', 'paid')
        .gte('paid_at', firstDayOfMonth.toISOString());
      
      const monthlyRevenue = revenueData?.reduce((sum, invoice) => sum + invoice.amount, 0) || 0;
      setTotalRevenue(monthlyRevenue);

      // Monthly growth (compare with last month)
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      lastMonth.setDate(1);
      const endLastMonth = new Date(firstDayOfMonth.getTime() - 1);
      
      const { data: lastMonthRevenue } = await supabase
        .from('invoices')
        .select('amount')
        .eq('status', 'paid')
        .gte('paid_at', lastMonth.toISOString())
        .lte('paid_at', endLastMonth.toISOString());
      
      const lastMonthTotal = lastMonthRevenue?.reduce((sum, invoice) => sum + invoice.amount, 0) || 0;
      const growth = lastMonthTotal > 0 ? ((monthlyRevenue - lastMonthTotal) / lastMonthTotal) * 100 : 0;
      setMonthlyGrowth(growth);

      // Average completion rate
      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('progress');
      
      if (enrollments && enrollments.length > 0) {
        const avgProgress = enrollments.reduce((sum, e) => sum + (e.progress || 0), 0) / enrollments.length;
        setCompletionRate(avgProgress);
      }
    } catch (error: any) {
      console.error('Error fetching general stats:', error);
    }
  };

  const fetchOnlineUsers = async () => {
    try {
      // Get users who were active in the last 5 minutes based on activity log
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
      
      const { data, error } = await supabase
        .from('user_activity_log')
        .select(`
          user_id,
          created_at,
          profiles(
            full_name,
            avatar_url
          )
        `)
        .gte('created_at', fiveMinutesAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      const onlineUsersData = data?.map(activity => ({
        id: activity.user_id,
        full_name: activity.profiles?.full_name || 'Usuário',
        avatar_url: activity.profiles?.avatar_url || '',
        last_seen: activity.created_at,
        current_activity: 'Online'
      })) || [];
      
      setOnlineUsers(onlineUsersData);
    } catch (error: any) {
      console.error('Error fetching online users:', error);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('user_activity_log')
        .select(`
          id,
          user_id,
          activity_type,
          description,
          created_at,
          profiles(
            full_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setRecentActivities(data || []);
    } catch (error: any) {
      console.error('Error fetching activities:', error);
    }
  };

  const fetchCourseStats = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          course_enrollments(count)
        `)
        .eq('is_published', true);

      if (error) throw error;
      
      const statsData = data?.map(course => ({
        id: course.id,
        title: course.title,
        enrollments_count: course.course_enrollments?.length || 0,
        completion_rate: Math.random() * 100, // Placeholder - implement real calculation
        avg_progress: Math.random() * 100 // Placeholder - implement real calculation
      })) || [];
      
      setCourseStats(statsData);
    } catch (error: any) {
      console.error('Error fetching course stats:', error);
    }
  };

  const fetchRevenueData = async () => {
    try {
      // Get revenue for last 6 months
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        date.setDate(1);
        date.setHours(0, 0, 0, 0);
        
        const nextMonth = new Date(date);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        
        const { data } = await supabase
          .from('invoices')
          .select('amount')
          .eq('status', 'paid')
          .gte('paid_at', date.toISOString())
          .lt('paid_at', nextMonth.toISOString());
        
        const monthRevenue = data?.reduce((sum, invoice) => sum + invoice.amount, 0) || 0;
        
        months.push({
          period: date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
          amount: monthRevenue,
          transactions: data?.length || 0
        });
      }
      
      setRevenueData(months);
    } catch (error: any) {
      console.error('Error fetching revenue data:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'course_start':
        return <PlayCircle className="w-4 h-4" />;
      case 'lesson_complete':
        return <BookOpen className="w-4 h-4" />;
      case 'purchase':
        return <CreditCard className="w-4 h-4" />;
      case 'login':
        return <UserCheck className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'course_start':
        return 'default';
      case 'lesson_complete':
        return 'secondary';
      case 'purchase':
        return 'destructive';
      case 'login':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Analytics & Monitoramento</h2>
          <p className="text-muted-foreground">Visão completa da performance da plataforma</p>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Usuários Totais</p>
                <p className="text-2xl font-bold">{totalUsers}</p>
                <p className="text-xs text-muted-foreground">
                  {activeUsers} ativos (30 dias)
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receita Mensal</p>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
                <p className="text-xs text-green-500">
                  {monthlyGrowth > 0 ? '+' : ''}{monthlyGrowth.toFixed(1)}% vs mês anterior
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cursos Ativos</p>
                <p className="text-2xl font-bold">{totalCourses}</p>
                <p className="text-xs text-muted-foreground">
                  Taxa de conclusão: {completionRate.toFixed(1)}%
                </p>
              </div>
              <BookOpen className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Usuários Online</p>
                <p className="text-2xl font-bold">{onlineUsers.length}</p>
                <p className="text-xs text-muted-foreground">
                  Últimos 5 minutos
                </p>
              </div>
              <Zap className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="users">Usuários Online</TabsTrigger>
          <TabsTrigger value="courses">Performance Cursos</TabsTrigger>
          <TabsTrigger value="revenue">Receita</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activities */}
            <Card className="bg-gradient-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Atividades Recentes
                </CardTitle>
                <CardDescription>
                  Últimas ações dos usuários na plataforma
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {recentActivities.slice(0, 10).map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={activity.profiles?.avatar_url} />
                        <AvatarFallback>
                          {activity.profiles?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {getActivityIcon(activity.activity_type)}
                          <Badge variant={getActivityColor(activity.activity_type)} className="text-xs">
                            {activity.activity_type}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium truncate">
                          {activity.profiles?.full_name || 'Usuário'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {activity.description}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(activity.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Revenue Chart Placeholder */}
            <Card className="bg-gradient-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Receita dos Últimos 6 Meses
                </CardTitle>
                <CardDescription>
                  Evolução da receita mensal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {revenueData.map((month, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div>
                        <p className="font-medium">{month.period}</p>
                        <p className="text-sm text-muted-foreground">
                          {month.transactions} transações
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(month.amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="users" className="space-y-4">
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Usuários Online Agora
              </CardTitle>
              <CardDescription>
                Usuários ativos nos últimos 5 minutos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {onlineUsers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {onlineUsers.map((user) => (
                    <div key={user.id} className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30">
                      <Avatar>
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback>
                          {user.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.full_name}</p>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <p className="text-xs text-muted-foreground">
                            {user.current_activity}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum usuário online no momento
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="courses" className="space-y-4">
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Performance dos Cursos
              </CardTitle>
              <CardDescription>
                Estatísticas de engajamento e conclusão
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {courseStats.map((course) => (
                  <div key={course.id} className="p-4 rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{course.title}</h4>
                      <Badge variant="outline">
                        {course.enrollments_count} matrículas
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Taxa de Conclusão</p>
                        <p className="font-medium">{course.completion_rate.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Progresso Médio</p>
                        <p className="font-medium">{course.avg_progress.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="revenue" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gradient-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Resumo Financeiro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                    <span className="text-muted-foreground">Receita Total (6 meses)</span>
                    <span className="font-bold">
                      {formatCurrency(revenueData.reduce((sum, month) => sum + month.amount, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                    <span className="text-muted-foreground">Transações Totais</span>
                    <span className="font-bold">
                      {revenueData.reduce((sum, month) => sum + month.transactions, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                    <span className="text-muted-foreground">Ticket Médio</span>
                    <span className="font-bold">
                      {formatCurrency(
                        revenueData.reduce((sum, month) => sum + month.amount, 0) /
                        Math.max(revenueData.reduce((sum, month) => sum + month.transactions, 0), 1)
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Metas e Objetivos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">Meta Mensal</span>
                      <span className="text-sm font-medium">R$ 10.000</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full" 
                        style={{ width: `${Math.min((totalRevenue / 10000) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {((totalRevenue / 10000) * 100).toFixed(1)}% da meta
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">Novos Usuários (Meta: 100)</span>
                      <span className="text-sm font-medium">{activeUsers}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-secondary h-2 rounded-full" 
                        style={{ width: `${Math.min((activeUsers / 100) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {((activeUsers / 100) * 100).toFixed(1)}% da meta
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConsolidatedAnalytics;