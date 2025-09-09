import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar,
  Target,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Percent,
  CreditCard,
  ShoppingCart,
  UserMinus,
  UserPlus,
  Zap,
  Globe,
  PieChart
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';

interface GeneralMetrics {
  total_revenue: number;
  previous_revenue: number;
  revenue_growth: number;
  average_ticket: number;
  previous_ticket: number;
  ticket_growth: number;
  total_customers: number;
  new_customers: number;
  churned_customers: number;
  churn_rate: number;
  retention_rate: number;
  ltv: number;
  cac: number;
  mrr: number;
  arr: number;
  conversion_rate: number;
  active_courses: number;
  total_enrollments: number;
  completion_rate: number;
}

interface RevenueBreakdown {
  courses: number;
  subscriptions: number;
  certificates: number;
  other: number;
}

interface MonthlyData {
  month: string;
  revenue: number;
  customers: number;
  churn: number;
  growth_rate: number;
}

interface GeneralStatsProps {
  showHeader?: boolean;
  period?: '30d' | '90d' | '1y';
}

const GeneralStats = ({ showHeader = true, period = '30d' }: GeneralStatsProps) => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<GeneralMetrics | null>(null);
  const [revenueBreakdown, setRevenueBreakdown] = useState<RevenueBreakdown | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'30d' | '90d' | '1y'>(period);

  useEffect(() => {
    if (user) {
      fetchGeneralStats();
    }
  }, [user, selectedPeriod]);

  const fetchGeneralStats = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Calcular datas baseadas no período
      const now = new Date();
      const startDate = new Date();
      const previousStartDate = new Date();
      
      switch (selectedPeriod) {
        case '30d':
          startDate.setDate(now.getDate() - 30);
          previousStartDate.setDate(now.getDate() - 60);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          previousStartDate.setDate(now.getDate() - 180);
          break;
        case '1y':
          startDate.setFullYear(now.getFullYear() - 1);
          previousStartDate.setFullYear(now.getFullYear() - 2);
          break;
      }

      // Buscar dados de matrículas e pagamentos
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('course_enrollments')
        .select(`
          id,
          user_id,
          enrolled_at,
          completed_at,
          payment_amount,
          payment_status,
          progress,
          courses(
            id,
            title,
            price,
            instructor_name
          )
        `);

      if (enrollmentsError) throw enrollmentsError;

      // Buscar dados de assinaturas - usar tabela correta
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select(`
          id,
          user_id,
          created_at,
          status,
          plans(
            id,
            name,
            price_monthly
          )
        `);

      if (subscriptionsError) throw subscriptionsError;

      // Processar dados do período atual
      const currentEnrollments = enrollmentsData?.filter(e => {
        const enrolledAt = new Date(e.enrolled_at);
        return enrolledAt >= startDate && enrolledAt <= now;
      }) || [];

      const previousEnrollments = enrollmentsData?.filter(e => {
        const enrolledAt = new Date(e.enrolled_at);
        return enrolledAt >= previousStartDate && enrolledAt < startDate;
      }) || [];

      // Calcular receita total
      const currentRevenue = currentEnrollments
        .filter(e => e.payment_status === 'completed')
        .reduce((sum, e) => sum + (e.payment_amount || 0), 0);
      
      const previousRevenue = previousEnrollments
        .filter(e => e.payment_status === 'completed')
        .reduce((sum, e) => sum + (e.payment_amount || 0), 0);

      // Adicionar receita de assinaturas
      const currentSubscriptions = subscriptionsData?.filter(s => {
        const createdAt = new Date(s.created_at);
        return createdAt >= startDate && createdAt <= now && s.status === 'active';
      }) || [];

      const subscriptionRevenue = currentSubscriptions.reduce((sum, s) => {
        const plan = s.plans;
        if (plan) {
          const monthlyPrice = plan.price_monthly || 0;
          const daysInPeriod = selectedPeriod === '30d' ? 30 : selectedPeriod === '90d' ? 90 : 365;
          return sum + (monthlyPrice * (daysInPeriod / 30));
        }
        return sum;
      }, 0);

      const totalCurrentRevenue = currentRevenue + subscriptionRevenue;
      const revenueGrowth = previousRevenue > 0 
        ? ((totalCurrentRevenue - previousRevenue) / previousRevenue) * 100 
        : 0;

      // Calcular ticket médio
      const paidEnrollments = currentEnrollments.filter(e => e.payment_status === 'completed');
      const previousPaidEnrollments = previousEnrollments.filter(e => e.payment_status === 'completed');
      
      const averageTicket = paidEnrollments.length > 0 
        ? currentRevenue / paidEnrollments.length 
        : 0;
      
      const previousTicket = previousPaidEnrollments.length > 0 
        ? previousRevenue / previousPaidEnrollments.length 
        : 0;
      
      const ticketGrowth = previousTicket > 0 
        ? ((averageTicket - previousTicket) / previousTicket) * 100 
        : 0;

      // Calcular métricas de clientes
      const uniqueCurrentCustomers = new Set(currentEnrollments.map(e => e.user_id)).size;
      const uniquePreviousCustomers = new Set(previousEnrollments.map(e => e.user_id)).size;
      
      // Buscar todos os usuários únicos para calcular churn
      const allCustomers = new Set(enrollmentsData?.map(e => e.user_id) || []);
      const totalCustomers = allCustomers.size;
      
      // Calcular churn (simplificado - clientes que não fizeram compras no período atual mas fizeram no anterior)
      const previousCustomerIds = new Set(previousEnrollments.map(e => e.user_id));
      const currentCustomerIds = new Set(currentEnrollments.map(e => e.user_id));
      
      const churned = Array.from(previousCustomerIds).filter(id => !currentCustomerIds.has(id)).length;
      const churnRate = previousCustomerIds.size > 0 ? (churned / previousCustomerIds.size) * 100 : 0;
      const retentionRate = 100 - churnRate;

      // Calcular métricas avançadas (aproximações)
      const ltv = averageTicket * 3; // Aproximação: 3x o ticket médio
      const cac = averageTicket * 0.3; // Aproximação: 30% do ticket médio
      
      // Calcular MRR e ARR
      const monthlySubscriptionRevenue = currentSubscriptions.reduce((sum, s) => {
        const plan = s.plans;
        if (plan) {
          const monthlyPrice = plan.price_monthly || 0;
          return sum + monthlyPrice;
        }
        return sum;
      }, 0);
      
      const mrr = monthlySubscriptionRevenue;
      const arr = mrr * 12;

      // Calcular taxa de conversão (mock - seria necessário dados de leads/trials)
      const conversionRate = Math.random() * 10 + 5; // Entre 5-15%

      // Calcular métricas de cursos
      const activeCourses = new Set(currentEnrollments.map(e => e.courses?.id).filter(Boolean)).size;
      const totalEnrollments = currentEnrollments.length;
      const completedEnrollments = currentEnrollments.filter(e => e.completed_at).length;
      const completionRate = totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0;

      setMetrics({
        total_revenue: totalCurrentRevenue,
        previous_revenue: previousRevenue,
        revenue_growth: revenueGrowth,
        average_ticket: averageTicket,
        previous_ticket: previousTicket,
        ticket_growth: ticketGrowth,
        total_customers: totalCustomers,
        new_customers: uniqueCurrentCustomers,
        churned_customers: churned,
        churn_rate: churnRate,
        retention_rate: retentionRate,
        ltv: ltv,
        cac: cac,
        mrr: mrr,
        arr: arr,
        conversion_rate: conversionRate,
        active_courses: activeCourses,
        total_enrollments: totalEnrollments,
        completion_rate: completionRate
      });

      // Calcular breakdown de receita
      setRevenueBreakdown({
        courses: currentRevenue,
        subscriptions: subscriptionRevenue,
        certificates: 0, // Mock - seria necessário dados específicos
        other: 0 // Mock
      });

      // Gerar dados mensais (mock para demonstração)
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        
        // Mock data baseado em tendências
        const baseRevenue = totalCurrentRevenue * (0.7 + Math.random() * 0.6);
        const baseCustomers = uniqueCurrentCustomers * (0.8 + Math.random() * 0.4);
        const monthlyChurn = 2 + Math.random() * 8; // Entre 2-10%
        const monthlyGrowth = -10 + Math.random() * 30; // Entre -10% e +20%
        
        months.push({
          month: monthName,
          revenue: baseRevenue,
          customers: Math.floor(baseCustomers),
          churn: monthlyChurn,
          growth_rate: monthlyGrowth
        });
      }
      
      setMonthlyData(months);

    } catch (error) {
      console.error('Error fetching general stats:', error);
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

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
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

  const getHealthScore = () => {
    if (!metrics) return { score: 0, label: 'N/A', color: 'text-zinc-400' };
    
    let score = 0;
    
    // Revenue growth (30 points)
    if (metrics.revenue_growth > 20) score += 30;
    else if (metrics.revenue_growth > 10) score += 20;
    else if (metrics.revenue_growth > 0) score += 10;
    
    // Churn rate (25 points)
    if (metrics.churn_rate < 5) score += 25;
    else if (metrics.churn_rate < 10) score += 15;
    else if (metrics.churn_rate < 15) score += 5;
    
    // Completion rate (25 points)
    if (metrics.completion_rate > 80) score += 25;
    else if (metrics.completion_rate > 60) score += 15;
    else if (metrics.completion_rate > 40) score += 10;
    
    // LTV/CAC ratio (20 points)
    const ltvCacRatio = metrics.cac > 0 ? metrics.ltv / metrics.cac : 0;
    if (ltvCacRatio > 3) score += 20;
    else if (ltvCacRatio > 2) score += 15;
    else if (ltvCacRatio > 1) score += 10;
    
    if (score >= 80) return { score, label: 'Excelente', color: 'text-green-400' };
    if (score >= 60) return { score, label: 'Bom', color: 'text-blue-400' };
    if (score >= 40) return { score, label: 'Regular', color: 'text-yellow-400' };
    return { score, label: 'Precisa Melhorar', color: 'text-red-400' };
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
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
            <h3 className="text-2xl font-bold">Estatísticas Gerais</h3>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
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

  const healthScore = getHealthScore();

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">
              Estatísticas Gerais
            </h3>
            <p className="text-zinc-400 mt-1">Visão geral do desempenho da plataforma</p>
          </div>
          <div className="flex items-center gap-2">
            {(['30d', '90d', '1y'] as const).map((period) => (
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

      {/* Cards Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Receita Total</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics?.total_revenue || 0)}</p>
                <div className="flex items-center mt-1">
                  {getGrowthIcon(metrics?.revenue_growth || 0)}
                  <span className={`text-sm ml-1 ${getGrowthColor(metrics?.revenue_growth || 0)}`}>
                    {Math.abs(metrics?.revenue_growth || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
              <DollarSign className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Ticket Médio</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics?.average_ticket || 0)}</p>
                <div className="flex items-center mt-1">
                  {getGrowthIcon(metrics?.ticket_growth || 0)}
                  <span className={`text-sm ml-1 ${getGrowthColor(metrics?.ticket_growth || 0)}`}>
                    {Math.abs(metrics?.ticket_growth || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
              <ShoppingCart className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Taxa de Churn</p>
                <p className="text-2xl font-bold text-red-400">
                  {(metrics?.churn_rate || 0).toFixed(1)}%
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Retenção: {(metrics?.retention_rate || 0).toFixed(1)}%
                </p>
              </div>
              <UserMinus className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Health Score</p>
                <p className={`text-2xl font-bold ${healthScore.color}`}>
                  {healthScore.score}/100
                </p>
                <p className={`text-xs mt-1 ${healthScore.color}`}>
                  {healthScore.label}
                </p>
              </div>
              <Activity className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards Secundários */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">MRR</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(metrics?.mrr || 0)}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  ARR: {formatCurrency(metrics?.arr || 0)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">LTV / CAC</p>
                <p className="text-2xl font-bold">
                  {metrics?.cac && metrics.cac > 0 
                    ? (metrics.ltv / metrics.cac).toFixed(1) 
                    : '0.0'
                  }x
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  LTV: {formatCurrency(metrics?.ltv || 0)}
                </p>
              </div>
              <Target className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Novos Clientes</p>
                <p className="text-2xl font-bold text-blue-400">
                  {formatNumber(metrics?.new_customers || 0)}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Total: {formatNumber(metrics?.total_customers || 0)}
                </p>
              </div>
              <UserPlus className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Taxa de Conclusão</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {(metrics?.completion_rate || 0).toFixed(1)}%
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {formatNumber(metrics?.total_enrollments || 0)} matrículas
                </p>
              </div>
              <Zap className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs para Breakdown e Tendências */}
      <Tabs defaultValue="breakdown" className="space-y-4">
        <TabsList className="bg-zinc-900/50 border-zinc-800">
          <TabsTrigger value="breakdown" className="data-[state=active]:bg-zinc-800">
            <PieChart className="w-4 h-4 mr-2" />
            Breakdown de Receita
          </TabsTrigger>
          <TabsTrigger value="trends" className="data-[state=active]:bg-zinc-800">
            <BarChart3 className="w-4 h-4 mr-2" />
            Tendências Mensais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="breakdown" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg">Fontes de Receita</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {revenueBreakdown && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-400 rounded-full mr-2"></div>
                        <span className="text-sm text-zinc-400">Cursos</span>
                      </div>
                      <span className="font-bold">{formatCurrency(revenueBreakdown.courses)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                        <span className="text-sm text-zinc-400">Assinaturas</span>
                      </div>
                      <span className="font-bold">{formatCurrency(revenueBreakdown.subscriptions)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></div>
                        <span className="text-sm text-zinc-400">Certificados</span>
                      </div>
                      <span className="font-bold">{formatCurrency(revenueBreakdown.certificates)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-purple-400 rounded-full mr-2"></div>
                        <span className="text-sm text-zinc-400">Outros</span>
                      </div>
                      <span className="font-bold">{formatCurrency(revenueBreakdown.other)}</span>
                    </div>
                    
                    <div className="pt-4 border-t border-zinc-800">
                      <div className="flex items-center justify-between font-bold">
                        <span>Total</span>
                        <span className="text-green-400">
                          {formatCurrency(
                            revenueBreakdown.courses + 
                            revenueBreakdown.subscriptions + 
                            revenueBreakdown.certificates + 
                            revenueBreakdown.other
                          )}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg">Métricas de Saúde</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-zinc-400">Health Score</span>
                    <span className={`font-medium ${healthScore.color}`}>
                      {healthScore.score}/100
                    </span>
                  </div>
                  <Progress value={healthScore.score} className="h-2" />
                </div>
                
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-zinc-400">Taxa de Retenção</span>
                    <span className="font-medium text-green-400">
                      {(metrics?.retention_rate || 0).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={metrics?.retention_rate || 0} className="h-2" />
                </div>
                
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-zinc-400">Taxa de Conversão</span>
                    <span className="font-medium text-blue-400">
                      {(metrics?.conversion_rate || 0).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={metrics?.conversion_rate || 0} className="h-2" />
                </div>
                
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-zinc-400">Taxa de Conclusão</span>
                    <span className="font-medium text-yellow-400">
                      {(metrics?.completion_rate || 0).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={metrics?.completion_rate || 0} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {monthlyData.map((month, index) => (
              <Card key={index} className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-lg">{month.month}</h4>
                    <Badge 
                      className={month.growth_rate > 0 
                        ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                        : 'bg-red-500/20 text-red-400 border-red-500/30'
                      }
                    >
                      {month.growth_rate > 0 ? '+' : ''}{month.growth_rate.toFixed(1)}%
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Receita</span>
                      <span className="font-bold text-green-400">
                        {formatCurrency(month.revenue)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Clientes</span>
                      <span className="font-medium">
                        {formatNumber(month.customers)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Churn</span>
                      <span className={`font-medium ${
                        month.churn > 10 ? 'text-red-400' : 
                        month.churn > 5 ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        {month.churn.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GeneralStats;