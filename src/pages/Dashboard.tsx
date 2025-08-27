import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCourses } from '@/hooks/useCourses';
import { Loader2, ChevronLeft, ChevronRight, Play, User, LogOut } from 'lucide-react';
import type { Course } from '@/hooks/useCourses';
import heroImage from '@/assets/hero-image.jpg';

const Dashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { courses, loading: coursesLoading } = useCourses();
  const navigate = useNavigate();
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { state: { from: { pathname: '/dashboard' } } });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && courses) {
      // Simulate enrolled courses for "Continue watching"
      const userEnrolledCourses = courses.slice(0, Math.min(courses.length, 10));
      setEnrolledCourses(userEnrolledCourses);
    }
  }, [user, courses]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const scrollCarousel = (direction: 'left' | 'right') => {
    const container = document.getElementById('progress-carousel');
    if (container) {
      const cardWidth = 320; // Width of each progress card
      const scrollAmount = cardWidth * 3; // Scroll 3 cards at a time
      const newPosition = direction === 'left' 
        ? Math.max(0, scrollPosition - scrollAmount)
        : Math.min(container.scrollWidth - container.clientWidth, scrollPosition + scrollAmount);
      
      container.scrollTo({ left: newPosition, behavior: 'smooth' });
      setScrollPosition(newPosition);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                GUSTAVO MEDEIROS
              </h1>
              <span className="text-lg font-light text-muted-foreground">cliniks</span>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/profile')}
                className="text-muted-foreground hover:text-primary"
              >
                <User className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-muted-foreground hover:text-primary"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative h-96 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.6) 30%, rgba(0,0,0,0.2) 70%), url(${heroImage})`
          }}
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-gray-50/20 to-transparent" />
        
        <div className="relative z-10 container mx-auto px-6 h-full flex items-center">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white animate-fade-in">
              GUSTAVO<br />MEDEIROS
            </h2>
            <p className="text-lg text-white/90 mb-2 animate-fade-in">cliniks</p>
            <p className="text-white/80 animate-fade-in">
              Transforme sua comunicação e alcance resultados extraordinários
            </p>
          </div>
        </div>
      </section>

      {/* Continue Progress Section - Horizontal */}
      <section className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900">Continuar progresso</h3>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full bg-white shadow-sm hover:shadow-md"
              onClick={() => scrollCarousel('left')}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full bg-white shadow-sm hover:shadow-md"
              onClick={() => scrollCarousel('right')}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="relative">
          <div 
            id="progress-carousel"
            className="flex space-x-4 overflow-x-auto scrollbar-hide pb-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {coursesLoading ? (
              <div className="flex items-center justify-center w-full py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              enrolledCourses.map((course) => (
                <div 
                  key={course.id} 
                  className="flex-shrink-0 w-80 cursor-pointer transition-all duration-300 hover:scale-105"
                  onClick={() => navigate(`/course/${course.id}`)}
                >
                  <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                    <div className="relative aspect-[16/9] bg-gradient-to-br from-gray-100 to-gray-200">
                      {course.cover_image_url ? (
                        <img
                          src={course.cover_image_url}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
                          <Play className="w-12 h-12 text-primary/50" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                    </div>
                    <div className="p-4">
                      <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                        {course.title}
                      </h4>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          Por {course.instructor_name || 'Gustavo Medeiros'}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {course.difficulty_level}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* All Courses Section - Grid */}
      <section className="container mx-auto px-6 pb-12">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Todos os Cursos</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {coursesLoading ? (
            <div className="col-span-full flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            courses?.map((course) => (
              <div 
                key={course.id}
                className="cursor-pointer transition-all duration-300 hover:scale-105 group"
                onClick={() => navigate(`/course/${course.id}`)}
              >
                <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                  <div className="relative aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200">
                    {course.cover_image_url ? (
                      <img
                        src={course.cover_image_url}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
                        <Play className="w-8 h-8 text-primary/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Badge variant="secondary" className="bg-white/90 text-gray-900 text-xs">
                        {course.difficulty_level}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="font-semibold text-gray-900 mb-1 line-clamp-2 text-sm">
                      {course.title}
                    </h4>
                    <p className="text-xs text-gray-600">
                      {course.duration_hours}h • {course.instructor_name || 'Gustavo Medeiros'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;