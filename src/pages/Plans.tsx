import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Check, Star, CreditCard, Building, Banknote } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Plan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  is_active: boolean;
}

const Plans = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [billingType, setBillingType] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar planos",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string, paymentMethod: 'CREDIT_CARD' | 'BOLETO' | 'PIX') => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setSubscribing(planId);

    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { 
          planId,
          billingType: paymentMethod
        }
      });

      if (error) throw error;

      // Show success message about payment email
      toast({
        title: "Solicitação de Assinatura Enviada!",
        description: "Você receberá um email em breve com as instruções de pagamento. Verifique sua caixa de entrada e spam.",
        duration: 8000
      });
      
      // Redirect to dashboard after showing the message
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error: any) {
      toast({
        title: "Erro no pagamento",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSubscribing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando planos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border/50">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Escolha seu Plano</h1>
            <p className="text-muted-foreground">
              Selecione o plano ideal para acelerar seu aprendizado
            </p>
          </div>
          
          {/* Billing Toggle */}
          <div className="flex justify-center mt-6">
            <div className="flex items-center space-x-4 bg-muted p-1 rounded-lg">
              <Button
                variant={billingType === 'monthly' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setBillingType('monthly')}
              >
                Mensal
              </Button>
              <Button
                variant={billingType === 'yearly' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setBillingType('yearly')}
              >
                Anual
                <Badge variant="secondary" className="ml-2">-20%</Badge>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={plan.id} 
              className={`bg-gradient-card border-border/50 relative ${
                index === 1 ? 'scale-105 border-primary/50' : ''
              }`}
            >
              {index === 1 && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    <Star className="w-3 h-3 mr-1" />
                    Mais Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-sm">
                  {plan.description}
                </CardDescription>
                
                <div className="mt-4">
                  <div className="text-4xl font-bold">
                    R$ {billingType === 'monthly' 
                      ? plan.price_monthly?.toFixed(2) 
                      : (plan.price_yearly / 12)?.toFixed(2)
                    }
                  </div>
                  <div className="text-muted-foreground text-sm">
                    por mês{billingType === 'yearly' && ' (cobrado anualmente)'}
                  </div>
                  {billingType === 'yearly' && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Total: R$ {plan.price_yearly?.toFixed(2)} por ano
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Features */}
                <div className="space-y-3">
                  {plan.features?.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start space-x-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Payment Buttons */}
                <div className="space-y-2">
                  <Button
                    className="w-full"
                    variant={index === 1 ? 'default' : 'outline'}
                    disabled={subscribing === plan.id}
                    onClick={() => handleSubscribe(plan.id, 'CREDIT_CARD')}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {subscribing === plan.id ? 'Processando...' : 'Cartão de Crédito'}
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={subscribing === plan.id}
                    onClick={() => handleSubscribe(plan.id, 'PIX')}
                  >
                    <Banknote className="w-4 h-4 mr-2" />
                    PIX
                  </Button>
                  
                  <Button
                    variant="ghost"
                    className="w-full text-xs"
                    disabled={subscribing === plan.id}
                    onClick={() => handleSubscribe(plan.id, 'BOLETO')}
                  >
                    <Building className="w-4 h-4 mr-2" />
                    Boleto Bancário
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Processamento seguro via Asaas
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Back to Home */}
        <div className="text-center mt-12">
          <Button variant="ghost" onClick={() => navigate('/')}>
            ← Voltar ao Início
          </Button>
        </div>

        {plans.length === 0 && (
          <Card className="bg-gradient-card border-border/50 max-w-md mx-auto">
            <CardContent className="text-center py-12">
              <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Em breve</h3>
              <p className="text-muted-foreground">
                Estamos preparando planos incríveis para você!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Plans;