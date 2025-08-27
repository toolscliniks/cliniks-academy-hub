import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Calendar, TrendingUp, TrendingDown, X, RotateCcw, Users, Package } from 'lucide-react';

interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  starts_at: string;
  ends_at: string;
  plans: {
    name: string;
    price_monthly: number;
    price_yearly: number;
  };
  profiles: {
    full_name: string;
    email: string;
  };
}

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
}

const SubscriptionManagement = () => {
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [actionType, setActionType] = useState<'cancel' | 'change' | 'renew' | null>(null);
  const [selectedNewPlan, setSelectedNewPlan] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
    fetchPlans();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plans(name, price_monthly, price_yearly),
          profiles(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error: any) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly');

      if (error) throw error;
      setPlans(data || []);
    } catch (error: any) {
      console.error('Error fetching plans:', error);
    }
  };

  const handleAction = (subscription: Subscription, action: 'cancel' | 'change' | 'renew') => {
    setSelectedSubscription(subscription);
    setActionType(action);
    setIsDialogOpen(true);
    setSelectedNewPlan('');
  };

  const executeAction = async () => {
    if (!selectedSubscription || !actionType) return;

    try {
      setLoading(true);

      switch (actionType) {
        case 'cancel':
          await supabase
            .from('subscriptions')
            .update({ status: 'cancelled' })
            .eq('id', selectedSubscription.id);
          
          await supabase
            .from('subscription_changes')
            .insert({
              user_id: selectedSubscription.user_id,
              subscription_id: selectedSubscription.id,
              old_plan_id: selectedSubscription.plan_id,
              new_plan_id: null,
              change_type: 'cancel',
              effective_date: new Date().toISOString(),
              metadata: { cancelled_by: 'admin' }
            });
          break;

        case 'change':
          if (!selectedNewPlan) {
            toast({
              title: "Erro",
              description: "Selecione um novo plano",
              variant: "destructive"
            });
            return;
          }

          await supabase
            .from('subscriptions')
            .update({ plan_id: selectedNewPlan })
            .eq('id', selectedSubscription.id);

          await supabase
            .from('subscription_changes')
            .insert({
              user_id: selectedSubscription.user_id,
              subscription_id: selectedSubscription.id,
              old_plan_id: selectedSubscription.plan_id,
              new_plan_id: selectedNewPlan,
              change_type: 'change',
              effective_date: new Date().toISOString(),
              metadata: { changed_by: 'admin' }
            });
          break;

        case 'renew':
          const newEndDate = new Date();
          newEndDate.setMonth(newEndDate.getMonth() + 1);

          await supabase
            .from('subscriptions')
            .update({ 
              ends_at: newEndDate.toISOString(),
              status: 'active'
            })
            .eq('id', selectedSubscription.id);

          await supabase
            .from('subscription_changes')
            .insert({
              user_id: selectedSubscription.user_id,
              subscription_id: selectedSubscription.id,
              old_plan_id: selectedSubscription.plan_id,
              new_plan_id: selectedSubscription.plan_id,
              change_type: 'renew',
              effective_date: new Date().toISOString(),
              metadata: { renewed_by: 'admin' }
            });
          break;
      }

      toast({
        title: "Ação executada",
        description: `Assinatura ${actionType === 'cancel' ? 'cancelada' : 
                                   actionType === 'change' ? 'alterada' : 'renovada'} com sucesso`
      });

      setIsDialogOpen(false);
      fetchSubscriptions();

    } catch (error: any) {
      toast({
        title: "Erro ao executar ação",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'cancelled':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativa';
      case 'cancelled':
        return 'Cancelada';
      case 'pending':
        return 'Pendente';
      default:
        return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return <div className="text-center py-8">Carregando assinaturas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Gestão de Assinaturas</h2>
          <p className="text-muted-foreground">Gerencie assinaturas de usuários</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{subscriptions.length}</p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ativas</p>
                <p className="text-2xl font-bold text-green-600">
                  {subscriptions.filter(s => s.status === 'active').length}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Canceladas</p>
                <p className="text-2xl font-bold text-red-600">
                  {subscriptions.filter(s => s.status === 'cancelled').length}
                </p>
              </div>
              <X className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receita Mensal</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    subscriptions
                      .filter(s => s.status === 'active')
                      .reduce((acc, s) => acc + (s.plans?.price_monthly || 0), 0)
                  )}
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions List */}
      <div className="space-y-4">
        {subscriptions.map((subscription) => (
          <Card key={subscription.id} className="bg-gradient-card border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div>
                    <CardTitle className="text-lg">
                      {subscription.profiles?.full_name || 'Nome não informado'}
                    </CardTitle>
                    <CardDescription>
                      {subscription.profiles?.email}
                    </CardDescription>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Badge variant={getStatusColor(subscription.status)}>
                    {getStatusText(subscription.status)}
                  </Badge>
                  
                  {subscription.status === 'active' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAction(subscription, 'change')}
                      >
                        <TrendingUp className="w-4 h-4 mr-1" />
                        Alterar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAction(subscription, 'renew')}
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Renovar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleAction(subscription, 'cancel')}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancelar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Plano</p>
                  <p className="font-semibold">{subscription.plans?.name}</p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Valor Mensal</p>
                  <p className="font-semibold">
                    {formatCurrency(subscription.plans?.price_monthly || 0)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Início</p>
                  <p className="font-semibold">{formatDate(subscription.starts_at)}</p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Vencimento</p>
                  <p className="font-semibold">
                    {subscription.ends_at ? formatDate(subscription.ends_at) : 'Indefinido'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {subscriptions.length === 0 && (
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma assinatura encontrada</h3>
            <p className="text-muted-foreground">
              Ainda não há assinaturas ativas no sistema
            </p>
          </CardContent>
        </Card>
      )}

      {/* Action Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'cancel' && 'Cancelar Assinatura'}
              {actionType === 'change' && 'Alterar Plano'}
              {actionType === 'renew' && 'Renovar Assinatura'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'cancel' && 'Esta ação irá cancelar a assinatura do usuário.'}
              {actionType === 'change' && 'Selecione o novo plano para o usuário.'}
              {actionType === 'renew' && 'Esta ação irá renovar a assinatura por mais um mês.'}
            </DialogDescription>
          </DialogHeader>
          
          {actionType === 'change' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Novo Plano</label>
              <Select value={selectedNewPlan} onValueChange={setSelectedNewPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano..." />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - {formatCurrency(plan.price_monthly)}/mês
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={executeAction}
              variant={actionType === 'cancel' ? 'destructive' : 'default'}
            >
              {actionType === 'cancel' && 'Confirmar Cancelamento'}
              {actionType === 'change' && 'Alterar Plano'}
              {actionType === 'renew' && 'Confirmar Renovação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionManagement;