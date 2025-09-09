import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  Calendar,
  Eye,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';

interface SalesSummary {
  total_sales: number;
  gross_revenue: number;
  net_revenue: number;
  avg_order_value: number;
  growth_rate: number;
  period_comparison: {
    sales_change: number;
    revenue_change: number;
  };
}

interface SalesHistoryItem {
  date: string;
  sales_count: number;
  gross_revenue: number;
  net_revenue: number;
  course_title?: string;
  course_id?: string;
}

interface TopSellingCourse {
  course_id: string;
  course_title: string;
  sales_count: number;
  revenue: number;
  thumbnail_url?: string;
}

interface SalesStatsProps {
  period?: '7d' | '30d' | '90d' | '1y';
  showHeader?: boolean;
}

const SalesStats = ({ period = '30d', showHeader = true }: SalesStatsProps) => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [history, setHistory] = useState<SalesHistoryItem[]>([]);
  const [topCourses, setTopCourses] = useState<TopSellingCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(period);

  useEffect(() => {
    if (user) {
      fetchSalesData();
    }
  }, [user, selectedPeriod]);

  const getPeriodDays = (period: string) => {
    switch (period) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      case '1y': return 365;
      default: return 30;
    }
  };

  const fetchSalesData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const days = getPeriodDays(selectedPeriod);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const previousStartDate = new Date();
      previousStartDate.setDate(previousStartDate.getDate() - (days * 2));
      const previousEndDate = new Date();
      previousEndDate.setDate(previousEndDate.getDate() - days);

      // Buscar dados de vendas (enrollments pagos)
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('course_enrollments')
        .select(`
          id,
          enrolled_at,
          course_id,
          payment_amount,
          payment_status,
          courses!inner(
            id,
            title,
            price,
            thumbnail_url
          )
        `)
        .eq('payment_status', 'completed')
        .gte('enrolled_at', startDate.toISOString())
        .order('enrolled_at', { ascending: false });

      if (enrollmentsError) throw enrollmentsError;

      // Buscar dados do período anterior para comparação
      const { data: previousEnrollmentsData, error: previousError } = await supabase
        .from('course_enrollments')
        .select(`
          id,
          enrolled_at,
          payment_amount
        `)
        .eq('payment_status', 'completed')
        .gte('enrolled_at', previousStartDate.toISOString())
        .lt('enrolled_at', previousEndDate.toISOString());

      if (previousError) throw previousError;

      // Processar dados atuais
      const currentSales = enrollmentsData || [];
      const totalSales = currentSales.length;
      const grossRevenue = currentSales.reduce((sum, sale) => sum + (sale.payment_amount || 0), 0);
      
      // Assumindo taxa de processamento de 5% + R$ 0.39 por transação
      const processingFees = currentSales.reduce((sum, sale) => {
        const amount = sale.payment_amount || 0;
        return sum + (amount * 0.05) + 0.39;
      }, 0);
      const netRevenue = grossRevenue - processingFees;
      
      const avgOrderValue = totalSales > 0 ? grossRevenue / totalSales : 0;

      // Processar dados do período anterior
      const previousSales = previousEnrollmentsData || [];
      const previousTotalSales = previousSales.length;
      const previousGrossRevenue = previousSales.reduce((sum, sale) => sum + (sale.payment_amount || 0), 0);

      // Calcular taxas de crescimento
      const salesGrowth = previousTotalSales > 0 
        ? ((totalSales - previousTotalSales) / previousTotalSales) * 100 
        : 0;
      const revenueGrowth = previousGrossRevenue > 0 
        ? ((grossRevenue - previousGrossRevenue) / previousGrossRevenue) * 100 
        : 0;

      setSummary({
        total_sales: totalSales,
        gross_revenue: grossRevenue,
        net_revenue: netRevenue,
        avg_order_value: avgOrderValue,
        growth_rate: revenueGrowth,
        period_comparison: {
          sales_change: salesGrowth,
          revenue_change: revenueGrowth
        }
      });

      // Processar histórico diário
      const historyMap = new Map<string, SalesHistoryItem>();
      currentSales.forEach(sale => {
        const date = new Date(sale.enrolled_at).toISOString().split('T')[0];
        if (!historyMap.has(date)) {
          historyMap.set(date, {
            date,
            sales_count: 0,
            gross_revenue: 0,
            net_revenue: 0
          });
        }
        const item = historyMap.get(date)!;
        item.sales_count += 1;
        item.gross_revenue += sale.payment_amount || 0;
        const fee = (sale.payment_amount || 0) * 0.05 + 0.39;
        item.net_revenue += (sale.payment_amount || 0) - fee;
      });

      const sortedHistory = Array.from(historyMap.values())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 30);
      
      setHistory(sortedHistory);

      // Processar cursos mais vendidos
      const courseMap = new Map<string, TopSellingCourse>();
      currentSales.forEach(sale => {
        const courseId = sale.course_id;
        if (!courseMap.has(courseId)) {
          courseMap.set(courseId, {
            course_id: courseId,
            course_title: sale.courses.title,
            sales_count: 0,
            revenue: 0,
            thumbnail_url: sale.courses.thumbnail_url
          });
        }
        const course = courseMap.get(courseId)!;
        course.sales_count += 1;
        course.revenue += sale.payment_amount || 0;
      });

      const sortedTopCourses = Array.from(courseMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
      
      setTopCourses(sortedTopCourses);

    } catch (error) {
      console.error('Error fetching sales data:', error);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    });
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

  if (loading) {
    return (
      <div className="space-y-6">
        {showHeader && (
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold">Estatísticas de Vendas</h3>
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
              Estatísticas de Vendas
            </h3>
            <p className="text-zinc-400 mt-1">Acompanhe o desempenho das suas vendas</p>
          </div>
          <div className="flex gap-2">
            {['7d', '30d', '90d', '1y'].map((p) => (
              <Button
                key={p}
                variant={selectedPeriod === p ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod(p as any)}
                className="text-xs"
              >
                {p === '7d' && '7 dias'}
                {p === '30d' && '30 dias'}
                {p === '90d' && '90 dias'}
                {p === '1y' && '1 ano'}
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
                <p className="text-sm font-medium text-zinc-400">Total de Vendas</p>
                <p className="text-2xl font-bold">{summary?.total_sales || 0}</p>
                <div className="flex items-center mt-1">
                  {getGrowthIcon(summary?.period_comparison.sales_change || 0)}
                  <span className={`text-sm ml-1 ${getGrowthColor(summary?.period_comparison.sales_change || 0)}`}>
                    {Math.abs(summary?.period_comparison.sales_change || 0).toFixed(1)}%
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
                <p className="text-sm font-medium text-zinc-400">Receita Bruta</p>
                <p className="text-2xl font-bold">{formatCurrency(summary?.gross_revenue || 0)}</p>
                <div className="flex items-center mt-1">
                  {getGrowthIcon(summary?.period_comparison.revenue_change || 0)}
                  <span className={`text-sm ml-1 ${getGrowthColor(summary?.period_comparison.revenue_change || 0)}`}>
                    {Math.abs(summary?.period_comparison.revenue_change || 0).toFixed(1)}%
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
                <p className="text-sm font-medium text-zinc-400">Receita Líquida</p>
                <p className="text-2xl font-bold">{formatCurrency(summary?.net_revenue || 0)}</p>
                <p className="text-xs text-zinc-500 mt-1">
                  -{formatCurrency((summary?.gross_revenue || 0) - (summary?.net_revenue || 0))} taxas
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Ticket Médio</p>
                <p className="text-2xl font-bold">{formatCurrency(summary?.avg_order_value || 0)}</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Por venda
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs para Histórico e Top Cursos */}
      <Tabs defaultValue="history" className="space-y-4">
        <TabsList className="bg-zinc-900/50 border-zinc-800">
          <TabsTrigger value="history" className="data-[state=active]:bg-zinc-800">
            <Calendar className="w-4 h-4 mr-2" />
            Histórico de Vendas
          </TabsTrigger>
          <TabsTrigger value="courses" className="data-[state=active]:bg-zinc-800">
            <PieChart className="w-4 h-4 mr-2" />
            Cursos Mais Vendidos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-lg">Histórico Diário</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length > 0 ? (
                <div className="space-y-3">
                  {history.slice(0, 10).map((item) => (
                    <div key={item.date} className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg">
                      <div>
                        <p className="font-medium">{formatDate(item.date)}</p>
                        <p className="text-sm text-zinc-400">{item.sales_count} vendas</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(item.gross_revenue)}</p>
                        <p className="text-sm text-zinc-400">
                          Líquido: {formatCurrency(item.net_revenue)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                  <p className="text-zinc-400">Nenhuma venda registrada no período</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="courses" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topCourses.length > 0 ? (
              topCourses.map((course, index) => (
                <Card key={course.course_id} className="bg-zinc-900/50 border-zinc-800">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <Badge variant="secondary" className="text-xs">
                          #{index + 1}
                        </Badge>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold line-clamp-2 mb-2">
                          {course.course_title}
                        </h4>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-400">Vendas:</span>
                            <span className="font-medium">{course.sales_count}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-400">Receita:</span>
                            <span className="font-bold text-green-400">
                              {formatCurrency(course.revenue)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="bg-zinc-900/50 border-zinc-800 col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <PieChart className="w-12 h-12 text-zinc-600 mb-4" />
                  <h3 className="text-lg font-semibold text-zinc-300 mb-2">Nenhuma venda registrada</h3>
                  <p className="text-zinc-500 text-center max-w-md">
                    As estatísticas de vendas aparecerão aqui quando houver transações concluídas.
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

export default SalesStats;