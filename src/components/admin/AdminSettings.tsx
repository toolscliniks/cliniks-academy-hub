import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Globe, Webhook, Mail, Palette, Shield, Code } from 'lucide-react';
import DevelopmentTools from './DevelopmentTools';

const AdminSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [webhooks, setWebhooks] = useState<any[]>([]);

  useEffect(() => {
    fetchSettings();
    fetchWebhooks();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*');

      if (error) throw error;

      const settingsMap: Record<string, any> = {};
      data?.forEach(setting => {
        settingsMap[setting.setting_key] = setting.setting_value;
      });
      setSettings(settingsMap);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar configurações",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const fetchWebhooks = async () => {
    try {
      const { data, error } = await supabase
        .from('webhook_configs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWebhooks(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar webhooks",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const updateSetting = async (key: string, value: any) => {
    try {
      // Primeiro, verifica se a configuração já existe
      const { data: existingSetting } = await supabase
        .from('site_settings')
        .select('id')
        .eq('setting_key', key)
        .single();

      let error;
      if (existingSetting) {
        // Se existe, atualiza
        ({ error } = await supabase
          .from('site_settings')
          .update({ setting_value: value })
          .eq('setting_key', key));
      } else {
        // Se não existe, insere
        ({ error } = await supabase
          .from('site_settings')
          .insert({
            setting_key: key,
            setting_value: value
          }));
      }

      if (error) throw error;

      setSettings(prev => ({ ...prev, [key]: value }));
      toast({
        title: "Configuração atualizada!",
        description: "As alterações foram salvas com sucesso."
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const createWebhook = async (webhookData: any) => {
    try {
      const { error } = await supabase
        .from('webhook_configs')
        .insert([webhookData]);

      if (error) throw error;

      fetchWebhooks();
      toast({
        title: "Webhook criado!",
        description: "O webhook foi configurado com sucesso."
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const deleteWebhook = async (webhookId: string) => {
    if (!confirm('Tem certeza que deseja excluir este webhook?')) return;

    try {
      const { error } = await supabase
        .from('webhook_configs')
        .delete()
        .eq('id', webhookId);

      if (error) throw error;

      fetchWebhooks();
      toast({
        title: "Webhook excluído!",
        description: "O webhook foi removido."
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Configurações do Sistema</h2>
        <p className="text-muted-foreground">Gerencie as configurações da plataforma</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general" className="flex items-center space-x-2">
            <Globe className="w-4 h-4" />
            <span>Geral</span>
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center space-x-2">
            <Webhook className="w-4 h-4" />
            <span>Webhooks</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <span>Pagamentos</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center space-x-2">
            <Palette className="w-4 h-4" />
            <span>Aparência</span>
          </TabsTrigger>
          <TabsTrigger value="development" className="flex items-center space-x-2">
            <Code className="w-4 h-4" />
            <span>Desenvolvimento</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="grid gap-6">
            <Card className="bg-gradient-card border-border/50">
              <CardHeader>
                <CardTitle>Configurações Gerais</CardTitle>
                <CardDescription>Configure as informações básicas da plataforma</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="site-title">Título do Site</Label>
                  <Input
                    id="site-title"
                    value={settings.homepage_hero_title?.replace(/"/g, '') || ''}
                    onChange={(e) => updateSetting('homepage_hero_title', `"${e.target.value}"`)}
                    placeholder="Cliniks Academy"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="site-subtitle">Subtítulo</Label>
                  <Textarea
                    id="site-subtitle"
                    value={settings.homepage_hero_subtitle?.replace(/"/g, '') || ''}
                    onChange={(e) => updateSetting('homepage_hero_subtitle', `"${e.target.value}"`)}
                    placeholder="Transforme sua carreira com cursos online de alta qualidade"
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="certificates"
                    checked={settings.certificate_enabled === true}
                    onCheckedChange={(checked) => updateSetting('certificate_enabled', checked)}
                  />
                  <Label htmlFor="certificates">Habilitar sistema de certificados</Label>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="webhooks">
          <div className="space-y-6">
            {/* Webhook de Pagamento */}
            <Card className="bg-gradient-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Webhook className="w-5 h-5" />
                  <span>Webhook de Pagamento</span>
                </CardTitle>
                <CardDescription>Configure o webhook para processar pagamentos de cursos e planos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="payment-webhook-url">URL do Webhook de Pagamento</Label>
                  <Input
                    id="payment-webhook-url"
                    value={settings.payment_webhook_url?.replace(/"/g, '') || ''}
                    onChange={(e) => updateSetting('payment_webhook_url', e.target.value)} 
                    placeholder="https://n8n.clinicagestao.com.br/webhook/sucesso"
                  />
                </div>
                
                <Button
                  onClick={async () => {
                    try {
                      const testData = {
                        nome: "Teste Usuario",
                        email: "teste@exemplo.com",
                        whatsapp: "11999999999",
                        cpf_cnpj: "123.456.789-00",
                        id_curso: "test-course-123",
                        forma_pagamento: "PIX"
                      };
                      
                      // Use Supabase Edge Function to avoid CORS issues
                      const { data, error } = await supabase.functions.invoke('n8n-webhook-handler', {
                        body: {
                          event_type: 'test_payment_webhook',
                          webhook_url: settings.payment_webhook_url?.replace(/"/g, '') || '',
                          data: testData,
                          metadata: {
                            test: true,
                            source: 'admin_panel'
                          }
                        }
                      });
                      
                      if (error) {
                        throw new Error(error.message);
                      }
                      
                      toast({ title: "Teste realizado!", description: "Webhook de pagamento funcionando corretamente." });
                    } catch (error: any) {
                      toast({ title: "Erro no teste", description: error.message, variant: "destructive" });
                    }
                  }}
                  disabled={!settings.payment_webhook_url || settings.payment_webhook_url === '""'}
                >
                  Testar Webhook de Pagamento
                </Button>
              </CardContent>
            </Card>

            {/* Webhook de Cadastro */}
            <Card className="bg-gradient-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Webhook className="w-5 h-5" />
                  <span>Webhook de Cadastro</span>
                </CardTitle>
                <CardDescription>Configure o webhook para processar cadastros de novos usuários</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-webhook-url">URL do Webhook de Cadastro</Label>
                  <Input
                    id="register-webhook-url"
                    value={settings.register_webhook_url?.replace(/"/g, '') || ''}
                    onChange={(e) => updateSetting('register_webhook_url', e.target.value)} 
                    placeholder="https://n8n.clinicagestao.com.br/webhook/cadastroclinica"
                  />
                </div>
                
                <Button
                  onClick={async () => {
                    try {
                      const testData = {
                        nome: "Teste Usuario Cadastro",
                        email: "cadastro@exemplo.com",
                        whatsapp: "11888888888",
                        cpf_cnpj: "987.654.321-00",
                        source: "cliniks academy"
                      };
                      
                      // Use Supabase Edge Function to avoid CORS issues
                      const { data, error } = await supabase.functions.invoke('n8n-webhook-handler', {
                        body: {
                          event_type: 'test_register_webhook',
                          webhook_url: settings.register_webhook_url?.replace(/"/g, '') || '',
                          data: testData,
                          metadata: {
                            test: true,
                            source: 'admin_panel'
                          }
                        }
                      });
                      
                      if (error) {
                        throw new Error(error.message);
                      }
                      
                      toast({ title: "Teste realizado!", description: "Webhook de cadastro funcionando corretamente." });
                    } catch (error: any) {
                      toast({ title: "Erro no teste", description: error.message, variant: "destructive" });
                    }
                  }}
                  disabled={!settings.register_webhook_url || settings.register_webhook_url === '""'}
                >
                  Testar Webhook de Cadastro
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-border/50">
              <CardHeader>
                <CardTitle>Webhooks Ativos</CardTitle>
                <CardDescription>Gerencie os webhooks configurados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {webhooks.map((webhook) => (
                    <div key={webhook.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{webhook.name}</h4>
                        <p className="text-sm text-muted-foreground">{webhook.webhook_url}</p>
                        <div className="flex space-x-1 mt-1">
                          {webhook.event_types.map((event: string) => (
                            <span key={event} className="text-xs bg-muted px-2 py-1 rounded">
                              {event}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch checked={webhook.is_active} disabled />
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteWebhook(webhook.id)}
                        >
                          Excluir
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {webhooks.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum webhook configurado
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payments">
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle>Configurações de Pagamento</CardTitle>
              <CardDescription>Configure o modo de processamento de pagamentos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="direct-payment"
                    name="payment-mode"
                    checked={settings.payment_mode === '"direct"'}
                    onChange={() => updateSetting('payment_mode', '"direct"')}
                  />
                  <Label htmlFor="direct-payment">
                    Pagamento Direto (Asaas)
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="webhook-payment"
                    name="payment-mode"
                    checked={settings.payment_mode === '"webhook"'}
                    onChange={() => updateSetting('payment_mode', '"webhook"')}
                  />
                  <Label htmlFor="webhook-payment">
                    Via Webhook (n8n)
                  </Label>
                </div>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Pagamento Direto:</strong> Processa pagamentos diretamente via API do Asaas.<br/>
                  <strong>Via Webhook:</strong> Envia dados para n8n que processa o pagamento e retorna o status.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle>Estatísticas da Homepage</CardTitle>
              <CardDescription>Configure os números exibidos na página inicial</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stat-courses">Número de Cursos</Label>
                  <Input
                    id="stat-courses"
                    type="number"
                    value={settings.homepage_stats?.courses || 500}
                    onChange={(e) => updateSetting('homepage_stats', {
                      ...settings.homepage_stats,
                      courses: parseInt(e.target.value)
                    })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="stat-students">Número de Alunos</Label>
                  <Input
                    id="stat-students"
                    type="number"
                    value={settings.homepage_stats?.students || 10000}
                    onChange={(e) => updateSetting('homepage_stats', {
                      ...settings.homepage_stats,
                      students: parseInt(e.target.value)
                    })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="stat-satisfaction">Taxa de Satisfação (%)</Label>
                  <Input
                    id="stat-satisfaction"
                    type="number"
                    min="0"
                    max="100"
                    value={settings.homepage_stats?.satisfaction || 95}
                    onChange={(e) => updateSetting('homepage_stats', {
                      ...settings.homepage_stats,
                      satisfaction: parseInt(e.target.value)
                    })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="development">
          <DevelopmentTools />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;