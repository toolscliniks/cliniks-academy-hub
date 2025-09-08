import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, BookOpen, Users, Award, Clock, Star, ArrowRight, Sparkles, Zap, Heart, Shield, Phone, Mail, MessageCircle, Instagram, Linkedin, Youtube } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFeaturedCourses } from "@/hooks/useFeaturedCourses";
import { Course } from "@/hooks/useCourses";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ModernHomepage = () => {
  const navigate = useNavigate();
  const { courses, loading } = useFeaturedCourses();
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
    <Card className="group bg-gradient-card border-border/50 hover:border-primary/20 transition-all duration-500 hover:shadow-glow hover:scale-105 overflow-hidden relative">
      {/* Glowing effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      <div className="relative">
        {course.cover_image_url ? (
          <div className="aspect-[3/4] overflow-hidden relative">
            <img 
              src={course.cover_image_url} 
              alt={course.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
            {/* Aesthetic clinic overlay effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </div>
        ) : (
          <div className="aspect-[3/4] bg-gradient-secondary flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(127,0,250,0.1),transparent_70%)]" />
            <BookOpen className="w-16 h-16 text-white/80 relative z-10" />
          </div>
        )}
        
        {/* Premium badge */}
        <Badge className="absolute top-3 left-3 bg-primary/90 text-white border-primary/50 font-medium backdrop-blur-sm">
          <Sparkles className="w-3 h-3 mr-1" />
          Premium
        </Badge>
      </div>

      <CardHeader className="pb-3 relative">
        <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors duration-300 line-clamp-2 mb-2">
          {course.title}
        </CardTitle>
        <CardDescription className="line-clamp-3 text-muted-foreground leading-relaxed">
          {course.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        {course.instructor_name && (
          <div className="flex items-center gap-2 mb-4 text-sm">
            <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-xs">
                {course.instructor_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-muted-foreground">
              com <span className="text-foreground font-medium">{course.instructor_name}</span>
            </span>
          </div>
        )}

        {/* Call to action */}
        <div className="space-y-3">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Transforme sua carreira profissional
            </p>
            <Button 
              onClick={() => navigate('/auth')}
              className="w-full bg-gradient-primary hover:shadow-glow group/btn relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
              <Heart className="w-4 h-4 mr-2 group-hover/btn:animate-pulse" />
              Começar Jornada
              <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
            </Button>
          </div>
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
      <section className="py-20 bg-gradient-subtle relative overflow-hidden">
        {/* Floating aesthetic elements */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-accent/5 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/4 w-20 h-20 bg-success/10 rounded-full blur-2xl animate-pulse delay-500" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2 text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4 mr-2" />
              Cursos Especializados em Estética
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Domine as Técnicas Mais 
              <span className="bg-gradient-primary bg-clip-text text-transparent"> Avançadas</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Transforme vidas através da beleza. Nossos cursos são desenvolvidos por especialistas renomados, 
              com certificações reconhecidas pelo mercado e metodologia comprovada.
            </p>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Card key={i} className="animate-pulse bg-muted/20">
                  <div className="aspect-[3/4] bg-muted/30" />
                  <CardHeader>
                    <div className="h-4 bg-muted/30 rounded mb-2" />
                    <div className="h-3 bg-muted/20 rounded" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Cursos em Breve</h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Estamos preparando cursos incríveis para você. Cadastre-se para ser notificado quando estiverem disponíveis.
              </p>
              <Button 
                variant="premium" 
                size="lg" 
                onClick={() => navigate('/auth')}
                className="group"
              >
                <Heart className="w-5 h-5 mr-2 group-hover:animate-pulse" />
                Cadastrar-se Gratuitamente
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Por que escolher a <span className="bg-gradient-primary bg-clip-text text-transparent">Cliniks Academy</span>?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Mais que conhecimento, oferecemos uma experiência completa de transformação profissional.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="group bg-gradient-card hover:shadow-glow transition-all duration-500 text-center p-6">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">Certificação Reconhecida</h3>
              <p className="text-muted-foreground">
                Certificados válidos em todo território nacional, reconhecidos pelos principais órgãos do setor.
              </p>
            </Card>
            
            <Card className="group bg-gradient-card hover:shadow-glow transition-all duration-500 text-center p-6">
              <div className="w-16 h-16 bg-gradient-secondary rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">Metodologia Exclusiva</h3>
              <p className="text-muted-foreground">
                Técnicas avançadas e inovadoras, desenvolvidas por profissionais com mais de 15 anos de experiência.
              </p>
            </Card>
            
            <Card className="group bg-gradient-card hover:shadow-glow transition-all duration-500 text-center p-6">
              <div className="w-16 h-16 bg-gradient-success rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">Suporte Completo</h3>
              <p className="text-muted-foreground">
                Acompanhamento personalizado durante todo seu aprendizado, com mentoria e suporte técnico.
              </p>
            </Card>
          </div>
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

      {/* Footer */}
      <footer className="bg-background border-t border-border/50">
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Logo and Description */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-primary-gradient">
                  <BookOpen className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">
                  Cliniks <span className="text-primary">Academy</span>
                </span>
              </div>
              <p className="text-muted-foreground mb-6 max-w-md">
                Transformando carreiras através da educação especializada. 
                Oferecemos cursos premium com metodologia inovadora e suporte completo.
              </p>
              <div className="flex items-center gap-4">
                <a 
                  href="https://wa.me/5511999999999" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors group"
                >
                  <MessageCircle className="w-4 h-4 group-hover:animate-pulse" />
                  WhatsApp
                </a>
                <div className="flex items-center gap-3">
                  <a 
                    href="https://instagram.com/cliniks.academy" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                  <a 
                    href="https://linkedin.com/company/cliniks-academy" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <Linkedin className="w-5 h-5" />
                  </a>
                  <a 
                    href="https://youtube.com/@cliniks.academy" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <Youtube className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-semibold mb-4">Links Rápidos</h3>
              <ul className="space-y-2">
                <li>
                  <button 
                    onClick={() => navigate('/auth')}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Criar Conta
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate('/auth')}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Fazer Login
                  </button>
                </li>
                <li>
                  <a 
                    href="#sobre" 
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Sobre Nós
                  </a>
                </li>
                <li>
                  <a 
                    href="#termos" 
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Termos de Uso
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="font-semibold mb-4">Contato</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>(11) 99999-9999</span>
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span>contato@cliniks.academy</span>
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <MessageCircle className="w-4 h-4" />
                  <span>Suporte 24/7</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-border/50 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-muted-foreground text-sm">
              © 2024 Cliniks Academy. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#privacidade" className="hover:text-primary transition-colors">
                Política de Privacidade
              </a>
              <a href="#termos" className="hover:text-primary transition-colors">
                Termos de Serviço
              </a>
              <a href="#cookies" className="hover:text-primary transition-colors">
                Cookies
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ModernHomepage;