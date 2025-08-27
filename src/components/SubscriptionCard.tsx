import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Calendar, TrendingUp, TrendingDown, X, RotateCcw, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
}

const SubscriptionCard = () => {
  const { subscription, loading, cancelSubscription, changePlan, renewSubscription } = useSubscription();
  const { toast } = useToast();
  
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedNewPlan, setSelectedNewPlan] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'cancel' | 'change' | 'renew'>('cancel');

  useEffect(() => {
    fetchPlans();
  }, []);

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
      year: 'numeric'
    });
  };

  const handleAction = (type: 'cancel' | 'change' | 'renew') => {
    setDialogType(type);
    setIsDialogOpen(true);
    setSelectedNewPlan('');
  };

  const executeAction = async () => {
    try {
      switch (dialogType) {
        case 'cancel':
          await cancelSubscription();
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
          const currentPrice = subscription?.plans?.price_monthly || 0;
          const newPlan = plans.find(p => p.id === selectedNewPlan);
          const newPrice = newPlan?.price_monthly || 0;
          const changeType = newPrice > currentPrice ? 'upgrade' : 'downgrade';
          await changePlan(selectedNewPlan, changeType);
          break;
        case 'renew':
          await renewSubscription();
          break;
      }
      setIsDialogOpen(false);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-card border-border/50">
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Carregando assinatura...</p>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            <span>Nenhuma Assinatura Ativa</span>
          </CardTitle>
          <CardDescription>
            Você não possui nenhuma assinatura ativa no momento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => window.location.href = '/plans'} className="w-full">
            Ver Planos Disponíveis
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isExpiringSoon = () => {
    if (!subscription.ends_at) return false;
    const endDate = new Date(subscription.ends_at);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  };

  const isExpired = () => {
    if (!subscription.ends_at) return false;
    return new Date(subscription.ends_at) < new Date();
  };

  return (
    <div className="space-y-4">
      {/* Main Subscription Card */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5" />
              <span>Minha Assinatura</span>
            </CardTitle>
            
            <Badge variant={subscription.status === 'active' ? 'default' : 'destructive'}>
              {subscription.status === 'active' ? 'Ativa' : 'Inativa'}
            </Badge>
          </div>
          <CardDescription>
            Gerencie sua assinatura e acesso aos cursos
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Plan Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Plano Atual</p>
              <p className="font-semibold text-lg">{subscription.plans?.name}</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Valor Mensal</p>
              <p className="font-semibold text-lg text-primary">
                {formatCurrency(subscription.plans?.price_monthly || 0)}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">
                {isExpired() ? 'Expirou em' : 'Válido até'}
              </p>
              <p className={`font-semibold ${isExpired() ? 'text-red-500' : isExpiringSoon() ? 'text-yellow-500' : 'text-green-500'}`}>
                {subscription.ends_at ? formatDate(subscription.ends_at) : 'Indefinido'}
              </p>
            </div>
          </div>

          {/* Expiry Warning */}
          {(isExpiringSoon() || isExpired()) && (
            <div className={`p-3 rounded-lg border ${isExpired() ? 'bg-red-50 border-red-200 text-red-800' : 'bg-yellow-50 border-yellow-200 text-yellow-800'}`}>
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium">
                  {isExpired() ? 'Assinatura Expirada' : 'Assinatura Expirando'}
                </span>
              </div>
              <p className="text-sm mt-1">
                {isExpired() 
                  ? 'Sua assinatura expirou. Renove para continuar acessando os cursos.'
                  : 'Sua assinatura expira em breve. Considere renovar para manter o acesso.'
                }
              </p>
            </div>
          )}

          {/* Plan Features */}
          {subscription.plans?.features && subscription.plans.features.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Recursos Inclusos</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                {subscription.plans.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
            {subscription.status === 'active' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleAction('change')}
                  className="flex-1"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Alterar Plano
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => handleAction('renew')}
                  className="flex-1"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Renovar
                </Button>
                
                <Button
                  variant="destructive"
                  onClick={() => handleAction('cancel')}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </>
            )}
            
            {(subscription.status !== 'active' || isExpired()) && (
              <Button
                onClick={() => handleAction('renew')}
                className="w-full"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reativar Assinatura
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'cancel' && 'Cancelar Assinatura'}
              {dialogType === 'change' && 'Alterar Plano'}
              {dialogType === 'renew' && 'Renovar Assinatura'}
            </DialogTitle>
            <DialogDescription>
              {dialogType === 'cancel' && 'Tem certeza de que deseja cancelar sua assinatura? Você perderá o acesso aos cursos.'}
              {dialogType === 'change' && 'Selecione o novo plano que deseja contratar.'}
              {dialogType === 'renew' && 'Deseja renovar sua assinatura por mais um mês?'}
            </DialogDescription>
          </DialogHeader>
          
          {dialogType === 'change' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Escolha seu novo plano</label>
              <Select value={selectedNewPlan} onValueChange={setSelectedNewPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano..." />
                </SelectTrigger>
                <SelectContent>
                  {plans
                    .filter(plan => plan.id !== subscription.plan_id)
                    .map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        <div className="flex justify-between items-center w-full">
                          <span>{plan.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {formatCurrency(plan.price_monthly)}/mês
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
              
              {selectedNewPlan && (
                <div className="text-sm text-muted-foreground">
                  {(() => {
                    const currentPrice = subscription.plans?.price_monthly || 0;
                    const newPlan = plans.find(p => p.id === selectedNewPlan);
                    const newPrice = newPlan?.price_monthly || 0;
                    const difference = newPrice - currentPrice;
                    
                    if (difference > 0) {
                      return (
                        <p className="text-green-600">
                          ⬆️ Upgrade: +{formatCurrency(difference)}/mês
                        </p>
                      );
                    } else if (difference < 0) {
                      return (
                        <p className="text-blue-600">
                          ⬇️ Downgrade: {formatCurrency(difference)}/mês
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={executeAction}
              variant={dialogType === 'cancel' ? 'destructive' : 'default'}
              disabled={dialogType === 'change' && !selectedNewPlan}
            >
              {dialogType === 'cancel' && 'Confirmar Cancelamento'}
              {dialogType === 'change' && 'Alterar Plano'}
              {dialogType === 'renew' && 'Confirmar Renovação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionCard;