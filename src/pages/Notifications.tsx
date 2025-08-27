import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useNotifications, type Notification } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { Bell, ArrowLeft, Check, CheckCheck, X, ExternalLink, Search, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const NotificationsPage = () => {
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Agora mesmo';
    if (diffInMinutes < 60) return `${diffInMinutes} minutos atrás`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} horas atrás`;
    return `${Math.floor(diffInMinutes / 1440)} dias atrás`;
  };

  const getNotificationIcon = (type: string) => {
    const baseClass = "w-5 h-5";
    switch (type) {
      case 'success':
        return <div className={`${baseClass} rounded-full bg-green-500 flex items-center justify-center text-white text-xs`}>✓</div>;
      case 'warning':
        return <div className={`${baseClass} rounded-full bg-yellow-500 flex items-center justify-center text-white text-xs`}>!</div>;
      case 'error':
        return <div className={`${baseClass} rounded-full bg-red-500 flex items-center justify-center text-white text-xs`}>×</div>;
      default:
        return <div className={`${baseClass} rounded-full bg-blue-500 flex items-center justify-center text-white text-xs`}>i</div>;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'default';
      case 'warning': return 'secondary';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'success': return 'Sucesso';
      case 'warning': return 'Aviso';
      case 'error': return 'Erro';
      default: return 'Info';
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    if (notification.action_url) {
      if (notification.action_url.startsWith('http')) {
        window.open(notification.action_url, '_blank');
      } else {
        navigate(notification.action_url);
      }
    }
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = !searchTerm || 
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || notification.type === filterType;
    const matchesCategory = filterCategory === 'all' || notification.category === filterCategory;
    
    return matchesSearch && matchesType && matchesCategory;
  });

  const categories = Array.from(new Set(notifications.map(n => n.category).filter(Boolean)));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando notificações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center space-x-2">
                  <Bell className="h-6 w-6" />
                  <span>Notificações</span>
                  {unreadCount > 0 && (
                    <Badge variant="destructive">{unreadCount}</Badge>
                  )}
                </h1>
                <p className="text-muted-foreground">Gerencie suas notificações</p>
              </div>
            </div>
            
            {unreadCount > 0 && (
              <Button onClick={markAllAsRead} variant="outline">
                <CheckCheck className="w-4 h-4 mr-2" />
                Marcar todas como lidas
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar notificações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="success">Sucesso</SelectItem>
              <SelectItem value="warning">Aviso</SelectItem>
              <SelectItem value="error">Erro</SelectItem>
            </SelectContent>
          </Select>
          
          {categories.length > 0 && (
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category || ''}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`bg-gradient-card border-border/50 cursor-pointer transition-all hover:shadow-md ${
                !notification.is_read ? 'border-l-4 border-l-primary bg-primary/5' : ''
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className={`font-semibold ${!notification.is_read ? 'text-primary' : 'text-foreground'}`}>
                          {notification.title}
                        </h3>
                        <Badge variant={getTypeColor(notification.type)} className="text-xs">
                          {getTypeText(notification.type)}
                        </Badge>
                        {notification.category && (
                          <Badge variant="outline" className="text-xs">
                            {notification.category}
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-muted-foreground mb-3 leading-relaxed">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{formatTimeAgo(notification.created_at)}</span>
                        
                        {notification.action_url && (
                          <div className="flex items-center gap-1 text-primary">
                            <ExternalLink className="w-3 h-3" />
                            <span className="text-xs">Clique para ver mais</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredNotifications.length === 0 && !loading && (
          <Card className="bg-gradient-card border-border/50">
            <CardContent className="text-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                {notifications.length === 0 ? 'Nenhuma notificação' : 'Nenhuma notificação encontrada'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {notifications.length === 0 
                  ? 'Você não possui notificações no momento.'
                  : 'Tente ajustar os filtros de busca.'
                }
              </p>
              {searchTerm || filterType !== 'all' || filterCategory !== 'all' ? (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('');
                    setFilterType('all');
                    setFilterCategory('all');
                  }}
                >
                  Limpar Filtros
                </Button>
              ) : (
                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                  Voltar ao Dashboard
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stats Card */}
        {notifications.length > 0 && (
          <Card className="bg-gradient-card border-border/50 mt-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{notifications.length}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-500">{unreadCount}</p>
                  <p className="text-sm text-muted-foreground">Não lidas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {notifications.filter(n => n.is_read).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Lidas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-500">
                    {notifications.filter(n => n.action_url).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Com ação</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;