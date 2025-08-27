import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Award, Download, Eye, Calendar, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Certificate {
  id: string;
  course_id: string;
  certificate_url: string;
  issued_at: string;
  courses: {
    id: string;
    title: string;
    instructor_name: string;
    duration_hours: number;
  };
}

const Certificates = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCertificates();
    }
  }, [user]);

  const fetchCertificates = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          *,
          courses (
            id,
            title,
            instructor_name,
            duration_hours
          )
        `)
        .eq('user_id', user.id)
        .order('issued_at', { ascending: false });

      if (error) throw error;
      setCertificates(data || []);
    } catch (error) {
      console.error('Error fetching certificates:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os certificados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const viewCertificate = (certificateUrl: string) => {
    window.open(certificateUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando certificados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Dashboard
            </Button>
          </div>
          <h1 className="text-3xl font-bold">Meus Certificados</h1>
          <p className="text-muted-foreground">Certificados dos cursos concluídos</p>
        </div>

        {certificates.length === 0 ? (
          <Card className="bg-gradient-card border-border/50">
            <CardContent className="text-center py-12">
              <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum certificado ainda</h3>
              <p className="text-muted-foreground">
                Complete cursos para receber certificados de conclusão
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certificates.map((certificate) => (
              <Card key={certificate.id} className="bg-gradient-card border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <Award className="w-8 h-8 text-yellow-500" />
                    <Badge variant="secondary">
                      {certificate.courses.duration_hours}h
                    </Badge>
                  </div>
                  
                  <h3 className="font-semibold mb-2 line-clamp-2">
                    {certificate.courses.title}
                  </h3>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {new Date(certificate.issued_at).toLocaleDateString('pt-BR')}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Por: {certificate.courses.instructor_name || 'Cliniks Academy'}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => viewCertificate(certificate.certificate_url)}
                      className="flex-1"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Ver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => viewCertificate(certificate.certificate_url)}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Baixar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Certificates;