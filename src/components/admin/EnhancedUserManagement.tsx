import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, Search, Mail, Calendar, UserCheck, Edit, Save, Plus, 
  BookOpen, CreditCard, Activity, Eye, Settings, Key, Gift 
} from 'lucide-react';

interface User {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string;
  role: string;
  created_at: string;
  whatsapp?: string;
}

interface Course {
  id: string;
  title: string;
  price: number;
}

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
}

interface UserEnrollment {
  id: string;
  course_id: string;
  enrolled_at: string;
  courses: {
    title: string;
  };
}

interface UserInvoice {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  paid_at?: string;
  courses?: {
    title: string;
  };
}

const EnhancedUserManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userEnrollments, setUserEnrollments] = useState<UserEnrollment[]>([]);
  const [userInvoices, setUserInvoices] = useState<UserInvoice[]>([]);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [enrollmentType, setEnrollmentType] = useState<'course' | 'plan'>('course');

  useEffect(() => {
    fetchUsers();
    fetchCourses();
    fetchPlans();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar usuários",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, price')
        .eq('is_published', true);

      if (error) throw error;
      setCourses(data || []);
    } catch (error: any) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('id, name, price_monthly')
        .eq('is_active', true);

      if (error) throw error;
      setPlans(data || []);
    } catch (error: any) {
      console.error('Error fetching plans:', error);
    }
  };

  const fetchUserDetails = async (userId: string) => {
    try {
      // Fetch enrollments
      const { data: enrollments, error: enrollError } = await supabase
        .from('course_enrollments')
        .select(`
          id,
          course_id,
          enrolled_at,
          courses(title)
        `)
        .eq('user_id', userId);

      if (enrollError) throw enrollError;
      setUserEnrollments(enrollments || []);

      // Fetch invoices
      const { data: invoices, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          id,
          amount,
          status,
          created_at,
          paid_at,
          courses(title)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (invoiceError) throw invoiceError;
      setUserInvoices(invoices || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar detalhes do usuário",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleUserClick = async (user: User) => {
    setSelectedUser(user);
    await fetchUserDetails(user.id);
    setIsUserDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: selectedUser.full_name,
          email: selectedUser.email,
          role: selectedUser.role,
          whatsapp: selectedUser.whatsapp
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      setUsers(users.map(u => 
        u.id === selectedUser.id ? selectedUser : u
      ));

      toast({
        title: "Usuário atualizado",
        description: "Os dados do usuário foram atualizados com sucesso"
      });

      setIsUserDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEnrollUser = async () => {
    if (!selectedUser) return;

    if (enrollmentType === 'course' && !selectedCourse) {
      toast({
        title: "Erro",
        description: "Selecione um curso",
        variant: "destructive"
      });
      return;
    }

    if (enrollmentType === 'plan' && !selectedPlan) {
      toast({
        title: "Erro",
        description: "Selecione um plano",
        variant: "destructive"
      });
      return;
    }

    try {
      if (enrollmentType === 'course') {
        // Check if already enrolled
        const { data: existing } = await supabase
          .from('course_enrollments')
          .select('id')
          .eq('user_id', selectedUser.id)
          .eq('course_id', selectedCourse)
          .maybeSingle();

        if (existing) {
          toast({
            title: "Usuário já matriculado",
            description: "O usuário já está matriculado neste curso",
            variant: "destructive"
          });
          return;
        }

        const { error } = await supabase
          .from('course_enrollments')
          .insert({
            user_id: selectedUser.id,
            course_id: selectedCourse
          });

        if (error) throw error;

        toast({
          title: "Matrícula realizada!",
          description: "Usuário matriculado com sucesso no curso"
        });
      } else {
        const { error } = await supabase
          .from('subscriptions')
          .insert({
            user_id: selectedUser.id,
            plan_id: selectedPlan,
            status: 'active',
            starts_at: new Date().toISOString()
          });

        if (error) throw error;

        toast({
          title: "Assinatura criada!",
          description: "Usuário inscrito com sucesso no plano"
        });
      }

      setIsEnrollDialogOpen(false);
      setSelectedCourse('');
      setSelectedPlan('');
      await fetchUserDetails(selectedUser.id);
    } catch (error: any) {
      toast({
        title: "Erro ao matricular usuário",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'moderator':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando usuários...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Gestão Completa de Usuários</h2>
          <p className="text-muted-foreground">Gerencie usuários, matrículas, pagamentos e dados pessoais</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Usuários</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Administradores</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.role === 'admin').length}
                </p>
              </div>
              <UserCheck className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Usuários Ativos</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.role === 'user' || !u.role).length}
                </p>
              </div>
              <Activity className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Novos (30 dias)</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => {
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    return new Date(u.created_at) > thirtyDaysAgo;
                  }).length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Buscar usuários por nome ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((user) => (
          <Card 
            key={user.id} 
            className="bg-gradient-card border-border/50 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleUserClick(user)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>
                      {user.full_name ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">
                      {user.full_name || 'Nome não informado'}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {user.email}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={getRoleColor(user.role || 'user')}>
                  {user.role === 'admin' ? 'Admin' : 
                   user.role === 'moderator' ? 'Moderador' : 'Usuário'}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Mail className="w-4 h-4 mr-2" />
                  <span className="truncate">{user.email}</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>Cadastro: {formatDate(user.created_at)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* User Details Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Usuário</DialogTitle>
            <DialogDescription>
              Gerencie informações pessoais, matrículas e pagamentos
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="personal">Dados Pessoais</TabsTrigger>
                <TabsTrigger value="enrollments">Matrículas</TabsTrigger>
                <TabsTrigger value="payments">Pagamentos</TabsTrigger>
                <TabsTrigger value="actions">Ações</TabsTrigger>
              </TabsList>
              
              <TabsContent value="personal" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome Completo</Label>
                    <Input
                      id="fullName"
                      value={selectedUser.full_name || ''}
                      onChange={(e) => setSelectedUser({
                        ...selectedUser,
                        full_name: e.target.value
                      })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={selectedUser.email || ''}
                      onChange={(e) => setSelectedUser({
                        ...selectedUser,
                        email: e.target.value
                      })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp</Label>
                    <Input
                      id="whatsapp"
                      value={selectedUser.whatsapp || ''}
                      onChange={(e) => setSelectedUser({
                        ...selectedUser,
                        whatsapp: e.target.value
                      })}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="role">Função</Label>
                    <Select
                      value={selectedUser.role || 'user'}
                      onValueChange={(value) => setSelectedUser({
                        ...selectedUser,
                        role: value
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuário</SelectItem>
                        <SelectItem value="moderator">Moderador</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="enrollments" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold">Cursos Matriculados</h4>
                  <Button 
                    size="sm" 
                    onClick={() => setIsEnrollDialogOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Matrícula
                  </Button>
                </div>
                
                {userEnrollments.length > 0 ? (
                  <div className="space-y-2">
                    {userEnrollments.map((enrollment) => (
                      <Card key={enrollment.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-medium">{enrollment.courses.title}</h5>
                            <p className="text-sm text-muted-foreground">
                              Matriculado em: {formatDate(enrollment.enrolled_at)}
                            </p>
                          </div>
                          <Badge variant="default">Ativo</Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma matrícula encontrada
                  </p>
                )}
              </TabsContent>
              
              <TabsContent value="payments" className="space-y-4">
                <h4 className="text-lg font-semibold">Histórico de Pagamentos</h4>
                
                {userInvoices.length > 0 ? (
                  <div className="space-y-2">
                    {userInvoices.map((invoice) => (
                      <Card key={invoice.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-medium">
                              {invoice.courses?.title || 'Pagamento'}
                            </h5>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(invoice.amount)} - {formatDate(invoice.created_at)}
                            </p>
                            {invoice.paid_at && (
                              <p className="text-xs text-muted-foreground">
                                Pago em: {formatDate(invoice.paid_at)}
                              </p>
                            )}
                          </div>
                          <Badge variant={getStatusColor(invoice.status)}>
                            {invoice.status === 'paid' ? 'Pago' : 
                             invoice.status === 'pending' ? 'Pendente' : 'Falhou'}
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum pagamento encontrado
                  </p>
                )}
              </TabsContent>
              
              <TabsContent value="actions" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEnrollDialogOpen(true)}
                    className="h-20 flex-col"
                  >
                    <Gift className="w-6 h-6 mb-2" />
                    Liberar Curso/Plano
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col"
                    disabled
                  >
                    <Key className="w-6 h-6 mb-2" />
                    Redefinir Senha
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUserDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveUser}>
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enrollment Dialog */}
      <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Matrícula</DialogTitle>
            <DialogDescription>
              Libere acesso a cursos ou planos para o usuário
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Liberação</Label>
              <Select
                value={enrollmentType}
                onValueChange={(value: 'course' | 'plan') => setEnrollmentType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="course">Curso Individual</SelectItem>
                  <SelectItem value="plan">Plano de Assinatura</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {enrollmentType === 'course' && (
              <div className="space-y-2">
                <Label>Curso</Label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um curso" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title} - {formatCurrency(course.price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {enrollmentType === 'plan' && (
              <div className="space-y-2">
                <Label>Plano</Label>
                <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - {formatCurrency(plan.price_monthly)}/mês
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEnrollDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEnrollUser}>
              <Plus className="w-4 h-4 mr-2" />
              Liberar Acesso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedUserManagement;