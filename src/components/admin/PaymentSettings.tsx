import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Settings, CreditCard, Webhook } from 'lucide-react';

const PaymentSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    payment_mode: 'direct',
    asaas_api_key: '',
    asaas_environment: 'sandbox',
    n8n_webhook_url: '',
  });

  const testN8nWebhook = async () => {
    if (!settings.n8n_webhook_url) {
      toast.error('URL do webhook n8n não configurada');
      return;
    }

    try {
      const testData = {
        event: 'test_webhook',
        user_id: 'test_user_123',
        user_email: 'teste@exemplo.com',
        user_name: 'Usuário de Teste',
        plan_id: 'plano_teste',
        course_id: 'curso_teste',
        billing_type: 'teste',
        timestamp: new Date().toISOString(),
        message: 'Este é um teste de webhook do n8n'
      };

      const response = await fetch(settings.n8n_webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });

      if (response.ok) {
        toast.success('Webhook testado com sucesso!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erro ao testar webhook');
      }
    } catch (error) {
      console.error('Erro ao testar webhook:', error);
      toast.error(`Falha ao testar webhook: ${error.message}`);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['payment_mode', 'n8n_webhook_url']);

      if (error) throw error;

      const settingsMap: any = {};
      data?.forEach(setting => {
        settingsMap[setting.setting_key] = setting.setting_value;
      });

      setSettings(prev => ({
        ...prev,
        payment_mode: settingsMap.payment_mode || 'direct',
        n8n_webhook_url: settingsMap.n8n_webhook_url || ''
      }));
    } catch (error: any) {
      toast({
        title: "Erro ao carregar configurações",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = [
        {
          setting_key: 'payment_mode',
          setting_value: settings.payment_mode
        },
        {
          setting_key: 'n8n_webhook_url',
          setting_value: settings.n8n_webhook_url
        }
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('site_settings')
          .upsert(update, { onConflict: 'setting_key' });

        if (error) throw error;
      }

      toast({
        title: "Configurações salvas!",
        description: "As configurações de pagamento foram atualizadas."
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando configurações...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Configurações de Pagamento</h2>
        <p className="text-muted-foreground">Configure como os pagamentos serão processados</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Mode */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5" />
              <span>Modo de Pagamento</span>
            </CardTitle>
            <CardDescription>
              Escolha como os pagamentos serão processados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Método de Processamento</Label>
              <Select 
                value={settings.payment_mode} 
                onValueChange={(value) => setSettings(prev => ({ ...prev, payment_mode: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">
                    Direto (Asaas API)
                  </SelectItem>
                  <SelectItem value="n8n">
                    Via n8n Webhook
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {settings.payment_mode === 'direct' 
                  ? 'Pagamentos processados diretamente via API do Asaas'
                  : 'Pagamentos enviados via webhook para n8n processar'
                }
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Asaas Habilitado</Label>
                <Switch
                  checked={settings.asaas_enabled}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, asaas_enabled: checked }))}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Habilitar integração com gateway Asaas
              </p>
            </div>
          </CardContent>
        </Card>

        {/* N8N Configuration */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Webhook className="w-5 h-5" />
              <span>Configuração n8n</span>
            </CardTitle>
            <CardDescription>
              Configure o webhook do n8n para processamento de pagamentos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>URL do Webhook n8n</Label>
              <Input
                type="url"
                placeholder="https://n8n.exemplo.com/webhook/pagamentos"
                value={settings.n8n_webhook_url}
                onChange={(e) => setSettings(prev => ({ ...prev, n8n_webhook_url: e.target.value }))}
                disabled={settings.payment_mode === 'direct'}
              />
              <p className="text-xs text-muted-foreground">
                URL do webhook n8n que receberá os dados de pagamento
              </p>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={testN8nWebhook}
                disabled={!settings.n8n_webhook_url || settings.payment_mode === 'direct'}
              >
                Testar Webhook
              </Button>
            </div>

            {settings.payment_mode === 'n8n' && (
              <div className="p-4 bg-primary/10 rounded-lg">
                <h4 className="font-medium mb-2">Dados enviados no webhook:</h4>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>• user_id: ID do usuário</li>
                  <li>• user_email: Email do usuário</li>
                  <li>• user_name: Nome do usuário</li>
                  <li>• plan_id: ID do plano (se aplicável)</li>
                  <li>• course_id: ID do curso (se aplicável)</li>
                  <li>• billing_type: Tipo de cobrança</li>
                  <li>• timestamp: Data/hora da solicitação</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Current Configuration Summary */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Resumo da Configuração</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/20 rounded-lg">
              <div className="font-medium">Modo de Pagamento</div>
              <div className="text-2xl font-bold text-primary mt-2">
                {settings.payment_mode === 'direct' ? 'Direto' : 'n8n'}
              </div>
            </div>
            
            <div className="text-center p-4 bg-muted/20 rounded-lg">
              <div className="font-medium">Gateway Asaas</div>
              <div className="text-2xl font-bold text-primary mt-2">
                {settings.asaas_enabled ? 'Ativo' : 'Inativo'}
              </div>
            </div>
            
            <div className="text-center p-4 bg-muted/20 rounded-lg">
              <div className="font-medium">Webhook n8n</div>
              <div className="text-2xl font-bold text-primary mt-2">
                {settings.n8n_webhook_url ? 'Configurado' : 'Não configurado'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
};

export default PaymentSettings;