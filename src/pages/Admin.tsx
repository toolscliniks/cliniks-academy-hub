import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, BookOpen, Users, Settings, BarChart3 } from 'lucide-react';
import AdminCourses from '@/components/admin/AdminCourses';
import AdminPlans from '@/components/admin/AdminPlans';
import AdminUsers from '@/components/admin/AdminUsers';

const Admin = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('courses');

  // Simple admin check - in production you'd verify against user profile
  if (!user?.email?.includes('admin')) {
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
            <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
              Voltar ao Dashboard
            </Button>
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
                  <p className="text-sm text-muted-foreground">Total Cursos</p>
                  <p className="text-2xl font-bold">24</p>
                </div>
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-card border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Usuários Ativos</p>
                  <p className="text-2xl font-bold">1,234</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-card border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Matrículas</p>
                  <p className="text-2xl font-bold">856</p>
                </div>
                <BarChart3 className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-card border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taxa de Conclusão</p>
                  <p className="text-2xl font-bold">78%</p>
                </div>
                <Settings className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="courses">Cursos</TabsTrigger>
            <TabsTrigger value="plans">Planos</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
          </TabsList>
          
          <TabsContent value="courses">
            <AdminCourses />
          </TabsContent>
          
          <TabsContent value="plans">
            <AdminPlans />
          </TabsContent>
          
          <TabsContent value="users">
            <AdminUsers />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;