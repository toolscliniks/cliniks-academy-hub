import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Award } from 'lucide-react';

interface CertificateNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (name: string) => void;
  courseName: string;
  defaultName?: string;
}

const CertificateNameDialog = ({ 
  open, 
  onOpenChange, 
  onConfirm, 
  courseName, 
  defaultName = '' 
}: CertificateNameDialogProps) => {
  const [name, setName] = useState(defaultName);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleConfirm = async () => {
    if (!name.trim()) return;
    
    setIsGenerating(true);
    try {
      await onConfirm(name.trim());
      onOpenChange(false);
      setName('');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    if (!isGenerating) {
      onOpenChange(false);
      setName('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Gerar Certificado
          </DialogTitle>
          <DialogDescription>
            Digite seu nome completo como deseja que apareça no certificado do curso "{courseName}".
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nome completo
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite seu nome completo"
              className="col-span-3"
              disabled={isGenerating}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) {
                  handleConfirm();
                }
              }}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isGenerating}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!name.trim() || isGenerating}
            className="bg-green-500 hover:bg-green-600"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Gerando...
              </>
            ) : (
              <>
                <Award className="w-4 h-4 mr-2" />
                Gerar Certificado
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CertificateNameDialog;