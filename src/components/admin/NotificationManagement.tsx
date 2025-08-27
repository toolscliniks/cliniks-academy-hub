import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Send, Users, User, Calendar, Eye, Trash2 } from 'lucide-react';

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface NotificationHistory {
  id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  created_at: string;
  user_count: number;
}

const NotificationManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  const [category, setCategory] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [sendToAll, setSendToAll] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchNotificationHistory();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchNotificationHistory = async () => {
    try {
      // Get recent notifications with user count
      const { data, error } = await supabase
        .from('notifications')
        .select('title, message, type, category, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Group by notification content and count users
      const grouped = data?.reduce((acc: any[], notification) => {
        const key = `${notification.title}-${notification.message}-${notification.created_at}`;
        const existing = acc.find(item => 
          item.title === notification.title && 
          item.message === notification.message &&
          Math.abs(new Date(item.created_at).getTime() - new Date(notification.created_at).getTime()) < 60000 // Within 1 minute
        );

        if (existing) {
          existing.user_count++;
        } else {
          acc.push({
            id: crypto.randomUUID(),
            ...notification,
            user_count: 1
          });
        }

        return acc;
      }, []) || [];

      setHistory(grouped);
    } catch (error: any) {
      console.error('Error fetching notification history:', error);
    }
  };

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u.id));
    }
  };

  const handleSendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: "Erro",
        description: "Título e mensagem são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (!sendToAll && selectedUsers.length === 0) {
      toast({
        title: "Erro", 
        description: "Selecione pelo menos um usuário ou marque 'Enviar para todos'",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const notificationData = {
        title: title.trim(),
        message: message.trim(),
        type,
        category: category.trim() || null,
        action_url: actionUrl.trim() || null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        ...(sendToAll ? {} : { user_ids: selectedUsers })
      };

      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: notificationData
      });

      if (error) throw error;

      toast({
        title: "Notificação enviada!",
        description: `Enviada para ${sendToAll ? 'todos os usuários' : selectedUsers.length + ' usuários'}`
      });

      // Reset form
      setTitle('');
      setMessage('');
      setType('info');
      setCategory('');
      setActionUrl('');
      setExpiresAt('');
      setSendToAll(false);
      setSelectedUsers([]);
      
      // Refresh history
      fetchNotificationHistory();

    } catch (error: any) {
      toast({
        title: "Erro ao enviar notificação",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Gerenciar Notificações</h2>
          <p className="text-muted-foreground">Envie notificações para usuários da plataforma</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Send Notification Form */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="w-5 h-5" />
              <span>Nova Notificação</span>
            </CardTitle>
            <CardDescription>
              Envie notificações personalizadas para usuários
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título da notificação..."
                maxLength={100}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="message">Mensagem *</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Conteúdo da notificação..."
                rows={3}
                maxLength={500}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={type} onValueChange={(value: any) => setType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Informação</SelectItem>
                    <SelectItem value="success">Sucesso</SelectItem>
                    <SelectItem value="warning">Aviso</SelectItem>
                    <SelectItem value="error">Erro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="ex: curso, pagamento..."
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="actionUrl">URL de Ação (opcional)</Label>
              <Input
                id="actionUrl"
                value={actionUrl}
                onChange={(e) => setActionUrl(e.target.value)}
                placeholder="/courses/123 ou https://..."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Data de Expiração (opcional)</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendToAll"
                checked={sendToAll}
                onCheckedChange={(checked) => setSendToAll(checked === true)}
              />
              <Label htmlFor="sendToAll">Enviar para todos os usuários</Label>
            </div>
            
            <Button 
              onClick={handleSendNotification} 
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                "Enviando..."
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Notificação
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* User Selection / History */}
        <div className="space-y-6">
          {/* User Selection */}
          {!sendToAll && (
            <Card className="bg-gradient-card border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>Selecionar Usuários</span>
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    {selectedUsers.length === users.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </Button>
                </div>
                <CardDescription>
                  {selectedUsers.length} de {users.length} usuários selecionados
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded">
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={() => handleUserToggle(user.id)}
                      />
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.full_name || 'Nome não informado'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notification History */}
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Histórico Recente</span>
              </CardTitle>
              <CardDescription>
                Últimas notificações enviadas
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {history.map((notification) => (
                  <div key={notification.id} className="p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${getTypeColor(notification.type)}`}></div>
                        <span className="font-medium text-sm">{notification.title}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {notification.user_count} usuários
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatDate(notification.created_at)}</span>
                      {notification.category && (
                        <Badge variant="outline" className="text-xs">
                          {notification.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                
                {history.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma notificação enviada ainda</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NotificationManagement;