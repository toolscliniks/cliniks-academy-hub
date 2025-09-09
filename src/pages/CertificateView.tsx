import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Certificate {
  id: string;
  certificate_url: string;
  issued_at: string;
  courses: {
    title: string;
    instructor_name: string;
  };
  profiles: {
    full_name: string;
  };
}

const CertificateView = () => {
  const { certificateId } = useParams<{ certificateId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (certificateId) {
      fetchCertificate();
    }
  }, [certificateId]);

  const fetchCertificate = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          id,
          certificate_url,
          issued_at,
          courses (
            title,
            instructor_name
          ),
          profiles (
            full_name
          )
        `)
        .eq('id', certificateId)
        .single();

      if (error) {
        throw new Error('Certificado não encontrado');
      }

      setCertificate(data);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadCertificate = () => {
    if (!certificate?.certificate_url) return;

    // Se for uma URL data:text/html;base64, decodificar e abrir em nova janela
    if (certificate.certificate_url.startsWith('data:text/html;base64,')) {
      const base64Content = certificate.certificate_url.split(',')[1];
      const htmlContent = atob(base64Content);
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        
        // Aguardar um pouco e então imprimir
        setTimeout(() => {
          printWindow.print();
        }, 1000);
      }
    } else {
      // Para URLs normais
      window.open(certificate.certificate_url, '_blank');
    }
  };

  const shareCertificate = async () => {
    const shareUrl = `${window.location.origin}/certificate/${certificateId}`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Certificado - ${certificate?.courses.title}`,
          text: `Confira meu certificado do curso "${certificate?.courses.title}" na Cliniks Academy!`,
          url: shareUrl
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link copiado!",
          description: "O link do certificado foi copiado para a área de transferência."
        });
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando certificado...</p>
        </div>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Oops! Certificado não encontrado</h1>
          <p className="text-muted-foreground mb-6">
            {error || 'O certificado que você está procurando não existe ou foi removido.'}
          </p>
          <Button onClick={() => navigate('/')} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  // Decodificar o HTML do certificado se for base64
  let certificateHtml = '';
  if (certificate?.certificate_url?.startsWith('data:text/html;base64,')) {
    const base64Content = certificate.certificate_url.split(',')[1];
    certificateHtml = atob(base64Content);
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/certificates')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar aos Certificados
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={shareCertificate}
              className="flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Compartilhar
            </Button>
            <Button
              onClick={downloadCertificate}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Baixar/Imprimir
            </Button>
          </div>
        </div>

        {/* Certificate Display */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {certificateHtml ? (
            <div 
              dangerouslySetInnerHTML={{ __html: certificateHtml }}
              className="w-full"
              style={{
                minHeight: '600px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            />
          ) : (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Não foi possível carregar o certificado.</p>
            </div>
          )}
        </div>

        {/* Certificate Info */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            Certificado emitido em {new Date(certificate.issued_at).toLocaleDateString('pt-BR')}
          </p>
          <p>
            Curso: {certificate.courses.title} | Instrutor: {certificate.courses.instructor_name || 'Cliniks Academy'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CertificateView;