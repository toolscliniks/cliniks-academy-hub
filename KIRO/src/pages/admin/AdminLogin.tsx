import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { adminLogin, isAdmin, adminLoading } = useAdmin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Limpar qualquer sessão existente ao carregar a página de login
  useEffect(() => {
    const clearExistingSessions = async () => {
      try {
        // Verificar se há uma sessão ativa do Supabase
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          console.log('Sessão existente detectada na página de login admin, fazendo logout...');
          console.log('ID da sessão:', data.session.access_token.substring(0, 10) + '...');
          await supabase.auth.signOut();
          console.log('Logout realizado com sucesso');
          
          // Limpar também o localStorage para garantir que não haja dados administrativos residuais
          localStorage.removeItem('cliniks_admin_auth');
          localStorage.removeItem('cliniks_admin_data');
          console.log('Dados administrativos do localStorage removidos');
        } else {
          console.log('Nenhuma sessão ativa detectada na página de login admin');
        }
      } catch (error) {
        console.error('Erro ao verificar/limpar sessão existente:', error);
      }
    };
    
    clearExistingSessions();
  }, []);
  
  // Redirecionar se já estiver autenticado como admin
  useEffect(() => {
    if (isAdmin) {
      console.log('Usuário já autenticado como admin, redirecionando...');
      navigate('/admin');
    }
  }, [isAdmin, navigate]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      console.warn('Tentativa de login administrativo com campos vazios');
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos",
        variant: "destructive"
      });
      return;
    }
    
    try {
      console.log(`Tentando login administrativo com email: ${email}`);
      setLoading(true);
      
      // Verificar se há alguma sessão ativa antes de tentar login
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        console.log('Sessão existente detectada antes do login, fazendo logout primeiro...');
        await supabase.auth.signOut();
      }
      
      await adminLogin(email, password);
      console.log('Login administrativo bem-sucedido, aguardando redirecionamento...');
      // O redirecionamento será feito pelo useEffect quando isAdmin mudar
    } catch (error) {
      // Erro já é tratado no hook useAdminAuth, mas podemos adicionar tratamento específico aqui
      console.error('Erro no login administrativo:', error instanceof Error ? error.message : error);
      
      // Adicionar mensagem de erro mais específica
      if (error instanceof Error && error.message.includes('Usuário não é um administrador')) {
        toast({
          title: "Acesso negado",
          description: "Este usuário não tem permissões administrativas",
          variant: "destructive"
        });
      }
      
      setPassword(''); // Limpar senha por segurança
    } finally {
      setLoading(false);
    }
  };
  
  if (adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Painel Administrativo</CardTitle>
          <CardDescription className="text-center">
            Entre com suas credenciais administrativas
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default AdminLogin;
