import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Play, 
  Shield, 
  Settings, 
  Info,
  Youtube,
  Video,
  Globe
} from 'lucide-react';
import SecureYouTubePlayer from './SecureYouTubePlayer';
import UniversalSecurePlayer from './UniversalSecurePlayer';
import { useToast } from '@/hooks/use-toast';

interface DemoConfig {
  videoUrl: string;
  videoType: 'youtube' | 'vimeo' | 'mp4' | 'auto';
  title: string;
  autoplay: boolean;
  showControls: boolean;
  protectionLevel: 'basic' | 'advanced' | 'maximum';
  allowDownload: boolean;
  allowRightClick: boolean;
  showWatermark: boolean;
  watermarkText: string;
}

const VideoPlayerDemo: React.FC = () => {
  const { toast } = useToast();
  
  const [config, setConfig] = useState<DemoConfig>({
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoType: 'auto',
    title: 'Vídeo de Demonstração',
    autoplay: false,
    showControls: true,
    protectionLevel: 'advanced',
    allowDownload: false,
    allowRightClick: false,
    showWatermark: true,
    watermarkText: 'CLINIKS ACADEMY'
  });

  const [activePlayer, setActivePlayer] = useState<'youtube' | 'universal'>('universal');
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleProgress = (progressPercent: number) => {
    setProgress(progressPercent);
  };

  const handleComplete = () => {
    setIsCompleted(true);
    toast({
      title: "Vídeo Concluído!",
      description: "O vídeo foi assistido até o final.",
      variant: "default"
    });
  };

  const resetDemo = () => {
    setProgress(0);
    setIsCompleted(false);
  };

  const sampleVideos = {
    youtube: [
      {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        title: 'Rick Astley - Never Gonna Give You Up'
      },
      {
        url: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
        title: 'PSY - GANGNAM STYLE'
      }
    ],
    vimeo: [
      {
        url: 'https://vimeo.com/148751763',
        title: 'Vimeo Staff Picks'
      }
    ],
    mp4: [
      {
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        title: 'Big Buck Bunny (Sample MP4)'
      }
    ]
  };

  const protectionLevels = {
    basic: {
      name: 'Básico',
      description: 'Proteção mínima, permite clique direito',
      color: 'bg-green-500'
    },
    advanced: {
      name: 'Avançado',
      description: 'Proteção moderada, bloqueia clique direito',
      color: 'bg-yellow-500'
    },
    maximum: {
      name: 'Máximo',
      description: 'Proteção total, bloqueia atalhos e seleção',
      color: 'bg-red-500'
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          Player de Vídeo Protegido - Demonstração
        </h1>
        <p className="text-muted-foreground">
          Teste os novos componentes de player de vídeo com diferentes níveis de proteção
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Player Type Selection */}
              <div className="space-y-2">
                <Label>Tipo de Player</Label>
                <Tabs value={activePlayer} onValueChange={(value) => setActivePlayer(value as 'youtube' | 'universal')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="youtube" className="flex items-center gap-1">
                      <Youtube className="h-4 w-4" />
                      YouTube
                    </TabsTrigger>
                    <TabsTrigger value="universal" className="flex items-center gap-1">
                      <Video className="h-4 w-4" />
                      Universal
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Video URL */}
              <div className="space-y-2">
                <Label>URL do Vídeo</Label>
                <Input
                  value={config.videoUrl}
                  onChange={(e) => setConfig(prev => ({ ...prev, videoUrl: e.target.value }))}
                  placeholder="Cole a URL do vídeo aqui"
                />
              </div>

              {/* Sample Videos */}
              <div className="space-y-2">
                <Label>Vídeos de Exemplo</Label>
                <Select onValueChange={(value) => {
                  const [type, index] = value.split('-');
                  const video = sampleVideos[type as keyof typeof sampleVideos][parseInt(index)];
                  setConfig(prev => ({
                    ...prev,
                    videoUrl: video.url,
                    title: video.title,
                    videoType: type as any
                  }));
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um exemplo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube-0">
                      <div className="flex items-center gap-2">
                        <Youtube className="h-4 w-4" />
                        Rick Roll (YouTube)
                      </div>
                    </SelectItem>
                    <SelectItem value="youtube-1">
                      <div className="flex items-center gap-2">
                        <Youtube className="h-4 w-4" />
                        Gangnam Style (YouTube)
                      </div>
                    </SelectItem>
                    <SelectItem value="vimeo-0">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Staff Picks (Vimeo)
                      </div>
                    </SelectItem>
                    <SelectItem value="mp4-0">
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        Big Buck Bunny (MP4)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Video Title */}
              <div className="space-y-2">
                <Label>Título do Vídeo</Label>
                <Input
                  value={config.title}
                  onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Título do vídeo"
                />
              </div>

              {/* Video Type */}
              {activePlayer === 'universal' && (
                <div className="space-y-2">
                  <Label>Tipo de Vídeo</Label>
                  <Select 
                    value={config.videoType} 
                    onValueChange={(value) => setConfig(prev => ({ ...prev, videoType: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Detectar Automaticamente</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="vimeo">Vimeo</SelectItem>
                      <SelectItem value="mp4">MP4/HTML5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Protection Level */}
              <div className="space-y-2">
                <Label>Nível de Proteção</Label>
                <Select 
                  value={config.protectionLevel} 
                  onValueChange={(value) => setConfig(prev => ({ ...prev, protectionLevel: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(protectionLevels).map(([key, level]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${level.color}`} />
                          <div>
                            <div className="font-medium">{level.name}</div>
                            <div className="text-xs text-muted-foreground">{level.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Switches */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="autoplay">Reprodução Automática</Label>
                  <Switch
                    id="autoplay"
                    checked={config.autoplay}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, autoplay: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="controls">Mostrar Controles</Label>
                  <Switch
                    id="controls"
                    checked={config.showControls}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, showControls: checked }))}
                  />
                </div>
                
                {activePlayer === 'universal' && (
                  <>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="download">Permitir Download</Label>
                      <Switch
                        id="download"
                        checked={config.allowDownload}
                        onCheckedChange={(checked) => setConfig(prev => ({ ...prev, allowDownload: checked }))}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="rightclick">Permitir Clique Direito</Label>
                      <Switch
                        id="rightclick"
                        checked={config.allowRightClick}
                        onCheckedChange={(checked) => setConfig(prev => ({ ...prev, allowRightClick: checked }))}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="watermark">Mostrar Marca D'água</Label>
                      <Switch
                        id="watermark"
                        checked={config.showWatermark}
                        onCheckedChange={(checked) => setConfig(prev => ({ ...prev, showWatermark: checked }))}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Watermark Text */}
              {activePlayer === 'universal' && config.showWatermark && (
                <div className="space-y-2">
                  <Label>Texto da Marca D'água</Label>
                  <Input
                    value={config.watermarkText}
                    onChange={(e) => setConfig(prev => ({ ...prev, watermarkText: e.target.value }))}
                    placeholder="Texto da marca d'água"
                  />
                </div>
              )}

              {/* Reset Button */}
              <Button onClick={resetDemo} variant="outline" className="w-full">
                Resetar Demonstração
              </Button>
            </CardContent>
          </Card>

          {/* Progress Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Status da Reprodução
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso:</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant={isCompleted ? "default" : "secondary"}>
                  {isCompleted ? "Concluído" : "Em Progresso"}
                </Badge>
              </div>
              
              <div className="text-xs text-muted-foreground">
                O vídeo será marcado como concluído quando atingir 90% de progresso.
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Video Player */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                {activePlayer === 'youtube' ? 'Secure YouTube Player' : 'Universal Secure Player'}
                <Badge variant="outline" className={protectionLevels[config.protectionLevel].color}>
                  {protectionLevels[config.protectionLevel].name}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activePlayer === 'youtube' ? (
                <SecureYouTubePlayer
                  videoUrl={config.videoUrl}
                  title={config.title}
                  onComplete={handleComplete}
                  onProgress={handleProgress}
                  autoplay={config.autoplay}
                  showControls={config.showControls}
                  className="w-full"
                />
              ) : (
                <UniversalSecurePlayer
                  videoUrl={config.videoUrl}
                  videoType={config.videoType}
                  title={config.title}
                  onComplete={handleComplete}
                  onProgress={handleProgress}
                  autoplay={config.autoplay}
                  showControls={config.showControls}
                  protectionLevel={config.protectionLevel}
                  allowDownload={config.allowDownload}
                  allowRightClick={config.allowRightClick}
                  showWatermark={config.showWatermark}
                  watermarkText={config.watermarkText}
                  className="w-full"
                />
              )}
            </CardContent>
          </Card>

          {/* Code Example */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Exemplo de Código</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                readOnly
                value={activePlayer === 'youtube' ? 
`<SecureYouTubePlayer
  videoUrl="${config.videoUrl}"
  title="${config.title}"
  onComplete={handleComplete}
  onProgress={handleProgress}
  autoplay={${config.autoplay}}
  showControls={${config.showControls}}
  className="w-full"
/>` :
`<UniversalSecurePlayer
  videoUrl="${config.videoUrl}"
  videoType="${config.videoType}"
  title="${config.title}"
  onComplete={handleComplete}
  onProgress={handleProgress}
  autoplay={${config.autoplay}}
  showControls={${config.showControls}}
  protectionLevel="${config.protectionLevel}"
  allowDownload={${config.allowDownload}}
  allowRightClick={${config.allowRightClick}}
  showWatermark={${config.showWatermark}}
  watermarkText="${config.watermarkText}"
  className="w-full"
/>`}
                className="font-mono text-sm min-h-[200px]"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerDemo;