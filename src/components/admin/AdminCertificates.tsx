import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Palette, Eye, Save, Plus, Trash2, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast as sonnerToast } from 'sonner';

interface CertificateTemplate {
  id: string;
  name: string;
  template_html: string;
  background_image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const AdminCertificates = () => {
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewHtml, setPreviewHtml] = useState('');

  // Form states
  const [templateName, setTemplateName] = useState('');
  const [htmlTemplate, setHtmlTemplate] = useState('');
  const [cssStyles, setCssStyles] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('certificate_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      sonnerToast.error('Erro ao carregar templates de certificados');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template: CertificateTemplate) => {
    setSelectedTemplate(template);
    setTemplateName(template.name);
    setHtmlTemplate(template.template_html);
    setCssStyles('');
    setIsDefault(template.is_active);
    setIsEditing(false);
    generatePreview(template.template_html, '');
  };

  const handleNewTemplate = () => {
    setSelectedTemplate(null);
    setTemplateName('');
    setHtmlTemplate(getDefaultTemplate());
    setCssStyles(getDefaultStyles());
    setIsDefault(false);
    setIsEditing(true);
    generatePreview(getDefaultTemplate(), getDefaultStyles());
  };

  const generatePreview = (html: string, css?: string) => {
    const sampleData = {
      '{{STUDENT_NAME}}': 'João Silva',
      '{{COURSE_NAME}}': 'Comunicação Persuasiva para Estética',
      '{{COMPLETION_DATE}}': new Date().toLocaleDateString('pt-BR'),
      '{{INSTRUCTOR_NAME}}': 'Dr. Cliniks Academy',
      '{{CERTIFICATE_ID}}': 'CERT-2024-001'
    };

    let processedHtml = html;
    Object.entries(sampleData).forEach(([placeholder, value]) => {
      processedHtml = processedHtml.replace(new RegExp(placeholder, 'g'), value);
    });

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          ${css || ''}
        </style>
      </head>
      <body>
        ${processedHtml}
      </body>
      </html>
    `;

    setPreviewHtml(fullHtml);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !htmlTemplate.trim()) {
      sonnerToast.error('Nome e template HTML são obrigatórios');
      return;
    }

    try {
      const templateData = {
        name: templateName,
        template_html: htmlTemplate,
        is_active: isDefault
      };

      if (selectedTemplate) {
        // Update existing template
        const { error } = await supabase
          .from('certificate_templates')
          .update(templateData)
          .eq('id', selectedTemplate.id);

        if (error) throw error;
        sonnerToast.success('Template atualizado com sucesso!');
      } else {
        // Create new template
        const { error } = await supabase
          .from('certificate_templates')
          .insert([templateData]);

        if (error) throw error;
        sonnerToast.success('Template criado com sucesso!');
      }

      setIsEditing(false);
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      sonnerToast.error('Erro ao salvar template');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Tem certeza que deseja excluir este template?')) return;

    try {
      const { error } = await supabase
        .from('certificate_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      
      sonnerToast.success('Template excluído com sucesso!');
      setSelectedTemplate(null);
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      sonnerToast.error('Erro ao excluir template');
    }
  };

  const getDefaultTemplate = () => {
    return `
<div class="certificate">
  <div class="certificate-header">
    <div class="logo">
      <h1>CLINIKS ACADEMY</h1>
    </div>
  </div>
  
  <div class="certificate-body">
    <h2 class="certificate-title">CERTIFICADO DE CONCLUSÃO</h2>
    
    <div class="certificate-text">
      <p>Certificamos que</p>
      <h3 class="student-name">{{STUDENT_NAME}}</h3>
      <p>concluiu com êxito o curso</p>
      <h4 class="course-name">{{COURSE_NAME}}</h4>
      <p>em {{COMPLETION_DATE}}</p>
    </div>
    
    <div class="certificate-footer">
      <div class="signatures">
        <div class="signature">
          <div class="signature-line"></div>
          <p>{{INSTRUCTOR_NAME}}</p>
          <p class="title">Instrutor</p>
        </div>
        
        <div class="signature">
          <div class="signature-line"></div>
          <p>{{STUDENT_NAME}}</p>
          <p class="title">Aluno</p>
        </div>
      </div>
      
      <div class="certificate-id">
        <p>Certificado ID: {{CERTIFICATE_ID}}</p>
      </div>
    </div>
  </div>
</div>
    `;
  };

  const getDefaultStyles = () => {
    return `
.certificate {
  width: 297mm;
  height: 210mm;
  margin: 0 auto;
  padding: 20mm;
  border: 4px solid #2563eb;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  font-family: 'Georgia', serif;
  position: relative;
  box-sizing: border-box;
}

@media print {
  .certificate {
    width: 297mm;
    height: 210mm;
    margin: 0;
    padding: 15mm;
    border: 2px solid #2563eb;
    page-break-inside: avoid;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  
  @page {
    size: A4 landscape;
    margin: 0;
  }
}

.certificate::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 300px;
  height: 300px;
  background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjEwMCIgcj0iODAiIGZpbGw9InVybCgjZ3JhZGllbnQwXzFfMikiLz4KPGV4dCB4PSIxMDAiIHk9IjEwNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkM8L3RleHQ+CjxkZWZzPgo8bGluZWFyR3JhZGllbnQgaWQ9ImdyYWRpZW50MF8xXzIiIHgxPSI0MCIgeTE9IjQwIiB4Mj0iMTYwIiB5Mj0iMTYwIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3AtY29sb3I9IiNFNjFCRkYiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMDBCQ0Q0Ii8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPHN2Zz4K');
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  opacity: 0.1;
  z-index: 0;
}

.certificate-header {
  text-align: center;
  margin-bottom: 20px;
  position: relative;
  z-index: 1;
}

.logo h1 {
  color: #2563eb;
  font-size: 24px;
  font-weight: bold;
  margin: 0;
  letter-spacing: 2px;
}

.certificate-body {
  text-align: center;
  position: relative;
  z-index: 1;
}

.certificate-title {
  font-size: 28px;
  color: #1e40af;
  margin-bottom: 25px;
  font-weight: bold;
  letter-spacing: 1px;
}

.certificate-text p {
  font-size: 16px;
  color: #374151;
  margin: 8px 0;
}

.student-name {
  font-size: 30px;
  color: #1e40af;
  margin: 15px 0;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.course-name {
  font-size: 20px;
  color: #2563eb;
  margin: 15px 0;
  font-style: italic;
}

.certificate-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 30px;
  position: relative;
  z-index: 1;
}

.signatures {
  display: flex;
  justify-content: space-between;
  width: 400px;
  gap: 40px;
}

.signature {
  text-align: center;
  flex: 1;
}

.signature-line {
  width: 150px;
  height: 2px;
  background-color: #374151;
  margin-bottom: 8px;
}

.signature p {
  margin: 5px 0;
  font-size: 16px;
  color: #374151;
}

.signature .title {
  font-size: 14px;
  color: #6b7280;
}

.certificate-id {
  text-align: right;
}

.certificate-id p {
  font-size: 12px;
  color: #6b7280;
  margin: 0;
}
    `;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gerenciar Certificados</h2>
          <p className="text-muted-foreground">
            Personalize os templates de certificados da Cliniks Academy
          </p>
        </div>
        <Button onClick={handleNewTemplate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Template
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Templates List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Templates
            </CardTitle>
            <CardDescription>
              Selecione um template para editar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedTemplate?.id === template.id
                    ? 'bg-primary/10 border-primary'
                    : 'hover:bg-muted'
                }`}
                onClick={() => handleSelectTemplate(template)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{template.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(template.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {template.is_active && (
                      <Badge variant="secondary">Ativo</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTemplate(template.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Editor */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Editor de Template
                </CardTitle>
                <CardDescription>
                  Personalize o design do seu certificado
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? 'Cancelar' : 'Editar'}
                </Button>
                {isEditing && (
                  <Button onClick={handleSaveTemplate}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {(selectedTemplate || isEditing) ? (
              <Tabs defaultValue="editor" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="editor">Editor</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                
                <TabsContent value="editor" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="templateName">Nome do Template</Label>
                      <Input
                        id="templateName"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        disabled={!isEditing}
                        placeholder="Ex: Certificado Cliniks Academy"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isDefault"
                        checked={isDefault}
                        onChange={(e) => setIsDefault(e.target.checked)}
                        disabled={!isEditing}
                      />
                      <Label htmlFor="isDefault">Template Ativo</Label>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="htmlTemplate">Template HTML</Label>
                    <Textarea
                      id="htmlTemplate"
                      value={htmlTemplate}
                      onChange={(e) => {
                        setHtmlTemplate(e.target.value);
                        generatePreview(e.target.value, cssStyles);
                      }}
                      disabled={!isEditing}
                      rows={10}
                      placeholder="HTML do certificado..."
                      className="font-mono text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="cssStyles">Estilos CSS</Label>
                    <Textarea
                      id="cssStyles"
                      value={cssStyles}
                      onChange={(e) => {
                        setCssStyles(e.target.value);
                        generatePreview(htmlTemplate, e.target.value);
                      }}
                      disabled={!isEditing}
                      rows={8}
                      placeholder="CSS do certificado..."
                      className="font-mono text-sm"
                    />
                  </div>
                  
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Placeholders Disponíveis:</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <code>{'{{ STUDENT_NAME }}'}</code>
                      <code>{'{{ COURSE_NAME }}'}</code>
                      <code>{'{{ COMPLETION_DATE }}'}</code>
                      <code>{'{{ INSTRUCTOR_NAME }}'}</code>
                      <code>{'{{ CERTIFICATE_ID }}'}</code>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="preview">
                  <div className="border rounded-lg p-4 bg-white">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium">Preview do Certificado</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generatePreview(htmlTemplate, cssStyles)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Atualizar Preview
                      </Button>
                    </div>
                    <div 
                      className="w-full overflow-auto"
                      style={{ maxHeight: '600px' }}
                    >
                      <iframe
                        srcDoc={previewHtml}
                        className="w-full h-96 border-0"
                        title="Certificate Preview"
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Selecione um template para editar ou crie um novo
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminCertificates;