import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, UserPlus, BookOpen, Package, Calendar } from 'lucide-react';

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
  currency: string;
}

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
}

interface Enrollment {
  id: string;
  enrolled_at: string;
  courses: {
    title: string;
  };
  profiles: {
    full_name: string;
    email: string;
  };
}

const ManualEnrollment = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [recentEnrollments, setRecentEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [enrollmentType, setEnrollmentType] = useState<'course' | 'plan'>('course');

  useEffect(() => {
    fetchUsers();
    fetchCourses();
    fetchPlans();
    fetchRecentEnrollments();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, price, currency')
        .eq('is_published', true)
        .order('title');

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
        .select('id, name, price_monthly, price_yearly')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setPlans(data || []);
    } catch (error: any) {
      console.error('Error fetching plans:', error);
    }
  };

  const fetchRecentEnrollments = async () => {
    try {
      const { data, error } = await supabase
        .from('course_enrollments')
        .select(`
          id,
          enrolled_at,
          courses(title),
          profiles(full_name, email)
        `)
        .order('enrolled_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentEnrollments(data || []);
    } catch (error: any) {
      console.error('Error fetching enrollments:', error);
    }
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

    setLoading(true);

    try {
      if (enrollmentType === 'course') {
        // Check if user is already enrolled
        const { data: existingEnrollment } = await supabase
          .from('course_enrollments')
          .select('id')
          .eq('user_id', selectedUser)
          .eq('course_id', selectedCourse)
          .maybeSingle();

        if (existingEnrollment) {
          toast({
            title: "Usuário já matriculado",
            description: "O usuário já está matriculado neste curso",
            variant: "destructive"
          });
          return;
        }

        // Enroll user in course
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
        // Create subscription for user
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

      // Reset form
      setSelectedUser('');
      setSelectedCourse('');
      setSelectedPlan('');
      
      // Refresh recent enrollments
      fetchRecentEnrollments();

    } catch (error: any) {
      toast({
        title: "Erro ao matricular usuário",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Atribuição Manual</h2>
          <p className="text-muted-foreground">Matricule usuários em cursos ou planos manualmente</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enrollment Form */}
        <div className="lg:col-span-2">
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5" />
                <span>Nova Matrícula</span>
              </CardTitle>
              <CardDescription>
                Atribua acesso manual a cursos ou planos para usuários específicos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Enrollment Type */}
              <div className="space-y-2">
                <Label>Tipo de Acesso</Label>
                <Select value={enrollmentType} onValueChange={(value: 'course' | 'plan') => setEnrollmentType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="course">Curso Individual</SelectItem>
                    <SelectItem value="plan">Plano/Assinatura</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* User Search and Selection */}
              <div className="space-y-2">
                <Label>Buscar Usuário</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Digite o nome ou email do usuário..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {searchTerm && (
                  <div className="max-h-40 overflow-y-auto border rounded-lg bg-popover">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className={`p-3 cursor-pointer hover:bg-muted/50 border-b last:border-b-0 ${
                          selectedUser === user.id ? 'bg-primary/10' : ''
                        }`}
                        onClick={() => {
                          setSelectedUser(user.id);
                          setSearchTerm(user.full_name || user.email);
                        }}
                      >
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback>
                              {user.full_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">
                              {user.full_name || 'Nome não informado'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Course/Plan Selection */}
              {enrollmentType === 'course' ? (
                <div className="space-y-2">
                  <Label>Selecionar Curso</Label>
                  <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um curso..." />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{course.title}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {formatCurrency(course.price, course.currency)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Selecionar Plano</Label>
                  <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um plano..." />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{plan.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {formatCurrency(plan.price_monthly || 0)} / mês
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button 
                onClick={handleEnrollUser} 
                className="w-full"
                disabled={loading || !selectedUser || (enrollmentType === 'course' ? !selectedCourse : !selectedPlan)}
              >
                {loading ? (
                  "Processando..."
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    {enrollmentType === 'course' ? 'Matricular no Curso' : 'Inscrever no Plano'}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Enrollments */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Matrículas Recentes</span>
            </CardTitle>
            <CardDescription>
              Últimas matrículas realizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentEnrollments.map((enrollment) => (
                <div key={enrollment.id} className="p-3 bg-muted/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs">
                      <BookOpen className="w-3 h-3 mr-1" />
                      Curso
                    </Badge>
                  </div>
                  
                  <h4 className="font-medium text-sm mb-1">
                    {enrollment.courses?.title}
                  </h4>
                  
                  <p className="text-xs text-muted-foreground mb-2">
                    {enrollment.profiles?.full_name || 'Nome não informado'}
                  </p>
                  
                  <p className="text-xs text-muted-foreground">
                    {formatDate(enrollment.enrolled_at)}
                  </p>
                </div>
              ))}
              
              {recentEnrollments.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Nenhuma matrícula recente</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManualEnrollment;