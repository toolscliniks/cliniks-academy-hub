import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Award, Download, Share, Printer, Trash2 } from 'lucide-react';

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

      console.log('Certificate data received:', data);
      
      setCertificateHtml(data.certificateHtml);
      setCertificateId(data.certificateId);
      
      console.log('Certificate ID set:', data.certificateId);
      
      toast({
        title: "Certificado gerado!",
        description: "Seu certificado está pronto para visualização."
      });
      
      // Atualizar lista de certificados se a função estiver disponível
      if ((window as any).refreshCertificates) {
        console.log('Calling refreshCertificates');
        (window as any).refreshCertificates();
      } else {
        console.log('refreshCertificates function not available');
      }
    } catch (error: any) {
      console.error('Certificate generation error:', error);
      toast({
        title: "Erro ao gerar certificado",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteCertificate = async () => {
    if (!certificateId) {
      console.log('No certificate ID available for deletion');
      return;
    }

    // Confirmar antes de excluir
    if (!confirm('Tem certeza que deseja excluir este certificado?')) {
      return;
    }

    try {
      console.log('Deleting certificate with ID:', certificateId);
      
      const { error } = await supabase
        .from('certificates')
        .delete()
        .eq('id', certificateId);

      if (error) throw error;

      setCertificateHtml('');
      setCertificateId('');
      
      toast({
        title: "Certificado excluído",
        description: "O certificado foi removido com sucesso."
      });
      
      // Atualizar lista de certificados se a função estiver disponível
      if ((window as any).refreshCertificates) {
        console.log('Calling refreshCertificates after deletion');
        (window as any).refreshCertificates();
      }
      
      onClose();
    } catch (error: any) {
      console.error('Error deleting certificate:', error);
      toast({
        title: "Erro ao excluir certificado",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const regenerateCertificate = async () => {
    if (certificateId) {
      await deleteCertificate();
    }
    await generateCertificate();
  };

  const downloadCertificate = () => {
    if (!certificateHtml) return;

    // Create a new window for printing/saving as PDF with landscape orientation
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(certificateHtml);
      printWindow.document.close();
      printWindow.focus();
      
      // Trigger print dialog automatically for PDF download
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const shareCertificate = async () => {
    if (!certificateHtml) return;

    try {
      // Create a blob with the certificate HTML for sharing
      const blob = new Blob([certificateHtml], { type: 'text/html' });
      const file = new File([blob], `certificado-${courseName.replace(/\s+/g, '-').toLowerCase()}.html`, { type: 'text/html' });
      
      const shareData = {
        title: `Certificado - ${courseName}`,
        text: `Concluí com sucesso o curso "${courseName}" na Cliniks Academy!`,
        files: [file]
      };

      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else if (navigator.share) {
        // Fallback without file
        await navigator.share({
          title: shareData.title,
          text: shareData.text,
          url: `${window.location.origin}/certificate/${certificateId}`
        });
      } else {
        // Create download link as fallback
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificado-${courseName.replace(/\s+/g, '-').toLowerCase()}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Certificado baixado!",
          description: "O arquivo do certificado foi baixado para compartilhamento."
        });
      }
    } catch (error) {
      console.error('Error sharing certificate:', error);
      toast({
        title: "Erro ao compartilhar",
        description: "Não foi possível compartilhar o certificado.",
        variant: "destructive"
      });
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
            <Button variant="outline" size="sm" onClick={shareCertificate}>
              <Share className="w-4 h-4 mr-2" />
              Compartilhar
            </Button>
            <Button variant="outline" size="sm" onClick={regenerateCertificate}>
              <Award className="w-4 h-4 mr-2" />
              Regenerar
            </Button>
            <Button variant="destructive" size="sm" onClick={deleteCertificate}>
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
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