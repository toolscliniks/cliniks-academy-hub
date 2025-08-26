import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCourses } from '@/hooks/useCourses';
import { Loader2, ChevronLeft, ChevronRight, Play, Info, User, LogOut } from 'lucide-react';
import type { Course } from '@/hooks/useCourses';

const Dashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { courses, loading: coursesLoading } = useCourses();
  const navigate = useNavigate();
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [featuredCourse, setFeaturedCourse] = useState<Course | null>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { state: { from: { pathname: '/dashboard' } } });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && courses) {
      // Simulate enrolled courses
      const userEnrolledCourses = courses.slice(0, Math.min(courses.length, 8));
      setEnrolledCourses(userEnrolledCourses);
      
      // Set featured course (first one)
      if (courses.length > 0) {
        setFeaturedCourse(courses[0]);
      }
    }
  }, [user, courses]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const scrollCarousel = (direction: 'left' | 'right') => {
    const container = document.getElementById('courses-carousel');
    if (container) {
      const cardWidth = 280; // Width of each course card
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-8">
            <h1 className="text-2xl font-bold text-red-600">Cliniks Academy</h1>
            <nav className="hidden md:flex space-x-6">
              <Button variant="ghost" className="text-white hover:text-red-600">Início</Button>
              <Button variant="ghost" className="text-white hover:text-red-600" onClick={() => navigate('/courses')}>Cursos</Button>
              <Button variant="ghost" className="text-white hover:text-red-600">Minha Lista</Button>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/profile')}
              className="text-white hover:text-red-600"
            >
              <User className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-white hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      {featuredCourse && (
        <section className="relative h-screen flex items-center">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: featuredCourse.cover_image_url 
                ? `linear-gradient(to right, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0.3) 100%), url(${featuredCourse.cover_image_url})`
                : 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
            }}
          />
          
          <div className="relative z-10 px-6 md:px-12 max-w-2xl">
            <h2 className="text-5xl md:text-7xl font-bold mb-4 animate-fade-in">
              {featuredCourse.title}
            </h2>
            <p className="text-lg md:text-xl mb-6 opacity-90 animate-fade-in">
              {featuredCourse.description || 'Descubra novos conhecimentos e transforme sua carreira.'}
            </p>
            <div className="flex items-center space-x-4 animate-fade-in">
              <Button 
                size="lg" 
                className="bg-white text-black hover:bg-gray-200 font-semibold px-8"
                onClick={() => navigate(`/course/${featuredCourse.id}`)}
              >
                <Play className="w-5 h-5 mr-2" />
                Assistir Agora
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white/50 text-white hover:bg-white/10"
              >
                <Info className="w-5 h-5 mr-2" />
                Mais Informações
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Continue Watching Section */}
      <section className="px-6 md:px-12 -mt-32 relative z-20 pb-12">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold">Continue Assistindo</h3>
          <Button variant="ghost" className="text-white/60 hover:text-white">
            Ver todos
          </Button>
        </div>

        <div className="relative group">
          <div 
            id="courses-carousel"
            className="flex space-x-4 overflow-x-auto scrollbar-hide pb-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {coursesLoading ? (
              <div className="flex items-center justify-center w-full py-12">
                <Loader2 className="h-8 w-8 animate-spin text-red-600" />
              </div>
            ) : (
              enrolledCourses.map((course) => (
                <div 
                  key={course.id} 
                  className="flex-shrink-0 w-64 cursor-pointer transition-all duration-300 hover:scale-105 hover-scale"
                  onClick={() => navigate(`/course/${course.id}`)}
                >
                  <div className="relative aspect-[3/4] mb-2 rounded-lg overflow-hidden bg-gray-800">
                    {course.cover_image_url ? (
                      <img
                        src={course.cover_image_url}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                        <Play className="w-12 h-12 text-white/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-4 left-4 right-4 opacity-0 hover:opacity-100 transition-opacity duration-300">
                      <h4 className="font-semibold text-sm mb-1 line-clamp-2">{course.title}</h4>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="bg-red-600/80 text-white border-0 text-xs">
                          {course.difficulty_level}
                        </Badge>
                        <span className="text-xs text-gray-300">{course.duration_hours}h</span>
                      </div>
                    </div>
                  </div>
                  <h4 className="font-medium text-sm text-white/90 line-clamp-2">
                    {course.title}
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">
                    Por {course.instructor_name || 'Cliniks Academy'}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Carousel Navigation */}
          {!coursesLoading && enrolledCourses.length > 3 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-black/50 hover:bg-black/80 text-white rounded-full w-12 h-12 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => scrollCarousel('left')}
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-black/50 hover:bg-black/80 text-white rounded-full w-12 h-12 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => scrollCarousel('right')}
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            </>
          )}
        </div>
      </section>

      {/* All Courses Section */}
      {courses && courses.length > enrolledCourses.length && (
        <section className="px-6 md:px-12 pb-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold">Explore Mais Cursos</h3>
            <Button 
              variant="ghost" 
              className="text-white/60 hover:text-white"
              onClick={() => navigate('/courses')}
            >
              Ver todos
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {courses.slice(enrolledCourses.length).map((course) => (
              <div 
                key={course.id}
                className="cursor-pointer transition-all duration-300 hover:scale-105"
                onClick={() => navigate(`/course/${course.id}`)}
              >
                <div className="aspect-[3/4] rounded-lg overflow-hidden bg-gray-800 mb-2">
                  {course.cover_image_url ? (
                    <img
                      src={course.cover_image_url}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                      <Play className="w-8 h-8 text-white/50" />
                    </div>
                  )}
                </div>
                <h4 className="font-medium text-sm text-white/90 line-clamp-2 mb-1">
                  {course.title}
                </h4>
                <p className="text-xs text-gray-400">
                  {course.duration_hours}h
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Dashboard;