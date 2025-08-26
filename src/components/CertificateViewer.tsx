import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Award, Download, Share, Printer } from 'lucide-react';

interface CertificateViewerProps {
  courseId: string;
  courseName: string;
  onClose: () => void;
}

const CertificateViewer = ({ courseId, courseName, onClose }: CertificateViewerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [certificateHtml, setCertificateHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [certificateId, setCertificateId] = useState<string>('');

  useEffect(() => {
    generateCertificate();
  }, [courseId]);

  const generateCertificate = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('generate-certificate', {
        body: { courseId }
      });

      if (error) throw error;

      setCertificateHtml(data.certificateHtml);
      setCertificateId(data.certificateId);
      
      toast({
        title: "Certificado gerado!",
        description: "Seu certificado está pronto para visualização."
      });
    } catch (error: any) {
      toast({
        title: "Erro ao gerar certificado",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadCertificate = () => {
    if (!certificateHtml) return;

    // Create a new window for printing/saving as PDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(certificateHtml);
      printWindow.document.close();
      printWindow.focus();
    }
  };

  const printCertificate = () => {
    if (!certificateHtml) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(certificateHtml);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const shareCertificate = async () => {
    const shareData = {
      title: `Certificado - ${courseName}`,
      text: `Concluí com sucesso o curso "${courseName}" na Cliniks Academy!`,
      url: `${window.location.origin}/certificate/${certificateId}`
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback - copy to clipboard
        await navigator.clipboard.writeText(shareData.url);
        toast({
          title: "Link copiado!",
          description: "O link do certificado foi copiado para a área de transferência."
        });
      }
    } catch (error) {
      console.error('Error sharing certificate:', error);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="bg-gradient-card border-border/50 max-w-md w-full mx-4">
          <CardContent className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Gerando seu certificado...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Seu Certificado</h2>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={downloadCertificate}>
              <Download className="w-4 h-4 mr-2" />
              Baixar
            </Button>
            <Button variant="outline" size="sm" onClick={printCertificate}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
            <Button variant="outline" size="sm" onClick={shareCertificate}>
              <Share className="w-4 h-4 mr-2" />
              Compartilhar
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
        </div>

        {/* Certificate Preview */}
        <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
          <div className="border rounded-lg overflow-hidden shadow-lg">
            <div 
              dangerouslySetInnerHTML={{ __html: certificateHtml }}
              className="certificate-preview"
              style={{ 
                transform: 'scale(0.8)', 
                transformOrigin: 'top center',
                width: '125%',
                marginLeft: '-12.5%'
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/30">
          <p className="text-sm text-muted-foreground text-center">
            Parabéns pela conclusão do curso "{courseName}"! 🎉
          </p>
        </div>
      </div>
    </div>
  );
};

export default CertificateViewer;