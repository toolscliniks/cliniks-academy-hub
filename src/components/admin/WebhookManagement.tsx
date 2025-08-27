import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Webhook, Send, Settings, Plus, Trash2, Edit, Activity, CheckCircle, AlertCircle } from 'lucide-react';

interface WebhookConfig {
  id: string;
  name: string;
  webhook_url: string;
  event_types: string[];
  is_active: boolean;
  secret_key?: string;
  created_at: string;
}

interface WebhookLog {
  id: string;
  webhook_url: string;
  event_type: string;
  response_status: number;
  success: boolean;
  created_at: string;
  metadata?: any;
}

const AVAILABLE_EVENTS = [
  { id: 'user_registered', label: 'Usuário Registrado', description: 'Quando um novo usuário se cadastra' },
  { id: 'user_updated', label: 'Usuário Atualizado', description: 'Quando dados do usuário são alterados' },
  { id: 'course_enrolled', label: 'Matrícula em Curso', description: 'Quando usuário se matricula em curso' },
  { id: 'course_completed', label: 'Curso Concluído', description: 'Quando usuário completa um curso' },
  { id: 'payment_received', label: 'Pagamento Recebido', description: 'Quando pagamento é confirmado' },
  { id: 'subscription_created', label: 'Assinatura Criada', description: 'Quando nova assinatura é ativada' },
  { id: 'subscription_cancelled', label: 'Assinatura Cancelada', description: 'Quando assinatura é cancelada' }
];

const WebhookManagement = () => {
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null);
  const [testLoading, setTestLoading] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    webhook_url: '',
    event_types: [] as string[],
    is_active: true,
    secret_key: ''
  });

  useEffect(() => {
    fetchWebhooks();
    fetchWebhookLogs();
  }, []);

  const fetchWebhooks = async () => {
    try {
      const { data, error } = await supabase
        .from('webhook_configs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWebhooks(data || []);
    } catch (error: any) {
      console.error('Error fetching webhooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWebhookLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error('Error fetching webhook logs:', error);
    }
  };

  const handleSaveWebhook = async () => {
    try {
      if (!formData.name.trim() || !formData.webhook_url.trim()) {
        toast({
          title: "Erro",
          description: "Nome e URL do webhook são obrigatórios",
          variant: "destructive"
        });
        return;
      }

      if (formData.event_types.length === 0) {
        toast({
          title: "Erro", 
          description: "Selecione pelo menos um evento",
          variant: "destructive"
        });
        return;
      }

      const webhookData = {
        name: formData.name.trim(),
        webhook_url: formData.webhook_url.trim(),
        event_types: formData.event_types,
        is_active: formData.is_active,
        secret_key: formData.secret_key.trim() || null
      };

      let error;
      if (editingWebhook) {
        ({ error } = await supabase
          .from('webhook_configs')
          .update(webhookData)
          .eq('id', editingWebhook.id));
      } else {
        ({ error } = await supabase
          .from('webhook_configs')
          .insert([webhookData]));
      }

      if (error) throw error;

      toast({
        title: editingWebhook ? "Webhook atualizado" : "Webhook criado",
        description: "Webhook configurado com sucesso"
      });

      setIsDialogOpen(false);
      resetForm();
      fetchWebhooks();

    } catch (error: any) {
      toast({
        title: "Erro ao salvar webhook",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    try {
      const { error } = await supabase
        .from('webhook_configs')
        .delete()
        .eq('id', webhookId);

      if (error) throw error;

      toast({
        title: "Webhook excluído",
        description: "Webhook removido com sucesso"
      });

      fetchWebhooks();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir webhook",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleTestWebhook = async (webhook: WebhookConfig) => {
    setTestLoading(webhook.id);
    
    try {
      const { data, error } = await supabase.functions.invoke('n8n-webhook-handler', {
        body: {
          event_type: 'test_webhook',
          webhook_url: webhook.webhook_url,
          data: {
            message: 'Test webhook from Cliniks Academy',
            timestamp: new Date().toISOString(),
            webhook_name: webhook.name
          },
          metadata: {
            test: true,
            webhook_id: webhook.id
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Webhook testado",
        description: "Webhook de teste enviado com sucesso"
      });

      fetchWebhookLogs();
    } catch (error: any) {
      toast({
        title: "Erro no teste",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTestLoading(null);
    }
  };

  const handleEditWebhook = (webhook: WebhookConfig) => {
    setEditingWebhook(webhook);
    setFormData({
      name: webhook.name,
      webhook_url: webhook.webhook_url,
      event_types: webhook.event_types,
      is_active: webhook.is_active,
      secret_key: webhook.secret_key || ''
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      webhook_url: '',
      event_types: [],
      is_active: true,
      secret_key: ''
    });
    setEditingWebhook(null);
  };

  const toggleEventType = (eventId: string) => {
    setFormData(prev => ({
      ...prev,
      event_types: prev.event_types.includes(eventId)
        ? prev.event_types.filter(id => id !== eventId)
        : [...prev.event_types, eventId]
    }));
  };

  if (loading) {
    return <div className="text-center py-8">Carregando webhooks...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Webhooks n8n</h2>
          <p className="text-muted-foreground">Configure integrações automáticas com n8n</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Webhook
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingWebhook ? 'Editar Webhook' : 'Novo Webhook'}
              </DialogTitle>
              <DialogDescription>
                Configure um webhook para integrar com n8n
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Registro de usuários"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="webhook_url">URL do Webhook *</Label>
                  <Input
                    id="webhook_url"
                    value={formData.webhook_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, webhook_url: e.target.value }))}
                    placeholder="https://n8n.exemplo.com/webhook/..."
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="secret_key">Chave Secreta (opcional)</Label>
                <Input
                  id="secret_key"
                  type="password"
                  value={formData.secret_key}
                  onChange={(e) => setFormData(prev => ({ ...prev, secret_key: e.target.value }))}
                  placeholder="Chave para validação de segurança"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Eventos para Monitorar *</Label>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                  {AVAILABLE_EVENTS.map(event => (
                    <div key={event.id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded">
                      <input
                        type="checkbox"
                        checked={formData.event_types.includes(event.id)}
                        onChange={() => toggleEventType(event.id)}
                        className="rounded"
                      />
                      <div>
                        <p className="text-sm font-medium">{event.label}</p>
                        <p className="text-xs text-muted-foreground">{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label>Webhook ativo</Label>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveWebhook}>
                {editingWebhook ? 'Salvar Alterações' : 'Criar Webhook'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{webhooks.length}</p>
              </div>
              <Webhook className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold text-green-600">
                  {webhooks.filter(w => w.is_active).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Enviados (24h)</p>
                <p className="text-2xl font-bold">
                  {logs.filter(l => {
                    const dayAgo = new Date();
                    dayAgo.setDate(dayAgo.getDate() - 1);
                    return new Date(l.created_at) > dayAgo;
                  }).length}
                </p>
              </div>
              <Send className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Falhas (24h)</p>
                <p className="text-2xl font-bold text-red-600">
                  {logs.filter(l => {
                    const dayAgo = new Date();
                    dayAgo.setDate(dayAgo.getDate() - 1);
                    return new Date(l.created_at) > dayAgo && !l.success;
                  }).length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Webhooks List */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Webhook className="w-5 h-5" />
              <span>Webhooks Configurados</span>
            </CardTitle>
            <CardDescription>
              Gerencie suas integrações com n8n
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {webhooks.map((webhook) => (
              <div key={webhook.id} className="p-4 bg-muted/20 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <h4 className="font-medium">{webhook.name}</h4>
                    <Badge variant={webhook.is_active ? 'default' : 'secondary'}>
                      {webhook.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestWebhook(webhook)}
                      disabled={testLoading === webhook.id}
                    >
                      {testLoading === webhook.id ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-primary"></div>
                      ) : (
                        <Send className="w-3 h-3" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditWebhook(webhook)}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteWebhook(webhook.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground mb-2 truncate">
                  {webhook.webhook_url}
                </p>
                
                <div className="flex flex-wrap gap-1">
                  {webhook.event_types.map(eventId => {
                    const event = AVAILABLE_EVENTS.find(e => e.id === eventId);
                    return (
                      <Badge key={eventId} variant="outline" className="text-xs">
                        {event?.label || eventId}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {webhooks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Webhook className="w-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum webhook configurado</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Logs */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Logs Recentes</span>
            </CardTitle>
            <CardDescription>
              Últimas tentativas de envio de webhook
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="p-3 bg-muted/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {log.success ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                      <Badge variant="outline" className="text-xs">
                        {log.event_type}
                      </Badge>
                    </div>
                    
                    <span className={`text-xs px-2 py-1 rounded ${
                      log.success ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
                    }`}>
                      {log.response_status}
                    </span>
                  </div>
                  
                  <p className="text-xs text-muted-foreground truncate mb-1">
                    {log.webhook_url}
                  </p>
                  
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              ))}
              
              {logs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum log encontrado</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WebhookManagement;