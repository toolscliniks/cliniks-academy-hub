import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Clock, Star, BookOpen, Users, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/auth/authContext';

interface Course {
  id: string;
  title: string;
  description: string;
  cover_image_url: string;
  instructor_name: string;
  duration_hours: number;
  difficulty_level: string;
  category: string;
  price: number;
  currency: string;
  is_featured: boolean;
  trailer_video_url: string;
}

interface CoursePackage {
  id: string;
  name: string;
  description: string;
  original_price: number;
  sale_price: number;
  discount_percentage: number;
  courses: Course[];
}

interface CoursePlan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  courses: Course[];
}

const CursosPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('courses');

  // Buscar cursos
  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('is_published', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Course[];
    },
  });

  // Buscar pacotes
  const { data: packages, isLoading: packagesLoading } = useQuery({
    queryKey: ['course-packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_packages')
        .select(`
          *,
          package_courses (
            course_id,
            courses (*)
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return data.map(pkg => ({
        ...pkg,
        courses: pkg.package_courses.map((pc: any) => pc.courses)
      })) as CoursePackage[];
    },
  });

  // Buscar planos
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['course-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_plans')
        .select(`
          *,
          plan_courses (
            course_id,
            courses (*)
          )
        `)
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      if (error) throw error;
      
      return data.map(plan => ({
        ...plan,
        courses: plan.plan_courses.map((pc: any) => pc.courses)
      })) as CoursePlan[];
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handlePurchase = async (type: 'course' | 'package' | 'plan', itemId: string, billingType: string = 'BOLETO') => {
    if (!user) {
      toast({
        title: 'Login necessário',
        description: 'Faça login para comprar cursos',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('purchase-course', {
        body: {
          type,
          item_id: itemId,
          billing_type: billingType
        }
      });

      if (error) throw error;

      if (data.payment_url) {
        window.open(data.payment_url, '_blank');
        toast({
          title: 'Redirecionando para pagamento',
          description: 'Você será redirecionado para completar o pagamento'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erro na compra',
        description: error.message || 'Erro ao processar compra',
        variant: 'destructive'
      });
    }
  };

  const CourseCard = ({ course }: { course: Course }) => (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
      <div className="relative">
        <img
          src={course.cover_image_url || '/placeholder-course.jpg'}
          alt={course.title}
          className="w-full h-48 object-cover rounded-t-lg"
        />
        {course.is_featured && (
          <Badge className="absolute top-2 right-2 bg-yellow-500">
            <Star className="w-3 h-3 mr-1" />
            Destaque
          </Badge>
        )}
        {course.trailer_video_url && (
          <Button
            size="sm"
            className="absolute bottom-2 right-2"
            onClick={() => window.open(course.trailer_video_url, '_blank')}
          >
            <Play className="w-4 h-4 mr-1" />
            Preview
          </Button>
        )}
      </div>
      
      <CardHeader className="flex-grow">
        <div className="flex justify-between items-start mb-2">
          <Badge variant="outline">{course.category}</Badge>
          <Badge variant="secondary">{course.difficulty_level}</Badge>
        </div>
        <CardTitle className="text-lg">{course.title}</CardTitle>
        <CardDescription className="line-clamp-3">
          {course.description}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-1" />
            {course.instructor_name}
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            {course.duration_hours}h
          </div>
        </div>
        
        <div className="text-2xl font-bold text-green-600 mb-2">
          {formatCurrency(course.price)}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col space-y-2">
        <Button 
          className="w-full"
          variant="outline"
          onClick={() => navigate(`/cursos/${course.id}`)}
        >
          <BookOpen className="w-4 h-4 mr-2" />
          Ver Detalhes
        </Button>
        <Button 
          className="w-full"
          onClick={() => handlePurchase('course', course.id)}
        >
          Comprar Agora
        </Button>
      </CardFooter>
    </Card>
  );

  const PackageCard = ({ pkg }: { pkg: CoursePackage }) => (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow border-2 border-orange-200">
      <CardHeader>
        <div className="flex justify-between items-start mb-2">
          <Badge className="bg-orange-500">Pacote</Badge>
          <Badge variant="destructive">
            -{pkg.discount_percentage}%
          </Badge>
        </div>
        <CardTitle className="text-xl">{pkg.name}</CardTitle>
        <CardDescription>{pkg.description}</CardDescription>
      </CardHeader>

      <CardContent className="flex-grow">
        <div className="mb-4">
          <div className="text-sm text-gray-500 line-through">
            De: {formatCurrency(pkg.original_price)}
          </div>
          <div className="text-2xl font-bold text-orange-600">
            Por: {formatCurrency(pkg.sale_price)}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Cursos incluídos:</h4>
          {pkg.courses.map((course) => (
            <div key={course.id} className="flex items-center text-sm">
              <BookOpen className="w-3 h-3 mr-2 text-gray-400" />
              {course.title}
            </div>
          ))}
        </div>
      </CardContent>

      <CardFooter>
        <Button 
          className="w-full bg-orange-600 hover:bg-orange-700"
          onClick={() => handlePurchase('package', pkg.id)}
        >
          <Award className="w-4 h-4 mr-2" />
          Comprar Pacote
        </Button>
      </CardFooter>
    </Card>
  );

  const PlanCard = ({ plan }: { plan: CoursePlan }) => (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow border-2 border-blue-200">
      <CardHeader>
        <Badge className="bg-blue-500 w-fit">Plano Recorrente</Badge>
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>

      <CardContent className="flex-grow">
        <div className="mb-4">
          <div className="text-2xl font-bold text-blue-600 mb-1">
            {formatCurrency(plan.price_monthly)}/mês
          </div>
          <div className="text-sm text-gray-600">
            ou {formatCurrency(plan.price_yearly)}/ano
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <h4 className="font-semibold text-sm">Recursos:</h4>
          {plan.features.map((feature, index) => (
            <div key={index} className="flex items-center text-sm">
              <Star className="w-3 h-3 mr-2 text-blue-400" />
              {feature}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-sm">
            Acesso a {plan.courses.length} cursos:
          </h4>
          {plan.courses.slice(0, 3).map((course) => (
            <div key={course.id} className="flex items-center text-sm">
              <BookOpen className="w-3 h-3 mr-2 text-gray-400" />
              {course.title}
            </div>
          ))}
          {plan.courses.length > 3 && (
            <div className="text-sm text-gray-500">
              +{plan.courses.length - 3} cursos adicionais
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col space-y-2">
        <Button 
          className="w-full bg-blue-600 hover:bg-blue-700"
          onClick={() => handlePurchase('plan', plan.id)}
        >
          Assinar Plano Mensal
        </Button>
        <Button 
          variant="outline"
          className="w-full"
          onClick={() => handlePurchase('plan', plan.id)}
        >
          Assinar Plano Anual
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Academia Cliniks
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Aprenda com os melhores profissionais da área estética. 
            Cursos práticos, certificados reconhecidos e acesso vitalício.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="courses">Cursos Individuais</TabsTrigger>
            <TabsTrigger value="packages">Pacotes</TabsTrigger>
            <TabsTrigger value="plans">Planos Recorrentes</TabsTrigger>
          </TabsList>

          <TabsContent value="courses">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {coursesLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="h-96 animate-pulse">
                    <div className="bg-gray-200 h-48 rounded-t-lg"></div>
                    <CardHeader>
                      <div className="bg-gray-200 h-4 rounded mb-2"></div>
                      <div className="bg-gray-200 h-6 rounded mb-2"></div>
                      <div className="bg-gray-200 h-4 rounded"></div>
                    </CardHeader>
                  </Card>
                ))
              ) : (
                courses?.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="packages">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packagesLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="h-96 animate-pulse">
                    <CardHeader>
                      <div className="bg-gray-200 h-6 rounded mb-2"></div>
                      <div className="bg-gray-200 h-4 rounded"></div>
                    </CardHeader>
                  </Card>
                ))
              ) : (
                packages?.map((pkg) => (
                  <PackageCard key={pkg.id} pkg={pkg} />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="plans">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plansLoading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <Card key={i} className="h-96 animate-pulse">
                    <CardHeader>
                      <div className="bg-gray-200 h-6 rounded mb-2"></div>
                      <div className="bg-gray-200 h-4 rounded"></div>
                    </CardHeader>
                  </Card>
                ))
              ) : (
                plans?.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CursosPage;