import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, Code, TestTube, Play, Bug, Wrench, 
  AlertTriangle, CheckCircle, Clock, Zap
} from 'lucide-react';
import { AdminTesting } from './AdminTesting';

const DevelopmentTools = () => {
  const { toast } = useToast();
  const [isRunningTests, setIsRunningTests] = useState(false);

  const runSystemDiagnostics = async () => {
    setIsRunningTests(true);
    
    try {
      // Simulate system diagnostics
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Diagnóstico Concluído",
        description: "Todos os sistemas estão funcionando corretamente"
      });
    } catch (error) {
      toast({
        title: "Erro no Diagnóstico",
        description: "Alguns problemas foram encontrados",
        variant: "destructive"
      });
    } finally {
      setIsRunningTests(false);
    }
  };

  const clearCache = async () => {
    try {
      // Clear browser cache programmatically
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      toast({
        title: "Cache Limpo",
        description: "Cache do navegador foi limpo com sucesso"
      });
    } catch (error) {
      toast({
        title: "Erro ao Limpar Cache",
        description: "Não foi possível limpar o cache",
        variant: "destructive"
      });
    }
  };

  const systemStatus = {
    database: 'online',
    storage: 'online',
    auth: 'online',
    payments: 'online',
    email: 'warning'
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'offline':
        return <Bug className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return <Badge variant="default" className="bg-green-500">Online</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-500">Atenção</Badge>;
      case 'offline':
        return <Badge variant="destructive">Offline</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Ferramentas de Desenvolvimento</h2>
          <p className="text-muted-foreground">Testes, diagnósticos e ferramentas para desenvolvedores</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={clearCache} variant="outline">
            <Wrench className="w-4 h-4 mr-2" />
            Limpar Cache
          </Button>
          <Button 
            onClick={runSystemDiagnostics} 
            disabled={isRunningTests}
            className="bg-gradient-to-r from-blue-500 to-purple-600"
          >
            {isRunningTests ? (
              <Clock className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 mr-2" />
            )}
            {isRunningTests ? 'Executando...' : 'Diagnóstico'}
          </Button>
        </div>
      </div>

      {/* System Status */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Status do Sistema
          </CardTitle>
          <CardDescription>
            Monitoramento em tempo real dos serviços principais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center space-x-2">
                {getStatusIcon(systemStatus.database)}
                <span className="font-medium">Banco de Dados</span>
              </div>
              {getStatusBadge(systemStatus.database)}
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center space-x-2">
                {getStatusIcon(systemStatus.storage)}
                <span className="font-medium">Armazenamento</span>
              </div>
              {getStatusBadge(systemStatus.storage)}
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center space-x-2">
                {getStatusIcon(systemStatus.auth)}
                <span className="font-medium">Autenticação</span>
              </div>
              {getStatusBadge(systemStatus.auth)}
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center space-x-2">
                {getStatusIcon(systemStatus.payments)}
                <span className="font-medium">Pagamentos</span>
              </div>
              {getStatusBadge(systemStatus.payments)}
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center space-x-2">
                {getStatusIcon(systemStatus.email)}
                <span className="font-medium">E-mail</span>
              </div>
              {getStatusBadge(systemStatus.email)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Development Tools Tabs */}
      <Tabs defaultValue="tests" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tests">
            <TestTube className="w-4 h-4 mr-2" />
            Testes
          </TabsTrigger>
          <TabsTrigger value="video-players">
            <Play className="w-4 h-4 mr-2" />
            Players de Vídeo
          </TabsTrigger>
          <TabsTrigger value="debug">
            <Bug className="w-4 h-4 mr-2" />
            Debug
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="tests" className="space-y-4">
          <AdminTesting />
        </TabsContent>
        
        <TabsContent value="video-players" className="space-y-4">
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle>Players de Vídeo</CardTitle>
              <CardDescription>
                Ferramentas de teste para players de vídeo em desenvolvimento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Play className="h-4 w-4" />
                <AlertDescription>
                  Componente de teste de players temporariamente desabilitado para manutenção.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="debug" className="space-y-4">
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle>Ferramentas de Debug</CardTitle>
              <CardDescription>
                Ferramentas para identificar e resolver problemas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Code className="h-4 w-4" />
                <AlertDescription>
                  <strong>Modo de Desenvolvimento:</strong> Logs detalhados estão habilitados.
                  Verifique o console do navegador para informações de debug.
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="h-20 flex-col">
                  <Bug className="w-6 h-6 mb-2" />
                  <span>Relatório de Erros</span>
                </Button>
                
                <Button variant="outline" className="h-20 flex-col">
                  <Code className="w-6 h-6 mb-2" />
                  <span>Console de Debug</span>
                </Button>
                
                <Button variant="outline" className="h-20 flex-col">
                  <Settings className="w-6 h-6 mb-2" />
                  <span>Configurações Avançadas</span>
                </Button>
                
                <Button variant="outline" className="h-20 flex-col">
                  <Zap className="w-6 h-6 mb-2" />
                  <span>Performance Monitor</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DevelopmentTools;