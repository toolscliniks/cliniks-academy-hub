import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, BookOpen, Users, Settings, BarChart3, TestTube, CreditCard, UserPlus, Bell, Monitor, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

import AdminCourses from '@/components/admin/AdminCourses';
import LessonManagement from '@/components/admin/LessonManagement';
import ModuleManagement from '@/components/admin/ModuleManagement';
import ImageManagement from '@/components/admin/ImageManagement';
import AdminUsers from '@/components/admin/AdminUsers';
import AdminPlans from '@/components/admin/AdminPlans';
import AdminAnalytics from '@/components/admin/AdminAnalytics';
import AdminSettings from '@/components/admin/AdminSettings';
import { UserMonitoring } from '@/components/admin/UserMonitoring';
import ManualEnrollment from '@/components/admin/ManualEnrollment';
import SubscriptionManagement from '@/components/admin/SubscriptionManagement';
import NotificationManagement from '@/components/admin/NotificationManagement';
import PaymentSettings from '@/components/admin/PaymentSettings';

// Testing & Development Tools
import { AdminTesting } from '@/components/admin/AdminTesting';

const Admin = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('courses');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkAdminRole();
    } else {
      setLoading(false);
    }
  }, [user]);

  const checkAdminRole = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      
      setIsAdmin(data?.role === 'admin');
    } catch (error) {
      console.error('Error checking admin role:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Check admin access
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Card className="bg-gradient-card border-border/50 max-w-md">
          <CardContent className="text-center py-12">
            <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Acesso Negado</h3>
            <p className="text-muted-foreground">
              Você não tem permissão para acessar o painel administrativo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Painel Administrativo</h1>
              <p className="text-muted-foreground">Gerencie sua plataforma de ensino</p>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
                Dashboard
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/'}>
                Site
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-card border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Em breve</p>
                  <p className="text-2xl font-bold">--</p>
                </div>
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-card border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Em breve</p>
                  <p className="text-2xl font-bold">--</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-card border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Em breve</p>
                  <p className="text-2xl font-bold">--</p>
                </div>
                <BarChart3 className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-card border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Em breve</p>
                  <p className="text-2xl font-bold">--</p>
                </div>
                <Settings className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-13 mb-8">
            <TabsTrigger value="courses">Cursos</TabsTrigger>
            <TabsTrigger value="lessons">Aulas</TabsTrigger>
            <TabsTrigger value="modules">Módulos</TabsTrigger>
            <TabsTrigger value="images">Imagens</TabsTrigger>
            <TabsTrigger value="plans">Planos</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="monitoring">Monitor</TabsTrigger>
            <TabsTrigger value="enrollment">Matrículas</TabsTrigger>
            <TabsTrigger value="subscriptions">Assinaturas</TabsTrigger>
            <TabsTrigger value="payments">Pagamentos</TabsTrigger>
            <TabsTrigger value="notifications">Notificações</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="testing">Testes</TabsTrigger>
            <TabsTrigger value="settings">Config</TabsTrigger>
          </TabsList>
          
          <TabsContent value="courses">
            <AdminCourses />
          </TabsContent>

          <TabsContent value="lessons">
            <LessonManagement />
          </TabsContent>
          
          <TabsContent value="modules">
            <ModuleManagement />
          </TabsContent>
          
          <TabsContent value="images">
            <ImageManagement />
          </TabsContent>
          
          <TabsContent value="plans">
            <AdminPlans />
          </TabsContent>
          
          <TabsContent value="users">
            <AdminUsers />
          </TabsContent>
          
          <TabsContent value="monitoring">
            <UserMonitoring />
          </TabsContent>
          
          <TabsContent value="enrollment">
            <ManualEnrollment />
          </TabsContent>
          
          <TabsContent value="subscriptions">
            <SubscriptionManagement />
          </TabsContent>
          
          <TabsContent value="payments">
            <PaymentSettings />
          </TabsContent>
          
          <TabsContent value="notifications">
            <NotificationManagement />
          </TabsContent>
          
          <TabsContent value="analytics">
            <AdminAnalytics />
          </TabsContent>

          <TabsContent value="testing">
            <AdminTesting />
          </TabsContent>

          <TabsContent value="settings">
            <AdminSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;