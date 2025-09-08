import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SubscriptionCard from '@/components/SubscriptionCard';
import NotificationCenter from '@/components/NotificationCenter';
import { BookOpen, Star, Clock, Trophy, ChevronLeft, ChevronRight, Play, User, LogOut, Loader2, TrendingUp, Pause } from 'lucide-react';
import { useCourses } from '@/hooks/useCourses';
import { supabase } from '@/integrations/supabase/client';
import type { Course } from '@/hooks/useCourses';
import type { DashboardCarouselItem } from '@/types/carousel';

interface EnrolledCourse {
  id: string;
  user_id: string;
  course_id: string;
  progress: number;
  enrolled_at: string;
  completed_at?: string;
  courses?: Course;
}

interface IncompleteLessonWithCourse {
  id: string;
  title: string;
  description?: string;
  video_url?: string;
  duration_minutes?: number;
  progress?: number;
  last_accessed?: string;
  course: {
    id: string;
    title: string;
    instructor_name?: string;
  };
  module: {
    title: string;
  };
}



const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { courses, loading: coursesLoading } = useCourses();
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [incompleteLessons, setIncompleteLessons] = useState<IncompleteLessonWithCourse[]>([]);
  const [carouselItems, setCarouselItems] = useState<DashboardCarouselItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [continueScrollPos, setContinueScrollPos] = useState(0);
  const [exploreScrollPos, setExploreScrollPos] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [slideInterval, setSlideInterval] = useState<NodeJS.Timeout | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Dynamic titles and descriptions that alternate with carousel slides
  const dynamicContent = [
    {
      title: "GILÃO DA MASSA",
      description: "Transforme sua comunicação e alcance resultados extraordinários com técnicas comprovadas"
    },
    {
      title: "DOMINE A ORATÓRIA",
      description: "Desenvolva habilidades de comunicação que impactam e geram resultados reais no seu negócio"
    },
    {
      title: "COMUNICAÇÃO EFICAZ",
      description: "Aprenda estratégias avançadas para se comunicar com clareza, persuasão e autoridade"
    },
    {
      title: "LIDERANÇA ATRAVÉS DA VOZ",
      description: "Construa sua presença e influência através de técnicas comprovadas de comunicação"
    }
  ];

  // Helper function to extract YouTube video ID
  const getYouTubeVideoId = (url: string): string => {
    if (!url) return '';
    
    // Handle different YouTube URL formats including Shorts
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,  // YouTube Shorts support
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})\?/  // YouTube Shorts with parameters
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return '';
  };

  // Enhanced YouTube embed URL with ad blocking parameters
  const getYouTubeEmbedUrl = (videoId: string): string => {
    if (!videoId) return '';
    
    const params = new URLSearchParams({
      autoplay: '1',
      mute: '1',
      loop: '1',
      playlist: videoId,
      controls: '0',
      showinfo: '0',
      rel: '0',
      iv_load_policy: '3',
      modestbranding: '1',
      enablejsapi: '0',
      disablekb: '1',
      fs: '0',
      cc_load_policy: '0',
      playsinline: '1',
      start: '0',
      end: '0'
    });
    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  };

  // Helper function to optimize image URLs
  const getOptimizedImageUrl = (url: string): string => {
    if (!url) return '';
    
    // If it's already optimized or a data URL, return as is
    if (url.includes('?') || url.startsWith('data:')) return url;
    
    // Add optimization parameters for better carousel display
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}w=1920&h=1080&fit=crop&auto=format,compress&q=85`;
  };

  useEffect(() => {
    if (!user) {
      navigate('/auth', { state: { from: { pathname: '/dashboard' } } });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user) {
      fetchEnrolledCourses();
      fetchIncompleteLessons();
      fetchCarouselItems();
    }
  }, [user]);

  // Auto-play carousel effect
  useEffect(() => {
    if (isAutoPlaying && carouselItems.length > 1) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % carouselItems.length);
      }, 5000); // Change slide every 5 seconds
      setSlideInterval(interval);
      return () => clearInterval(interval);
    } else if (slideInterval) {
      clearInterval(slideInterval);
      setSlideInterval(null);
    }
  }, [isAutoPlaying, carouselItems.length]);

  // Reset current slide when carousel items change
  useEffect(() => {
    setCurrentSlide(0);
  }, [carouselItems]);

  // Mouse tracking for parallax effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Auto dark/light mode based on time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now);
      const hour = now.getHours();
      // Dark mode from 6 PM to 6 AM
      setIsDarkMode(hour >= 18 || hour < 6);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Supressão de erros de ads agora é aplicada globalmente via useAdBlockErrorSuppression no App.tsx

  const fetchCarouselItems = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'dashboard_carousel')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data?.setting_value) {
        const items = data.setting_value as unknown as DashboardCarouselItem[];
        setCarouselItems(items.filter(item => item.is_active));
      }
    } catch (error) {
      console.error('Error fetching carousel items:', error);
    }
  };

  const fetchEnrolledCourses = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('course_enrollments')
        .select(`
          *,
          courses(*)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      setEnrolledCourses(data || []);
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
    }
  };

  const fetchIncompleteLessons = async () => {
    if (!user) return;
    
    try {
      // Busca as aulas não concluídas pelo usuário
      const { data: incompleteLessonsData, error } = await supabase.rpc('get_incomplete_lessons', {
          p_user_id: user.id,
          p_limit: 20
        });

      if (error) throw error;

      // Garante que os dados sejam um array antes de mapear
      const lessonsData = Array.isArray(incompleteLessonsData) ? incompleteLessonsData : [];

      // Mapeia os dados para o formato esperado pelo componente
      const transformedLessons: IncompleteLessonWithCourse[] = lessonsData.map((lesson: any) => ({
        id: lesson.lesson_id,
        title: lesson.lesson_title,
        description: lesson.lesson_description,
        video_url: lesson.cover_image_url,
        duration_minutes: lesson.duration_minutes,
        course: {
          id: lesson.course_id,
          title: lesson.course_title,
          instructor_name: lesson.instructor_name,
        },
        module: {
          title: lesson.module_title,
        },
        last_accessed: lesson.last_accessed,
        progress: lesson.progress || 0
      })) || [];

      // Ordena as aulas por data de acesso (mais recentes primeiro)
      const sortedLessons = [...transformedLessons].sort((a, b) => {
        const dateA = a.last_accessed ? new Date(a.last_accessed).getTime() : 0;
        const dateB = b.last_accessed ? new Date(b.last_accessed).getTime() : 0;
        return dateB - dateA;
      });

      setIncompleteLessons(sortedLessons);
    } catch (error) {
      console.error('Error fetching incomplete lessons:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const scrollCarousel = (containerId: string, direction: 'left' | 'right', stateUpdater: (pos: number) => void, currentPos: number) => {
    const container = document.getElementById(containerId);
    if (container) {
      const cardWidth = 320;
      const scrollAmount = cardWidth * 2;
      const newPosition = direction === 'left' 
        ? Math.max(0, currentPos - scrollAmount)
        : Math.min(container.scrollWidth - container.clientWidth, currentPos + scrollAmount);
      
      container.scrollTo({ left: newPosition, behavior: 'smooth' });
      stateUpdater(newPosition);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Netflix-style Header */}
      <header className="bg-black/95 backdrop-blur-sm border-b border-zinc-800/50 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                GUSTAVO MEDEIROS
              </h1>
              <nav className="hidden md:flex space-x-6">
                <Button variant="ghost" className="text-white hover:text-primary transition-colors">Início</Button>
                <Button variant="ghost" className="text-zinc-400 hover:text-white transition-colors" onClick={() => navigate('/my-courses')}>Meus Cursos</Button>
                <Button variant="ghost" className="text-zinc-400 hover:text-white transition-colors" onClick={() => navigate('/my-subscriptions')}>Assinaturas</Button>
                <Button variant="ghost" className="text-zinc-400 hover:text-white transition-colors" onClick={() => navigate('/courses')}>Cursos</Button>
                <Button variant="ghost" className="text-zinc-400 hover:text-white transition-colors" onClick={() => navigate('/certificates')}>Certificados</Button>
                <Button variant="ghost" className="text-zinc-400 hover:text-white transition-colors" onClick={() => navigate('/plans')}>Planos</Button>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <NotificationCenter />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/profile')}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <User className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section with Advanced Carousel */}
      <div 
        className="relative h-[60vh] overflow-hidden"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Carousel Background */}
        <div className="absolute inset-0">
          {carouselItems.map((item, index) => {
            const isActive = index === currentSlide;
            const videoId = item.media_type === 'video' && item.video_url ? getYouTubeVideoId(item.video_url) : null;
            
            return (
              <div
                key={item.id}
                className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                  isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                }`}
              >
                {item.media_type === 'video' && item.video_url ? (
                   item.video_url.includes('youtube.com') || item.video_url.includes('youtu.be') ? (
                     <div className="w-full h-full relative overflow-hidden">
                       <iframe
                         className={`absolute top-1/2 left-1/2 w-[177.77vh] h-[56.25vw] min-h-full min-w-full transform -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ${
                           isHovering ? 'scale-110 blur-[1px]' : 'scale-105'
                         }`}
                         src={getYouTubeEmbedUrl(getYouTubeVideoId(item.video_url))}
                         frameBorder="0"
                         allow="autoplay; encrypted-media"
                         allowFullScreen
                         title={item.title}
                         style={{
                           transform: `translate(${mousePosition.x * 10}px, ${mousePosition.y * 5}px) translate(-50%, -50%) scale(${
                             isHovering ? 1.1 : 1.05
                           })`,
                           filter: isHovering ? 'blur(1px)' : 'none'
                         }}
                       />
                       <div className="absolute inset-0 bg-black/20" />
                     </div>
                   ) : (
                     <div className="w-full h-full relative overflow-hidden">
                       <video
                         className={`w-full h-full object-cover transition-all duration-700 ${
                           isHovering ? 'scale-110 blur-[1px]' : 'scale-105'
                         }`}
                         autoPlay={isActive}
                         muted
                         loop
                         playsInline
                         controls={false}
                         style={{
                           transform: `translate(${mousePosition.x * 10}px, ${mousePosition.y * 5}px) scale(${
                             isHovering ? 1.1 : 1.05
                           })`
                         }}
                       >
                         <source src={item.video_url} type="video/mp4" />
                         Seu navegador não suporta o elemento de vídeo.
                       </video>
                       <div className="absolute inset-0 bg-black/20" />
                     </div>
                   )
                 ) : (
                   <div className="w-full h-full flex items-center justify-center bg-black">
                     <img
                       src={getOptimizedImageUrl(item.image_url)}
                       alt={item.title}
                       className={`max-w-full max-h-full object-contain transition-all duration-700 ${
                         isHovering ? 'scale-110 blur-[1px]' : 'scale-105'
                       }`}
                       style={{
                         transform: `translate(${mousePosition.x * 10}px, ${mousePosition.y * 5}px) scale(${
                           isHovering ? 1.1 : 1.05
                         })`
                       }}
                     />
                   </div>
                 )}
              </div>
            );
          })}
        </div>

        {/* Enhanced Gradient Overlays with Dynamic Effects */}
         <div className={`absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/30 transition-all duration-500 ${
           isHovering ? 'from-black/95 via-black/70 to-black/40' : ''
         }`} />
         <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
         <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
         
         {/* Animated Particles Effect */}
         <div className="absolute inset-0 opacity-20">
           {[...Array(20)].map((_, i) => (
             <div
               key={i}
               className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
               style={{
                 left: `${Math.random() * 100}%`,
                 top: `${Math.random() * 100}%`,
                 animationDelay: `${Math.random() * 3}s`,
                 animationDuration: `${2 + Math.random() * 3}s`
               }}
             />
           ))}
         </div>
        
        {/* Content */}
        <div className={`relative container mx-auto px-6 h-full flex ${
          // Vertical positioning
          carouselItems[currentSlide]?.content_position?.startsWith('top-') ? 'items-start pt-20' :
          carouselItems[currentSlide]?.content_position?.startsWith('bottom-') ? 'items-end pb-20' :
          'items-center'
        } ${
          // Horizontal positioning
          carouselItems[currentSlide]?.content_position?.endsWith('-right') ? 'justify-end' :
          carouselItems[currentSlide]?.content_position?.endsWith('-center') ? 'justify-center' :
          'justify-start'
        }`}>
          <div className={`max-w-3xl ${
            carouselItems[currentSlide]?.content_position?.endsWith('-center') ? 'text-center' :
            carouselItems[currentSlide]?.content_position?.endsWith('-right') ? 'text-right' :
            'text-left'
          }`}>

            {/* Title - only show if enabled or no carousel item */}
            {(!carouselItems[currentSlide] || carouselItems[currentSlide]?.show_title !== false) && (
              <h1 className={`text-7xl lg:text-8xl font-bold mb-8 leading-tight bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent transition-all duration-1000 transform ${
                 isHovering ? 'scale-105 drop-shadow-2xl' : ''
               }`}>
                {carouselItems[currentSlide]?.title || dynamicContent[currentSlide % dynamicContent.length]?.title || 'GILÃO DA MASSA'}
              </h1>
            )}
            {/* Description - only show if enabled or no carousel item */}
            {(!carouselItems[currentSlide] || carouselItems[currentSlide]?.show_description !== false) && (
              <p className="text-2xl text-zinc-200 mb-10 leading-relaxed max-w-2xl transition-all duration-1000 transform">
                {carouselItems[currentSlide]?.description || dynamicContent[currentSlide % dynamicContent.length]?.description || 'Transforme sua comunicação e alcance resultados extraordinários com técnicas comprovadas'}
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-4">
               {carouselItems[currentSlide]?.action_url && (
                 <Button 
                   size="lg" 
                   className="bg-white text-black hover:bg-zinc-200 font-semibold px-10 py-4 text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-white/20 group"
                   onClick={() => window.open(carouselItems[currentSlide].action_url, '_blank')}
                 >
                   <Play className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                   Saiba Mais
                 </Button>
               )}
             </div>
          </div>
        </div>

        {/* Carousel Controls */}
        {carouselItems.length > 1 && (
          <>
            {/* Navigation Arrows */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-6 top-[60%] -translate-y-1/2 rounded-full w-14 h-14 p-0 text-white/80 hover:text-white hover:bg-white/20 transition-all duration-300 backdrop-blur-sm"
              onClick={() => {
                setCurrentSlide((prev) => (prev - 1 + carouselItems.length) % carouselItems.length);
                setIsAutoPlaying(false);
              }}
            >
              <ChevronLeft className="w-8 h-8" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-6 top-[60%] -translate-y-1/2 rounded-full w-14 h-14 p-0 text-white/80 hover:text-white hover:bg-white/20 transition-all duration-300 backdrop-blur-sm"
              onClick={() => {
                setCurrentSlide((prev) => (prev + 1) % carouselItems.length);
                setIsAutoPlaying(false);
              }}
            >
              <ChevronRight className="w-8 h-8" />
            </Button>

            {/* Play/Pause Control */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-6 right-6 rounded-full w-12 h-12 p-0 text-white/80 hover:text-white hover:bg-white/20 transition-all duration-300 backdrop-blur-sm"
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            >
              {isAutoPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </Button>

            {/* Slide Indicators */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex space-x-3">
              {carouselItems.map((_, index) => (
                <button
                  key={index}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentSlide
                      ? 'bg-white scale-125'
                      : 'bg-white/40 hover:bg-white/60'
                  }`}
                  onClick={() => {
                    setCurrentSlide(index);
                    setIsAutoPlaying(false);
                  }}
                />
              ))}
            </div>


          </>
        )}
      </div>

      <div className="container mx-auto px-6 pb-16">


        {/* Continue Progress Section */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">Continue sua jornada</h2>
              <p className="text-zinc-400 mt-2">Retome de onde parou e continue aprendendo</p>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full w-12 h-12 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all"
                onClick={() => scrollCarousel('continue-carousel', 'left', setContinueScrollPos, continueScrollPos)}
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full w-12 h-12 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all"
                onClick={() => scrollCarousel('continue-carousel', 'right', setContinueScrollPos, continueScrollPos)}
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            </div>
          </div>

          <div className="relative">
            <div 
              id="continue-carousel"
              className="flex space-x-6 overflow-x-hidden pb-4"
            >
              {incompleteLessons.slice(0, 8).map((lesson) => (
                <div 
                  key={lesson.id} 
                  className="flex-shrink-0 w-[340px] cursor-pointer transition-all duration-300 hover:scale-105 group"
                  onClick={() => navigate(`/courses/${lesson.course.id}/lessons/${lesson.id}`)}
                >
                  <div className="bg-zinc-900/50 rounded-xl overflow-hidden shadow-2xl hover:shadow-primary/10 transition-all duration-300 backdrop-blur-sm">
                    <div className="relative aspect-video bg-gradient-to-br from-zinc-800 to-zinc-900">
                      {lesson.video_url ? (
                        <img
                          src={lesson.video_url}
                          alt={lesson.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-16 h-16 text-zinc-600" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      
                      {/* Progress Bar */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-700/50">
                        <div 
                          className="h-full bg-primary transition-all duration-300" 
                          style={{ width: `${(lesson.progress || 0) * 100}%` }} 
                        />
                      </div>

                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <Play className="w-8 h-8 ml-1" />
                        </div>
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="font-bold text-lg mb-2 line-clamp-2 leading-tight">
                        {lesson.title}
                      </h3>
                      <p className="text-zinc-400 mb-2 font-medium">
                        {lesson.course.title}
                      </p>
                      <div className="flex items-center justify-between text-sm text-zinc-500">
                        <span>Por {lesson.course.instructor_name || 'Gustavo Medeiros'}</span>
                        {lesson.duration_minutes && (
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{lesson.duration_minutes}min</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>



        {/* Explore Courses Section */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">Explorar cursos</h2>
              <p className="text-zinc-400 mt-2">Descubra novos conhecimentos e habilidades</p>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full w-12 h-12 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all"
                onClick={() => scrollCarousel('explore-carousel', 'left', setExploreScrollPos, exploreScrollPos)}
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full w-12 h-12 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all"
                onClick={() => scrollCarousel('explore-carousel', 'right', setExploreScrollPos, exploreScrollPos)}
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            </div>
          </div>

          <div className="relative">
            <div 
              id="explore-carousel"
              className="flex space-x-6 overflow-x-hidden pb-4"
            >
              {coursesLoading ? (
                <>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="flex-shrink-0 w-[280px] animate-pulse bg-zinc-900/50 rounded-xl">
                      <div className="aspect-[2/3] bg-zinc-800 rounded-t-xl" />
                      <div className="p-4">
                        <div className="h-4 bg-zinc-800 rounded mb-2" />
                        <div className="h-3 bg-zinc-800 rounded" />
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                courses?.map((course, index) => (
                  <div 
                    key={course.id}
                    className="flex-shrink-0 w-[280px] cursor-pointer transition-all duration-500 hover:scale-105 group"
                    onClick={() => navigate(`/courses/${course.id}`)}
                    style={{
                      transform: `translateY(${Math.sin(index * 0.5) * 10}px)`,
                      animationDelay: `${index * 0.1}s`
                    }}
                  >
                    <div className="bg-zinc-900/50 rounded-xl overflow-hidden shadow-2xl hover:shadow-primary/20 transition-all duration-500 backdrop-blur-sm hover:border-primary/30">
                      <div className="relative aspect-[2/3] bg-gradient-to-br from-zinc-800 to-zinc-900">
                        {course.cover_image_url ? (
                          <img
                            src={course.cover_image_url}
                            alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 group-hover:brightness-110"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center group-hover:from-zinc-600 group-hover:to-zinc-700 transition-all duration-500">
                            <BookOpen className="w-12 h-12 text-zinc-600 group-hover:text-primary transition-colors duration-300" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent group-hover:from-black/60 transition-all duration-300" />
                        
                        <div className="absolute top-3 right-3">
                          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-primary/20">
                            <Play className="w-6 h-6 ml-1" />
                          </div>
                        </div>
                        
                        {course.is_featured && (
                          <div className="absolute top-3 left-3">
                            <Badge className="bg-primary/90 text-primary-foreground text-xs font-bold">
                              <Star className="w-3 h-3 mr-1" />
                              Destaque
                            </Badge>
                          </div>
                        )}
                        
                        <div className="absolute bottom-3 left-3">
                          <Badge className="bg-primary/20 text-primary border-primary/30 text-xs font-medium">
                            {course.difficulty_level}
                          </Badge>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-base mb-2 line-clamp-2 leading-tight group-hover:text-primary transition-colors duration-300">
                          {course.title}
                        </h3>
                        <p className="text-xs text-zinc-500">
                          Por {course.instructor_name || 'Gustavo Medeiros'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
