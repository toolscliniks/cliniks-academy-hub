import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCourses } from "@/hooks/useCourses";
import { BookOpen, Clock, Star, Users, Play, Sparkles, Award, TrendingUp } from "lucide-react";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { courses, loading } = useCourses();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-hero relative overflow-hidden">
      {/* Floating aesthetic elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-4 h-4 bg-primary/20 rounded-full animate-float"></div>
        <div className="absolute top-40 right-32 w-6 h-6 bg-accent/20 rounded-full animate-float" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-40 left-1/4 w-3 h-3 bg-secondary/20 rounded-full animate-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/3 right-20 w-5 h-5 bg-primary/15 rounded-full animate-float" style={{animationDelay: '3s'}}></div>
        <div className="absolute bottom-20 right-1/3 w-4 h-4 bg-accent/15 rounded-full animate-float" style={{animationDelay: '4s'}}></div>
      </div>

      <Header />
      
      {/* Hero Section with Floating Persuasion Bubbles */}
      <section className="relative container mx-auto px-4 py-16">
        <div className="text-center mb-16 relative">
          <h1 className="text-4xl md:text-7xl font-bold mb-8 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            Cliniks Academy
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto mb-8 leading-relaxed">
            Aprenda as técnicas de venda que vão alavancar o faturamento da sua clínica.
            Domine as técnicas mais avançadas em estética profissional com nossos cursos especializados.

          </p>
          
          {/* Floating Persuasion Bubbles */}
          <div className="absolute -top-10 left-10 hidden lg:block">
            <div className="bg-gradient-card border border-primary/20 rounded-2xl p-4 shadow-glow animate-float max-w-xs">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5 text-primary" />
                <span className="text-sm font-semibold text-primary">+800 clínicas</span>
              </div>
              <p className="text-xs text-muted-foreground">Alavancaram suas carreiras</p>
            </div>
          </div>
          
          <div className="absolute -top-5 right-20 hidden lg:block">
            <div className="bg-gradient-card border border-accent/20 rounded-2xl p-4 shadow-elegant animate-float max-w-xs" style={{animationDelay: '1.5s'}}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                <span className="text-sm font-semibold text-accent">Método certificado!</span>
              </div>
              <p className="text-xs text-muted-foreground">Método validado pelos orgãos competentes</p>
            </div>
          </div>

          <div className="absolute top-32 left-1/4 hidden xl:block">
            <div className="bg-gradient-card border border-secondary/20 rounded-2xl p-4 shadow-glow animate-float max-w-xs" style={{animationDelay: '2.5s'}}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-secondary" />
                <span className="text-sm font-semibold text-secondary">Cliniks</span>
              </div>
              <p className="text-xs text-muted-foreground">Clinicas que crescem são CLINIKS!</p>
            </div>
          </div>
        </div>
      </section>

      {/* Courses Section */}
      <main className="container mx-auto px-4 pb-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4 text-foreground">Cursos dentro da Cliniks Academy</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Faça o cadastro e seja +1 clinikers!
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i} className="animate-pulse bg-gradient-card border-border/50">
                <div className="aspect-video bg-muted/30 rounded-t-lg" />
                <CardHeader>
                  <div className="h-4 bg-muted/30 rounded mb-2" />
                  <div className="h-3 bg-muted/20 rounded" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {courses.map((course) => (
              <Card 
                key={course.id}
                className="group cursor-pointer transition-all duration-500 hover:scale-105 hover:shadow-glow bg-gradient-card border-border/50 overflow-hidden relative"
                onClick={() => navigate(`/courses/${course.id}`)}
              >
                {/* Glow effect on hover */}
                <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-lg"></div>
                
                <div className="relative aspect-video bg-gradient-to-br from-muted to-muted/50">
                  {course.cover_image_url ? (
                    <img
                      src={course.cover_image_url}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                      <BookOpen className="w-12 h-12 text-primary/50" />
                    </div>
                  )}
                  
                  {/* Floating badges */}
                  <div className="absolute bottom-3 left-3">
                    <Badge variant="secondary" className="text-xs bg-card/90 backdrop-blur-sm">
                      {course.difficulty_level}
                    </Badge>
                  </div>
                  
                  {course.is_featured && (
                    <div className="absolute top-3 left-3">
                      <Badge className="text-xs bg-gradient-primary text-primary-foreground animate-pulse">
                        <Star className="w-3 h-3 mr-1" />
                        Destaque
                      </Badge>
                    </div>
                  )}
                  
                  <div className="absolute top-3 right-3">
                    <Play className="w-8 h-8 text-white/80 opacity-0 group-hover:opacity-100 transition-all duration-300 drop-shadow-lg" />
                  </div>
                  
                  {/* Elegant overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </div>
                
                <CardHeader className="pb-3 relative z-10">
                  <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors duration-300">
                    {course.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 text-muted-foreground">
                    {course.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="pt-0 relative z-10">
                  {course.instructor_name && (
                    <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                      <div className="w-7 h-7 bg-gradient-primary rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-xs font-medium text-primary-foreground">
                          {course.instructor_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span>Por {course.instructor_name}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-primary/70" />
                      <span>{course.duration_hours}h de conteúdo</span>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full group-hover:shadow-glow transition-all duration-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/auth');
                    }}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Começar Agora
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      
    </div>
  );
};

export default Index;
