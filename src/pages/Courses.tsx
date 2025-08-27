import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCourses } from '@/hooks/useCourses';
import CourseCard from '@/components/CourseCard';
import { Search, Filter, BookOpen, ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Courses = () => {
  const { courses, loading } = useCourses();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');

  // Get unique categories and difficulties
  const categories = Array.from(new Set(courses?.map(course => course.category).filter(Boolean))) as string[];
  const difficulties = ['Iniciante', 'Intermediário', 'Avançado'];

  // Filter courses
  const filteredCourses = courses?.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.instructor_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || course.category === selectedCategory;
    const matchesDifficulty = !selectedDifficulty || course.difficulty_level === selectedDifficulty;
    
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const handleEnrollCourse = (courseId: string) => {
    // Navigate to course detail page
    navigate(`/courses/${courseId}`);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedDifficulty('');
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Início</span>
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-xl font-bold flex items-center space-x-2">
                  <BookOpen className="h-5 w-5" />
                  <span>Todos os Cursos</span>
                </h1>
                <p className="text-sm text-muted-foreground">
                  Explore nossa biblioteca completa de cursos
                </p>
              </div>
            </div>
            <Button onClick={() => navigate('/dashboard')} variant="outline">
              Dashboard
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Filters Section */}
        <Card className="bg-gradient-card border-border/50 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filtros</span>
            </CardTitle>
            <CardDescription>
              Encontre o curso perfeito para você
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar cursos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Todas as categorias</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              {/* Difficulty Filter */}
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Todos os níveis</option>
                {difficulties.map(difficulty => (
                  <option key={difficulty} value={difficulty}>
                    {difficulty}
                  </option>
                ))}
              </select>

              {/* Clear Filters */}
              <Button
                onClick={clearFilters}
                variant="outline"
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </div>
            
            {/* Active Filters */}
            {(searchTerm || selectedCategory || selectedDifficulty) && (
              <div className="flex flex-wrap gap-2 mt-4">
                {searchTerm && (
                  <Badge variant="secondary" className="flex items-center space-x-1">
                    <span>Busca: "{searchTerm}"</span>
                    <button onClick={() => setSearchTerm('')} className="ml-1 hover:text-destructive">×</button>
                  </Badge>
                )}
                {selectedCategory && (
                  <Badge variant="secondary" className="flex items-center space-x-1">
                    <span>Categoria: {selectedCategory}</span>
                    <button onClick={() => setSelectedCategory('')} className="ml-1 hover:text-destructive">×</button>
                  </Badge>
                )}
                {selectedDifficulty && (
                  <Badge variant="secondary" className="flex items-center space-x-1">
                    <span>Nível: {selectedDifficulty}</span>
                    <button onClick={() => setSelectedDifficulty('')} className="ml-1 hover:text-destructive">×</button>
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              {filteredCourses ? `${filteredCourses.length} cursos encontrados` : 'Carregando cursos...'}
            </h2>
          </div>
        </div>

        {/* Courses Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredCourses && filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onEnroll={() => handleEnrollCourse(course.id)}
              />
            ))}
          </div>
        ) : (
          <Card className="bg-gradient-card border-border/50">
            <CardContent className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum curso encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Tente ajustar seus filtros ou buscar por outros termos
              </p>
              <Button onClick={clearFilters} variant="outline">
                Limpar Filtros
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Courses;