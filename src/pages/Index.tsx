import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCourses } from "@/hooks/useCourses";
import { BookOpen, Clock, Star, Users, Play, Sparkles, Award, TrendingUp } from "lucide-react";
import { Loader2 } from "lucide-react";
import ParticleEffect from '@/components/ParticleEffect';

const Index = () => {
  const { courses, loading } = useCourses();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-hero relative overflow-hidden">
      {/* Particle Background Effect */}
      <ParticleEffect particleCount={30} className="opacity-30" />
      
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
          
          {/* Floating Persuasion Bubbles with enhanced animations */}
          <div className="absolute -top-30 left-10 hidden lg:block">
            <div className="bg-gradient-card border border-primary/20 rounded-2xl p-4 shadow-glow animate-float animate-pulse-glow max-w-xs">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5 text-primary" />
                <span className="text-sm font-semibold text-primary">+800 clínicas</span>
              </div>
              <p className="text-xs text-muted-foreground">Alavancaram suas carreiras</p>
            </div>
          </div>

          <div className="absolute -top-50 left-10 hidden lg:block">
            <div className="bg-gradient-card border border-primary/20 rounded-2xl p-4 shadow-glow animate-float animate-pulse-glow max-w-xs">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5 text-primary" />
                <span className="text-sm font-semibold text-primary">+800 clínicas</span>
              </div>
              <p className="text-xs text-muted-foreground">Alavancaram suas carreiras</p>
            </div>
          </div>
          
          <div className="absolute -top-50 right-1/3 hidden lg:block">
            <div className="bg-gradient-card border border-primary/20 rounded-2xl p-4 shadow-glow animate-float animate-pulse-glow max-w-xs">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                <span className="text-sm font-semibold text-accent">Método certificado!</span>
              </div>
              <p className="text-xs text-muted-foreground">Método validado pelos orgãos competentes</p>
            </div>
          </div>
          <div className="absolute -top-70 right-1/3 hidden lg:block">
            <div className="bg-gradient-card border border-primary/20 rounded-2xl p-4 shadow-glow animate-float animate-pulse-glow max-w-xs">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                <span className="text-sm font-semibold text-accent">Método certificado!</span>
              </div>
              <p className="text-xs text-muted-foreground">Método validado pelos orgãos competentes</p>
            </div>
          </div>

          <div className="absolute top-52 left-60 hidden xl:block">
            <div className="bg-gradient-card border border-secondary/20 rounded-2xl p-4 shadow-glow animate-float animate-shimmer max-w-xs" style={{animationDelay: '2.5s'}}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-secondary" />
                <span className="text-sm font-semibold text-secondary">Cliniks</span>
              </div>
              <p className="text-xs text-muted-foreground">Clinicas que crescem são CLINIKS!</p>
            </div>
          </div>

          <div className="absolute top-50 right-60 hidden xl:block">
            <div className="bg-gradient-card border border-primary/20 rounded-2xl p-4 shadow-glow animate-float animate-pulse-glow max-w-xs">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-yellow-500" />
                <span className="text-sm font-semibold text-yellow-500">+1000 Alunos</span>
              </div>
              <p className="text-xs text-muted-foreground">Transformaram seus negócios</p>
            </div>
          </div>
        </div>
      </section>

      {/* Courses Section */}
      <main className="container mx-auto px-4 pb-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4 text-foreground">Alguns dos nossos Cursos na Cliniks Academy</h2>
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
                className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-glow bg-transparent border-border/30 overflow-hidden p-0 flex justify-center items-center mx-auto"
                style={{ width: '300px', height: '500px' }}
                onClick={() => navigate(`/courses/${course.id}`)}
              >
                <div className="relative w-full h-full flex items-center justify-center">
                  {course.cover_image_url ? (
                    <img
                      src={course.cover_image_url}
                      alt={course.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                      <BookOpen className="w-12 h-12 text-primary/50" />
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
      
    </div>
  );
};

export default Index;
