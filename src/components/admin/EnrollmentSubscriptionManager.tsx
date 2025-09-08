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
  UserPlus, BookOpen, Package, Calendar, Search, CreditCard, 
  TrendingUp, TrendingDown, X, RotateCcw, Users, Play, 
  CheckCircle, Clock, AlertCircle, Edit, Trash2, Plus
} from 'lucide-react';

interface User {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string;
}

interface Course {
  id: string;
  title: string;
  price: number;
  thumbnail_url?: string;
}

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  description?: string;
}

interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  progress: number;
  completed_at?: string;
  profiles: {
    full_name: string;
    email: string;
    avatar_url: string;
  };
  courses: {
    title: string;
    thumbnail_url?: string;
  };
}

interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  starts_at: string;
  ends_at?: string;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
    avatar_url: string;
  };
  plans: {
    name: string;
    price_monthly: number;
  };
}

const EnrollmentSubscriptionManager = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Manual enrollment dialog
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [enrollmentType, setEnrollmentType] = useState<'course' | 'plan'>('course');
  
  // Subscription management dialog
  const [isSubsDialogOpen, setIsSubsDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [actionType, setActionType] = useState<'cancel' | 'change' | 'renew'>('cancel');
  const [newPlanId, setNewPlanId] = useState('');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      await Promise.all([
        fetchUsers(),
        fetchCourses(),
        fetchPlans(),
        fetchEnrollments(),
        fetchSubscriptions()
      ]);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .order('full_name');
    
    if (error) throw error;
    setUsers(data || []);
  };

  const fetchCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('id, title, price, thumbnail_url')
      .eq('is_published', true)
      .order('title');
    
    if (error) throw error;
    setCourses(data || []);
  };

  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from('plans')
      .select('id, name, price_monthly, description')
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    setPlans(data || []);
  };

  const fetchEnrollments = async () => {
    const { data, error } = await supabase
      .from('course_enrollments')
      .select(`
        id,
        user_id,
        course_id,
        enrolled_at,
        progress,
        completed_at,
        profiles(
          full_name,
          email,
          avatar_url
        ),
        courses(
          title,
          thumbnail_url
        )
      `)
      .order('enrolled_at', { ascending: false });
    
    if (error) throw error;
    setEnrollments(data || []);
  };

  const fetchSubscriptions = async () => {
    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        id,
        user_id,
        plan_id,
        status,
        starts_at,
        ends_at,
        created_at,
        profiles(
          full_name,
          email,
          avatar_url
        ),
        plans(
          name,
          price_monthly
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    setSubscriptions(data || []);
  };

  const handleEnrollUser = async () => {
    if (!selectedUser) {
      toast({
        title: "Erro",
        description: "Selecione um usuário",
        variant: "destructive"
      });
      return;
    }

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
          .eq('user_id', selectedUser)
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
            user_id: selectedUser,
            course_id: selectedCourse
          });

        if (error) throw error;

        toast({
          title: "Matrícula realizada!",
          description: "Usuário matriculado com sucesso no curso"
        });
      } else {
        // Check for active subscription
        const { data: existing } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', selectedUser)
          .eq('status', 'active')
          .maybeSingle();

        if (existing) {
          toast({
            title: "Usuário já possui assinatura ativa",
            description: "Cancele a assinatura atual antes de criar uma nova",
            variant: "destructive"
          });
          return;
        }

        const { error } = await supabase
          .from('subscriptions')
          .insert({
            user_id: selectedUser,
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
      setSelectedUser('');
      setSelectedCourse('');
      setSelectedPlan('');
      await fetchAllData();
    } catch (error: any) {
      toast({
        title: "Erro ao processar solicitação",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSubscriptionAction = async () => {
    if (!selectedSubscription) return;

    try {
      let updateData: any = {};

      switch (actionType) {
        case 'cancel':
          updateData = {
            status: 'cancelled',
            ends_at: new Date().toISOString()
          };
          break;
        case 'change':
          if (!newPlanId) {
            toast({
              title: "Erro",
              description: "Selecione um novo plano",
              variant: "destructive"
            });
            return;
          }
          updateData = {
            plan_id: newPlanId
          };
          break;
        case 'renew':
          const nextMonth = new Date();
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          updateData = {
            status: 'active',
            ends_at: nextMonth.toISOString()
          };
          break;
      }

      const { error } = await supabase
        .from('subscriptions')
        .update(updateData)
        .eq('id', selectedSubscription.id);

      if (error) throw error;

      toast({
        title: "Assinatura atualizada!",
        description: `Ação '${actionType}' executada com sucesso`
      });

      setIsSubsDialogOpen(false);
      setSelectedSubscription(null);
      setNewPlanId('');
      await fetchSubscriptions();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar assinatura",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const filteredEnrollments = enrollments.filter(enrollment => {
    const matchesSearch = 
      enrollment.profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.profiles.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.courses.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'completed') return matchesSearch && enrollment.completed_at;
    if (statusFilter === 'in_progress') return matchesSearch && !enrollment.completed_at && enrollment.progress > 0;
    if (statusFilter === 'not_started') return matchesSearch && enrollment.progress === 0;
    
    return matchesSearch;
  });

  const filteredSubscriptions = subscriptions.filter(subscription => {
    const matchesSearch = 
      subscription.profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subscription.profiles.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subscription.plans.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && subscription.status === statusFilter;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const getProgressColor = (progress: number) => {
    if (progress === 0) return 'text-gray-500';
    if (progress < 50) return 'text-yellow-500';
    if (progress < 100) return 'text-blue-500';
    return 'text-green-500';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Ativo</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelado</Badge>;
      case 'expired':
        return <Badge variant="secondary">Expirado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando dados...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Matrículas & Assinaturas</h2>
          <p className="text-muted-foreground">Gerencie matrículas em cursos e assinaturas de planos</p>
        </div>
        <Button onClick={() => setIsEnrollDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Matrícula
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Matrículas</p>
                <p className="text-2xl font-bold">{enrollments.length}</p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cursos Concluídos</p>
                <p className="text-2xl font-bold">
                  {enrollments.filter(e => e.completed_at).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Assinaturas Ativas</p>
                <p className="text-2xl font-bold">
                  {subscriptions.filter(s => s.status === 'active').length}
                </p>
              </div>
              <Package className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receita Mensal</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    subscriptions
                      .filter(s => s.status === 'active')
                      .reduce((sum, s) => sum + s.plans.price_monthly, 0)
                  )}
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por usuário, curso ou plano..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
            <SelectItem value="in_progress">Em Progresso</SelectItem>
            <SelectItem value="not_started">Não Iniciado</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
            <SelectItem value="expired">Expirado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="enrollments" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="enrollments">Matrículas em Cursos</TabsTrigger>
          <TabsTrigger value="subscriptions">Assinaturas de Planos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="enrollments" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {filteredEnrollments.map((enrollment) => (
              <Card key={enrollment.id} className="bg-gradient-card border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src={enrollment.profiles.avatar_url} />
                        <AvatarFallback>
                          {enrollment.profiles.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium">{enrollment.profiles.full_name}</h4>
                        <p className="text-sm text-muted-foreground">{enrollment.profiles.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-medium">{enrollment.courses.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Matriculado em: {formatDate(enrollment.enrolled_at)}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getProgressColor(enrollment.progress)}`}>
                          {enrollment.progress}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {enrollment.completed_at ? 'Concluído' : 
                           enrollment.progress > 0 ? 'Em progresso' : 'Não iniciado'}
                        </p>
                      </div>
                      
                      {enrollment.completed_at ? (
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      ) : enrollment.progress > 0 ? (
                        <Play className="w-6 h-6 text-blue-500" />
                      ) : (
                        <Clock className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="subscriptions" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {filteredSubscriptions.map((subscription) => (
              <Card key={subscription.id} className="bg-gradient-card border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src={subscription.profiles.avatar_url} />
                        <AvatarFallback>
                          {subscription.profiles.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium">{subscription.profiles.full_name}</h4>
                        <p className="text-sm text-muted-foreground">{subscription.profiles.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-medium">{subscription.plans.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(subscription.plans.price_monthly)}/mês
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          Início: {formatDate(subscription.starts_at)}
                        </p>
                        {subscription.ends_at && (
                          <p className="text-sm text-muted-foreground">
                            Fim: {formatDate(subscription.ends_at)}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(subscription.status)}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedSubscription(subscription);
                            setIsSubsDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Manual Enrollment Dialog */}
      <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Matrícula Manual</DialogTitle>
            <DialogDescription>
              Matricule um usuário em um curso ou plano manualmente
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Usuário</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name} - {user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Tipo</Label>
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
              <UserPlus className="w-4 h-4 mr-2" />
              Matricular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscription Management Dialog */}
      <Dialog open={isSubsDialogOpen} onOpenChange={setIsSubsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciar Assinatura</DialogTitle>
            <DialogDescription>
              Altere o status ou plano da assinatura selecionada
            </DialogDescription>
          </DialogHeader>
          
          {selectedSubscription && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/30">
                <p className="font-medium">{selectedSubscription.profiles.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedSubscription.plans.name} - {formatCurrency(selectedSubscription.plans.price_monthly)}/mês
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Ação</Label>
                <Select
                  value={actionType}
                  onValueChange={(value: 'cancel' | 'change' | 'renew') => setActionType(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cancel">Cancelar Assinatura</SelectItem>
                    <SelectItem value="change">Alterar Plano</SelectItem>
                    <SelectItem value="renew">Renovar Assinatura</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {actionType === 'change' && (
                <div className="space-y-2">
                  <Label>Novo Plano</Label>
                  <Select value={newPlanId} onValueChange={setNewPlanId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um novo plano" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.filter(p => p.id !== selectedSubscription.plan_id).map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} - {formatCurrency(plan.price_monthly)}/mês
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubscriptionAction}>
              Confirmar Ação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnrollmentSubscriptionManager;