import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, Check, X, BookOpen } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  is_active: boolean;
  courses?: Course[];
}

const AdminPlans = () => {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isManagingCourses, setIsManagingCourses] = useState(false);
  const [selectedPlanForCourses, setSelectedPlanForCourses] = useState<Plan | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_monthly: 0,
    price_yearly: 0,
    features: '',
    is_active: true
  });

  useEffect(() => {
    fetchPlans();
    fetchCourses();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data: plansData, error } = await supabase
        .from('plans')
        .select(`
          *,
          plan_courses (
            courses (
              id,
              title,
              description
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const plansWithCourses = plansData?.map(plan => ({
        ...plan,
        courses: plan.plan_courses?.map((pc: any) => pc.courses) || []
      })) || [];
      
      setPlans(plansWithCourses);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar planos",
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
        .select('id, title, description')
        .eq('is_published', true)
        .order('title');

      if (error) throw error;
      setCourses(data || []);
    } catch (error: any) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const planData = {
      ...formData,
      features: formData.features.split('\n').filter(f => f.trim())
    };
    
    try {
      if (editingPlan) {
        const { error } = await supabase
          .from('plans')
          .update(planData)
          .eq('id', editingPlan.id);
          
        if (error) throw error;
        
        toast({
          title: "Plano atualizado!",
          description: "As alterações foram salvas com sucesso."
        });
      } else {
        const { error } = await supabase
          .from('plans')
          .insert([planData]);
          
        if (error) throw error;
        
        toast({
          title: "Plano criado!",
          description: "O novo plano foi adicionado à plataforma."
        });
      }
      
      fetchPlans();
      setIsCreateOpen(false);
      setEditingPlan(null);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price_monthly: 0,
      price_yearly: 0,
      features: '',
      is_active: true
    });
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      price_monthly: plan.price_monthly || 0,
      price_yearly: plan.price_yearly || 0,
      features: plan.features?.join('\n') || '',
      is_active: plan.is_active
    });
    setIsCreateOpen(true);
  };

  const handleDelete = async (planId: string) => {
    if (!confirm('Tem certeza que deseja excluir este plano?')) return;
    
    try {
      const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', planId);
        
      if (error) throw error;
      
      toast({
        title: "Plano excluído!",
        description: "O plano foi removido da plataforma."
      });
      
      fetchPlans();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const togglePlanStatus = async (planId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('plans')
        .update({ is_active: !currentStatus })
        .eq('id', planId);
        
      if (error) throw error;
      
      toast({
        title: "Status atualizado!",
        description: `Plano ${!currentStatus ? 'ativado' : 'desativado'} com sucesso.`
      });
      
      fetchPlans();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleManageCourses = (plan: Plan) => {
    setSelectedPlanForCourses(plan);
    setSelectedCourses(plan.courses?.map(c => c.id) || []);
    setIsManagingCourses(true);
  };

  const handleSaveCourses = async () => {
    if (!selectedPlanForCourses) return;

    try {
      // Remove existing plan-course relationships
      await supabase
        .from('plan_courses')
        .delete()
        .eq('plan_id', selectedPlanForCourses.id);

      // Add new relationships
      if (selectedCourses.length > 0) {
        const planCourses = selectedCourses.map(courseId => ({
          plan_id: selectedPlanForCourses.id,
          course_id: courseId
        }));

        const { error } = await supabase
          .from('plan_courses')
          .insert(planCourses);

        if (error) throw error;
      }

      toast({
        title: "Cursos atualizados!",
        description: "Os cursos do plano foram atualizados com sucesso."
      });

      setIsManagingCourses(false);
      setSelectedPlanForCourses(null);
      setSelectedCourses([]);
      fetchPlans();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando planos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Gerenciar Planos</h2>
          <p className="text-muted-foreground">Crie e gerencie os planos de assinatura e associe cursos</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingPlan(null); }}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Plano
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingPlan ? 'Editar Plano' : 'Criar Novo Plano'}
              </DialogTitle>
              <DialogDescription>
                Configure os detalhes do plano de assinatura
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Plano</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Plano Premium"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.value === 'active' }))}
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva o que este plano oferece"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthly">Preço Mensal (R$)</Label>
                  <Input
                    id="monthly"
                    type="number"
                    step="0.01"
                    value={formData.price_monthly}
                    onChange={(e) => setFormData(prev => ({ ...prev, price_monthly: parseFloat(e.target.value) }))}
                    placeholder="99.90"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="yearly">Preço Anual (R$)</Label>
                  <Input
                    id="yearly"
                    type="number"
                    step="0.01"
                    value={formData.price_yearly}
                    onChange={(e) => setFormData(prev => ({ ...prev, price_yearly: parseFloat(e.target.value) }))}
                    placeholder="999.90"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="features">Recursos (um por linha)</Label>
                <Textarea
                  id="features"
                  value={formData.features}
                  onChange={(e) => setFormData(prev => ({ ...prev, features: e.target.value }))}
                  placeholder="Acesso a todos os cursos&#10;Certificados de conclusão&#10;Suporte prioritário"
                  rows={5}
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingPlan ? 'Salvar Alterações' : 'Criar Plano'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card key={plan.id} className="bg-gradient-card border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <Badge variant={plan.is_active ? "default" : "secondary"}>
                  {plan.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Mensal:</span>
                  <span className="font-semibold">
                    R$ {plan.price_monthly?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Anual:</span>
                  <span className="font-semibold">
                    R$ {plan.price_yearly?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>
              
              {plan.features && plan.features.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Recursos:</h4>
                  <ul className="space-y-1">
                    {plan.features.slice(0, 3).map((feature, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <Check className="w-3 h-3 text-primary mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                    {plan.features.length > 3 && (
                      <li className="text-sm text-muted-foreground">
                        +{plan.features.length - 3} recursos adicionais
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {plan.courses && plan.courses.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Cursos Inclusos:</h4>
                  <ul className="space-y-1">
                    {plan.courses.slice(0, 2).map((course, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <BookOpen className="w-3 h-3 text-primary mr-2 flex-shrink-0" />
                        {course.title}
                      </li>
                    ))}
                    {plan.courses.length > 2 && (
                      <li className="text-sm text-muted-foreground">
                        +{plan.courses.length - 2} cursos adicionais
                      </li>
                    )}
                  </ul>
                </div>
              )}
              
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(plan)}>
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleManageCourses(plan)}>
                  <BookOpen className="w-4 h-4 mr-1" />
                  Cursos
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => togglePlanStatus(plan.id, plan.is_active)}
                >
                  {plan.is_active ? (
                    <X className="w-4 h-4 mr-1" />
                  ) : (
                    <Check className="w-4 h-4 mr-1" />
                  )}
                  {plan.is_active ? 'Desativar' : 'Ativar'}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(plan.id)}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {plans.length === 0 && (
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="text-center py-12">
            <Plus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum plano encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Crie o primeiro plano de assinatura para sua plataforma
            </p>
            <Button onClick={() => { resetForm(); setEditingPlan(null); setIsCreateOpen(true); }}>
              Criar Primeiro Plano
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Manage Courses Dialog */}
      <Dialog open={isManagingCourses} onOpenChange={setIsManagingCourses}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Gerenciar Cursos - {selectedPlanForCourses?.name}
            </DialogTitle>
            <DialogDescription>
              Selecione os cursos que farão parte deste plano
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {courses.map((course) => (
              <div key={course.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                <input
                  type="checkbox"
                  id={`course-${course.id}`}
                  checked={selectedCourses.includes(course.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedCourses([...selectedCourses, course.id]);
                    } else {
                      setSelectedCourses(selectedCourses.filter(id => id !== course.id));
                    }
                  }}
                  className="rounded border-gray-300"
                />
                <label htmlFor={`course-${course.id}`} className="flex-1 cursor-pointer">
                  <div className="font-medium">{course.title}</div>
                  <div className="text-sm text-muted-foreground">{course.description}</div>
                </label>
              </div>
            ))}
            
            {courses.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum curso publicado encontrado</p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsManagingCourses(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCourses}>
              Salvar Cursos ({selectedCourses.length} selecionados)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPlans;