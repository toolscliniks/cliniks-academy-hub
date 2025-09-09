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
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Percent,
  Target
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  billing_cycle: 'monthly' | 'yearly';
  active_subscriptions: number;
  mrr_contribution: number;
  churn_rate: number;
  conversion_rate: number;
}

interface MRRData {
  current_mrr: number;
  previous_mrr: number;
  growth_rate: number;
  new_mrr: number;
  churned_mrr: number;
  expansion_mrr: number;
  contraction_mrr: number;
}

interface RevenueShare {
  instructor_id: string;
  instructor_name: string;
  total_revenue: number;
  instructor_share: number;
  platform_share: number;
  share_percentage: number;
  active_subscriptions: number;
}

interface SubscriptionStatsProps {
  showHeader?: boolean;
}

const SubscriptionStats = ({ showHeader = true }: SubscriptionStatsProps) => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [mrrData, setMrrData] = useState<MRRData | null>(null);
  const [revenueShares, setRevenueShares] = useState<RevenueShare[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSubscriptionData();
    }
  }, [user]);

  const fetchSubscriptionData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Buscar planos de assinatura
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select(`
          id,
          name,
          price,
          billing_cycle,
          user_subscriptions!inner(
            id,
            status,
            created_at,
            cancelled_at
          )
        `);

      if (plansError) throw plansError;

      // Processar dados dos planos
      const currentDate = new Date();
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const processedPlans: SubscriptionPlan[] = [];
      let totalCurrentMRR = 0;
      let totalPreviousMRR = 0;

      plansData?.forEach(plan => {
        const subscriptions = plan.user_subscriptions || [];
        
        // Assinaturas ativas
        const activeSubscriptions = subscriptions.filter(sub => 
          sub.status === 'active' && !sub.cancelled_at
        ).length;
        
        // Assinaturas ativas no mês anterior
        const previousActiveSubscriptions = subscriptions.filter(sub => {
          const createdAt = new Date(sub.created_at);
          const cancelledAt = sub.cancelled_at ? new Date(sub.cancelled_at) : null;
          
          return createdAt <= lastMonth && 
                 (!cancelledAt || cancelledAt > lastMonth) &&
                 sub.status === 'active';
        }).length;

        // Calcular MRR (normalizar para mensal)
        const monthlyPrice = plan.billing_cycle === 'yearly' ? plan.price / 12 : plan.price;
        const mrrContribution = activeSubscriptions * monthlyPrice;
        const previousMrrContribution = previousActiveSubscriptions * monthlyPrice;
        
        totalCurrentMRR += mrrContribution;
        totalPreviousMRR += previousMrrContribution;

        // Calcular churn rate (simplificado)
        const churnedSubscriptions = subscriptions.filter(sub => {
          const cancelledAt = sub.cancelled_at ? new Date(sub.cancelled_at) : null;
          return cancelledAt && cancelledAt >= lastMonth && cancelledAt <= currentDate;
        }).length;
        
        const churnRate = previousActiveSubscriptions > 0 
          ? (churnedSubscriptions / previousActiveSubscriptions) * 100 
          : 0;

        // Calcular conversion rate (mock - seria necessário dados de trials/leads)
        const conversionRate = Math.random() * 15 + 5; // Mock entre 5-20%

        processedPlans.push({
          id: plan.id,
          name: plan.name,
          price: plan.price,
          billing_cycle: plan.billing_cycle,
          active_subscriptions: activeSubscriptions,
          mrr_contribution: mrrContribution,
          churn_rate: churnRate,
          conversion_rate: conversionRate
        });
      });

      setPlans(processedPlans);

      // Calcular dados de MRR
      const mrrGrowthRate = totalPreviousMRR > 0 
        ? ((totalCurrentMRR - totalPreviousMRR) / totalPreviousMRR) * 100 
        : 0;

      // Mock para componentes de MRR (seria necessário tracking mais detalhado)
      const newMRR = totalCurrentMRR * 0.15; // 15% de novo MRR
      const churned_MRR = totalCurrentMRR * 0.05; // 5% de churn MRR
      const expansion_MRR = totalCurrentMRR * 0.08; // 8% de expansão
      const contraction_MRR = totalCurrentMRR * 0.03; // 3% de contração

      setMrrData({
        current_mrr: totalCurrentMRR,
        previous_mrr: totalPreviousMRR,
        growth_rate: mrrGrowthRate,
        new_mrr: newMRR,
        churned_mrr: churned_MRR,
        expansion_mrr: expansion_MRR,
        contraction_mrr: contraction_MRR
      });

      // Buscar dados de revenue share por instrutor
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select(`
          id,
          instructor_name,
          price,
          course_enrollments!inner(
            id,
            payment_amount,
            payment_status
          )
        `)
        .eq('course_enrollments.payment_status', 'completed');

      if (coursesError) throw coursesError;

      // Processar revenue share
      const instructorMap = new Map<string, RevenueShare>();
      
      coursesData?.forEach(course => {
        const instructorName = course.instructor_name || 'Instrutor Desconhecido';
        const enrollments = course.course_enrollments || [];
        const totalRevenue = enrollments.reduce((sum, enrollment) => 
          sum + (enrollment.payment_amount || 0), 0
        );
        
        if (!instructorMap.has(instructorName)) {
          instructorMap.set(instructorName, {
            instructor_id: instructorName.toLowerCase().replace(/\s+/g, '_'),
            instructor_name: instructorName,
            total_revenue: 0,
            instructor_share: 0,
            platform_share: 0,
            share_percentage: 70, // 70% para o instrutor
            active_subscriptions: 0
          });
        }
        
        const instructor = instructorMap.get(instructorName)!;
        instructor.total_revenue += totalRevenue;
        instructor.instructor_share += totalRevenue * 0.7; // 70% para instrutor
        instructor.platform_share += totalRevenue * 0.3; // 30% para plataforma
        instructor.active_subscriptions += enrollments.length;
      });

      const sortedRevenueShares = Array.from(instructorMap.values())
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 10);
      
      setRevenueShares(sortedRevenueShares);

    } catch (error) {
      console.error('Error fetching subscription data:', error);
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

  const getBillingCycleLabel = (cycle: string) => {
    return cycle === 'monthly' ? 'Mensal' : 'Anual';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {showHeader && (
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold">Estatísticas de Assinaturas</h3>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
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
              Estatísticas de Assinaturas
            </h3>
            <p className="text-zinc-400 mt-1">Acompanhe o desempenho dos planos de assinatura</p>
          </div>
        </div>
      )}

      {/* Cards de MRR */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">MRR Atual</p>
                <p className="text-2xl font-bold">{formatCurrency(mrrData?.current_mrr || 0)}</p>
                <div className="flex items-center mt-1">
                  {getGrowthIcon(mrrData?.growth_rate || 0)}
                  <span className={`text-sm ml-1 ${getGrowthColor(mrrData?.growth_rate || 0)}`}>
                    {Math.abs(mrrData?.growth_rate || 0).toFixed(1)}%
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
                <p className="text-sm font-medium text-zinc-400">Novo MRR</p>
                <p className="text-2xl font-bold text-green-400">
                  +{formatCurrency(mrrData?.new_mrr || 0)}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Novas assinaturas
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
                <p className="text-sm font-medium text-zinc-400">MRR Perdido</p>
                <p className="text-2xl font-bold text-red-400">
                  -{formatCurrency(mrrData?.churned_mrr || 0)}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Cancelamentos
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Assinantes Ativos</p>
                <p className="text-2xl font-bold">
                  {plans.reduce((sum, plan) => sum + plan.active_subscriptions, 0)}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Total de usuários
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs para Planos e Revenue Share */}
      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList className="bg-zinc-900/50 border-zinc-800">
          <TabsTrigger value="plans" className="data-[state=active]:bg-zinc-800">
            <CreditCard className="w-4 h-4 mr-2" />
            Planos de Assinatura
          </TabsTrigger>
          <TabsTrigger value="revenue" className="data-[state=active]:bg-zinc-800">
            <Percent className="w-4 h-4 mr-2" />
            Revenue Share
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.length > 0 ? (
              plans.map((plan) => (
                <Card key={plan.id} className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <Badge variant="secondary">
                        {getBillingCycleLabel(plan.billing_cycle)}
                      </Badge>
                    </div>
                    <p className="text-2xl font-bold text-green-400">
                      {formatCurrency(plan.price)}
                      <span className="text-sm text-zinc-400 ml-1">
                        /{plan.billing_cycle === 'monthly' ? 'mês' : 'ano'}
                      </span>
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                        <div className="flex items-center justify-center mb-1">
                          <Users className="w-4 h-4 text-blue-400 mr-1" />
                          <span className="text-lg font-bold text-blue-400">
                            {plan.active_subscriptions}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400">Assinantes</p>
                      </div>
                      <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                        <div className="flex items-center justify-center mb-1">
                          <DollarSign className="w-4 h-4 text-green-400 mr-1" />
                          <span className="text-lg font-bold text-green-400">
                            {formatCurrency(plan.mrr_contribution).replace('R$', '').trim()}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400">MRR</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-zinc-400">Taxa de Churn</span>
                          <span className={`font-medium ${
                            plan.churn_rate > 10 ? 'text-red-400' : 
                            plan.churn_rate > 5 ? 'text-yellow-400' : 'text-green-400'
                          }`}>
                            {plan.churn_rate.toFixed(1)}%
                          </span>
                        </div>
                        <Progress 
                          value={Math.min(plan.churn_rate, 20)} 
                          className="h-2"
                        />
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-zinc-400">Conversão</span>
                          <span className="font-medium text-blue-400">
                            {plan.conversion_rate.toFixed(1)}%
                          </span>
                        </div>
                        <Progress 
                          value={plan.conversion_rate} 
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
                  <CreditCard className="w-12 h-12 text-zinc-600 mb-4" />
                  <h3 className="text-lg font-semibold text-zinc-300 mb-2">Nenhum plano encontrado</h3>
                  <p className="text-zinc-500 text-center max-w-md">
                    Configure planos de assinatura para ver as estatísticas aqui.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {revenueShares.length > 0 ? (
              revenueShares.map((instructor, index) => (
                <Card key={instructor.instructor_id} className="bg-zinc-900/50 border-zinc-800">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-lg">{instructor.instructor_name}</h4>
                        <p className="text-sm text-zinc-400">
                          #{index + 1} • {instructor.active_subscriptions} vendas
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {instructor.share_percentage}%
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Receita Total</span>
                        <span className="font-bold">
                          {formatCurrency(instructor.total_revenue)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Share do Instrutor</span>
                        <span className="font-bold text-green-400">
                          {formatCurrency(instructor.instructor_share)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Share da Plataforma</span>
                        <span className="font-bold text-blue-400">
                          {formatCurrency(instructor.platform_share)}
                        </span>
                      </div>
                      
                      <div className="pt-2 border-t border-zinc-800">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-500">Distribuição</span>
                        </div>
                        <div className="flex mt-2">
                          <div 
                            className="bg-green-400 h-2 rounded-l"
                            style={{ width: `${instructor.share_percentage}%` }}
                          />
                          <div 
                            className="bg-blue-400 h-2 rounded-r"
                            style={{ width: `${100 - instructor.share_percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="bg-zinc-900/50 border-zinc-800 col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Percent className="w-12 h-12 text-zinc-600 mb-4" />
                  <h3 className="text-lg font-semibold text-zinc-300 mb-2">Nenhum dado de revenue share</h3>
                  <p className="text-zinc-500 text-center max-w-md">
                    Os dados de participação na receita aparecerão aqui quando houver vendas registradas.
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

export default SubscriptionStats;