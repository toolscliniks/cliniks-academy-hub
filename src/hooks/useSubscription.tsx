import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Subscription {
  id: string;
  plan_id: string;
  status: string;
  starts_at: string;
  ends_at: string;
  plans: {
    id: string;
    name: string;
    price_monthly: number;
    price_yearly: number;
    features: string[];
  };
}

interface SubscriptionChange {
  id: string;
  change_type: string;
  effective_date: string;
  created_at: string;
  old_plan_id: string;
  new_plan_id: string;
  metadata: any;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [changes, setChanges] = useState<SubscriptionChange[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSubscription();
      fetchSubscriptionChanges();
    }
  }, [user]);

  const fetchSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plans(*)
        `)
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      setSubscription(data);
    } catch (error: any) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptionChanges = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_changes')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setChanges(data || []);
    } catch (error: any) {
      console.error('Error fetching subscription changes:', error);
    }
  };

  const cancelSubscription = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        body: { subscription_id: subscription?.id }
      });

      if (error) throw error;

      // Log the change
      await supabase
        .from('subscription_changes')
        .insert({
          user_id: user?.id,
          subscription_id: subscription?.id,
          old_plan_id: subscription?.plan_id,
          new_plan_id: null,
          change_type: 'cancel',
          effective_date: new Date().toISOString(),
          metadata: { reason: 'user_requested' }
        });

      toast({
        title: "Assinatura cancelada",
        description: "Sua assinatura foi cancelada com sucesso"
      });

      await fetchSubscription();
      await fetchSubscriptionChanges();

    } catch (error: any) {
      toast({
        title: "Erro ao cancelar assinatura",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const changePlan = async (newPlanId: string, changeType: 'upgrade' | 'downgrade') => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('change-plan', {
        body: { 
          subscription_id: subscription?.id,
          new_plan_id: newPlanId,
          change_type: changeType
        }
      });

      if (error) throw error;

      // Log the change
      await supabase
        .from('subscription_changes')
        .insert({
          user_id: user?.id,
          subscription_id: subscription?.id,
          old_plan_id: subscription?.plan_id,
          new_plan_id: newPlanId,
          change_type: changeType,
          effective_date: new Date().toISOString(),
          metadata: { previous_plan: subscription?.plans?.name }
        });

      toast({
        title: `Plano ${changeType === 'upgrade' ? 'atualizado' : 'alterado'}`,
        description: "Seu plano foi alterado com sucesso"
      });

      await fetchSubscription();
      await fetchSubscriptionChanges();

    } catch (error: any) {
      toast({
        title: "Erro ao alterar plano",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renewSubscription = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('renew-subscription', {
        body: { subscription_id: subscription?.id }
      });

      if (error) throw error;

      // Log the renewal
      await supabase
        .from('subscription_changes')
        .insert({
          user_id: user?.id,
          subscription_id: subscription?.id,
          old_plan_id: subscription?.plan_id,
          new_plan_id: subscription?.plan_id,
          change_type: 'renew',
          effective_date: new Date().toISOString(),
          metadata: { renewal_type: 'manual' }
        });

      toast({
        title: "Assinatura renovada",
        description: "Sua assinatura foi renovada com sucesso"
      });

      await fetchSubscription();
      await fetchSubscriptionChanges();

    } catch (error: any) {
      toast({
        title: "Erro ao renovar assinatura",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    subscription,
    changes,
    loading,
    cancelSubscription,
    changePlan,
    renewSubscription,
    refetch: () => {
      fetchSubscription();
      fetchSubscriptionChanges();
    }
  };
};