import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, BookOpen, Users, Award, Clock, Star, ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCourses, Course } from "@/hooks/useCourses";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ModernHomepage = () => {
  const navigate = useNavigate();
  const { courses, loading } = useCourses();
  const { user } = useAuth();
  const { toast } = useToast();
  const [purchasingCourseId, setPurchasingCourseId] = useState<string | null>(null);

  const getDifficultyColor = (level: string): string => {
    switch (level) {
      case "Iniciante": return "bg-success/20 text-success border-success/30";
      case "Intermediário": return "bg-warning/20 text-warning border-warning/30";  
      case "Avançado": return "bg-destructive/20 text-destructive border-destructive/30";
      default: return "bg-muted/20 text-muted-foreground border-muted/30";
    }
  };

  const handlePurchaseCourse = async (course: Course) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      setPurchasingCourseId(course.id);
      
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { 
          courseId: course.id,
          type: 'course'
        }
      });

      if (error) throw error;

      if (data?.checkoutUrl) {
        window.open(data.checkoutUrl, '_blank');
      } else if (data?.message) {
        toast({
          title: "Sucesso!",
          description: data.message,
        });
        navigate('/dashboard');
      }
    } catch (error: any) {
      toast({
        title: "Erro no pagamento",
        description: error.message || "Erro ao processar pagamento",
        variant: "destructive"
      });
    } finally {
      setPurchasingCourseId(null);
    }
  };

  const CourseCard = ({ course }: { course: Course }) => (
    <Card className="group bg-gradient-card border-border/50 hover:border-primary/20 transition-all duration-500 hover:shadow-glow hover:scale-105 overflow-hidden">
      <div className="relative">
        {course.cover_image_url ? (
          <div className="aspect-[16/9] overflow-hidden">
            <img 
              src={course.cover_image_url} 
              alt={course.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
          </div>
        ) : (
          <div className="aspect-[16/9] bg-gradient-secondary flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-white/80" />
          </div>
        )}
        
        {/* Difficulty Badge */}
        <Badge className={`absolute top-3 left-3 ${getDifficultyColor(course.difficulty_level)} border font-medium`}>
          {course.difficulty_level}
        </Badge>
      </div>

      <CardHeader className="pb-3">
        <CardTitle className="text-lg group-hover:text-primary transition-colors duration-300 line-clamp-2">
          {course.title}
        </CardTitle>
        <CardDescription className="line-clamp-2 text-muted-foreground">
          {course.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{course.duration_hours}h</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>1.2k alunos</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-warning text-warning" />
            <span>4.8</span>
          </div>
        </div>

        {course.instructor_name && (
          <p className="text-sm text-muted-foreground mb-4">
            por <span className="text-foreground font-medium">{course.instructor_name}</span>
          </p>
        )}

        <div className="flex items-center justify-between">
          {course.price ? (
            <div className="text-2xl font-bold text-primary">
              {course.currency === 'BRL' ? 'R$' : course.currency === 'USD' ? '$' : '€'} 
              {parseFloat(course.price.toString()).toFixed(2)}
            </div>
          ) : (
            <div className="text-2xl font-bold text-success">Gratuito</div>
          )}
          
          <Button 
            onClick={() => handlePurchaseCourse(course)}
            disabled={purchasingCourseId === course.id}
            className="bg-gradient-primary hover:shadow-primary group/btn"
          >
            {purchasingCourseId === course.id ? (
              "Processando..."
            ) : (
              <>
                <Play className="w-4 h-4 group-hover/btn:animate-pulse" />
                Comprar Curso
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(127,0,250,0.1),transparent_50%)]" />
        
        <div className="container mx-auto px-4 py-20 lg:py-32 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="mb-6">
              <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2 text-sm font-medium">
                <Sparkles className="w-4 h-4 mr-2" />
                Plataforma de Ensino Premium
              </Badge>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent leading-tight">
              Transforme seu Futuro
              <span className="block bg-gradient-primary bg-clip-text text-transparent">
                com Cliniks Academy
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
              Domine as técnicas mais avançadas em estética profissional. 
              Cursos premium, certificações reconhecidas e uma comunidade de especialistas esperando por você.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button 
                variant="hero" 
                size="xl" 
                className="group shadow-glow"
                onClick={() => navigate('/auth')}
              >
                <Play className="w-5 h-5 group-hover:animate-pulse" />
                Começar Jornada Premium
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                variant="glass" 
                size="xl" 
                onClick={() => navigate('/courses')}
              >
                <BookOpen className="w-5 h-5" />
                Explorar Cursos
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center group cursor-pointer">
                <div className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
                  500+
                </div>
                <div className="text-muted-foreground">Cursos Especializados</div>
              </div>
              <div className="text-center group cursor-pointer">
                <div className="text-4xl font-bold bg-gradient-secondary bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
                  15k+
                </div>
                <div className="text-muted-foreground">Profissionais Formados</div>
              </div>
              <div className="text-center group cursor-pointer">
                <div className="text-4xl font-bold bg-gradient-success bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
                  98%
                </div>
                <div className="text-muted-foreground">Taxa de Sucesso</div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-accent/5 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 right-20 w-20 h-20 bg-success/10 rounded-full blur-2xl animate-pulse delay-500" />
      </section>

      {/* Featured Courses Section */}
      <section className="py-20 bg-background/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="bg-accent/10 text-accent border-accent/20 px-4 py-2 text-sm font-medium mb-4">
              <Award className="w-4 h-4 mr-2" />
              Cursos em Destaque
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Escolha sua 
              <span className="bg-gradient-primary bg-clip-text text-transparent"> Especialização</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Cursos desenvolvidos por especialistas renomados, com certificações reconhecidas pelo mercado e suporte completo durante toda sua jornada.
            </p>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="animate-pulse bg-muted/20">
                  <div className="aspect-[16/9] bg-muted/30" />
                  <CardHeader>
                    <div className="h-4 bg-muted/30 rounded mb-2" />
                    <div className="h-3 bg-muted/20 rounded" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {courses.slice(0, 6).map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
          
          {courses.length > 6 && (
            <div className="text-center mt-12">
              <Button 
                variant="premium" 
                size="lg" 
                onClick={() => navigate('/courses')}
                className="group"
              >
                Ver Todos os Cursos
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Pronto para Começar sua
            <span className="block">Transformação Profissional?</span>
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Junte-se a milhares de profissionais que já transformaram suas carreiras com nossos cursos especializados.
          </p>
          <Button 
            variant="glass" 
            size="xl" 
            onClick={() => navigate('/auth')}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/40 shadow-xl group"
          >
            <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
            Cadastrar Gratuitamente
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </section>
    </div>
  );
};

export default ModernHomepage;