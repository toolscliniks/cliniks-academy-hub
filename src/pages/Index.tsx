import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCourses } from "@/hooks/useCourses";
import { BookOpen, Clock, Star, Users, Play } from "lucide-react";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { courses, loading } = useCourses();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Cliniks Academy
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Domine as técnicas mais avançadas em estética profissional com nossos cursos especializados.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-video bg-muted/30" />
                <CardHeader>
                  <div className="h-4 bg-muted/30 rounded mb-2" />
                  <div className="h-3 bg-muted/20 rounded" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {courses.map((course) => (
              <Card 
                key={course.id}
                className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg overflow-hidden"
                onClick={() => navigate(`/courses/${course.id}`)}
              >
                <div className="relative aspect-video bg-gradient-to-br from-muted to-muted/50">
                  {course.cover_image_url ? (
                    <img
                      src={course.cover_image_url}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3">
                    <Badge variant="secondary" className="text-xs">
                      {course.difficulty_level}
                    </Badge>
                  </div>
                  <div className="absolute top-3 right-3">
                    <Play className="w-8 h-8 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                    {course.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {course.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="pt-0">
                  {course.instructor_name && (
                    <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                      <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium">
                          {course.instructor_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span>Por {course.instructor_name}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{course.duration_hours}h</span>
                    </div>
                    {course.is_featured && (
                      <Badge variant="outline" className="text-xs">
                        <Star className="w-3 h-3 mr-1" />
                        Destaque
                      </Badge>
                    )}
                  </div>
                  
                  <Button 
                    className="w-full mt-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/auth');
                    }}
                  >
                    Acessar Curso
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
