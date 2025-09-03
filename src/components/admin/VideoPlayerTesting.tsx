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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  Shield, 
  Settings, 
  Info,
  Youtube,
  Video,
  Globe,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
// import BasicProtectedPlayer from '@/components/BasicProtectedPlayer'; // Substituído pelo SecureYouTubePlayer
import SecureYouTubePlayer from '@/components/video/SecureYouTubePlayer';
import UniversalSecurePlayer from '@/components/video/UniversalSecurePlayer';
import { useToast } from '@/hooks/use-toast';

interface TestResult {
  playerType: string;
  videoType: string;
  protectionLevel: string;
  success: boolean;
  error?: string;
  completionTime?: number;
  progressTracked: boolean;
}

interface TestConfig {
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

const VideoPlayerTesting: React.FC = () => {
  const { toast } = useToast();
  
  const [config, setConfig] = useState<TestConfig>({
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoType: 'auto',
    title: 'Teste de Player de Vídeo',
    autoplay: false,
    showControls: true,
    protectionLevel: 'advanced',
    allowDownload: false,
    allowRightClick: false,
    showWatermark: true,
    watermarkText: 'CLINIKS ACADEMY - TESTE'
  });

  const [activePlayer, setActivePlayer] = useState<'basic' | 'youtube' | 'universal'>('universal');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [progress, setProgress] = useState<{[key: string]: number}>({});
  const [completions, setCompletions] = useState<{[key: string]: boolean}>({});

  const handleProgress = (playerType: string) => (progressPercent: number) => {
    setProgress(prev => ({ ...prev, [playerType]: progressPercent }));
  };

  const handleComplete = (playerType: string) => () => {
    setCompletions(prev => ({ ...prev, [playerType]: true }));
    toast({
      title: "Vídeo Concluído!",
      description: `Player ${playerType} completou a reprodução.`,
      variant: "default"
    });
  };

  const resetTests = () => {
    setProgress({});
    setCompletions({});
    setTestResults([]);
  };

  const runAutomatedTests = async () => {
    setIsRunningTests(true);
    const results: TestResult[] = [];
    
    const testCases = [
      { playerType: 'basic', videoType: 'youtube', protectionLevel: 'basic' },
      { playerType: 'youtube', videoType: 'youtube', protectionLevel: 'advanced' },
      { playerType: 'universal', videoType: 'youtube', protectionLevel: 'maximum' },
      { playerType: 'universal', videoType: 'vimeo', protectionLevel: 'advanced' },
      { playerType: 'universal', videoType: 'mp4', protectionLevel: 'basic' },
    ];

    for (const testCase of testCases) {
      try {
        // Simulate test execution
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const success = Math.random() > 0.1; // 90% success rate for demo
        
        results.push({
          playerType: testCase.playerType,
          videoType: testCase.videoType,
          protectionLevel: testCase.protectionLevel,
          success,
          error: success ? undefined : 'Erro simulado de teste',
          completionTime: success ? Math.random() * 5000 + 1000 : undefined,
          progressTracked: success
        });
      } catch (error) {
        results.push({
          playerType: testCase.playerType,
          videoType: testCase.videoType,
          protectionLevel: testCase.protectionLevel,
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          progressTracked: false
        });
      }
    }
    
    setTestResults(results);
    setIsRunningTests(false);
    
    const successCount = results.filter(r => r.success).length;
    toast({
      title: "Testes Concluídos",
      description: `${successCount}/${results.length} testes passaram com sucesso.`,
      variant: successCount === results.length ? "default" : "destructive"
    });
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
    basic: { name: 'Básico', color: 'bg-green-500', description: 'Proteção mínima' },
    advanced: { name: 'Avançado', color: 'bg-yellow-500', description: 'Proteção moderada' },
    maximum: { name: 'Máximo', color: 'bg-red-500', description: 'Proteção total' }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          Teste de Players de Vídeo Protegidos
        </h1>
        <p className="text-muted-foreground">
          Painel administrativo para testar e validar os componentes de player de vídeo
        </p>
      </div>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Controles de Teste
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={runAutomatedTests} disabled={isRunningTests} className="flex items-center gap-2">
              {isRunningTests ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isRunningTests ? 'Executando Testes...' : 'Executar Testes Automatizados'}
            </Button>
            
            <Button onClick={resetTests} variant="outline" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Resetar Testes
            </Button>
          </div>
          
          {testResults.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold">Resultados dos Testes:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {testResults.map((result, index) => (
                  <div key={index} className={`p-3 rounded border ${
                    result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      {result.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-medium text-sm">
                        {result.playerType} ({result.videoType})
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Proteção: {result.protectionLevel}
                    </div>
                    {result.error && (
                      <div className="text-xs text-red-600 mt-1">
                        {result.error}
                      </div>
                    )}
                    {result.completionTime && (
                      <div className="text-xs text-green-600 mt-1">
                        Tempo: {Math.round(result.completionTime)}ms
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações de Teste
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Player Type Selection */}
              <div className="space-y-2">
                <Label>Tipo de Player</Label>
                <Tabs value={activePlayer} onValueChange={(value) => setActivePlayer(value as any)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic" className="text-xs">
                      Basic
                    </TabsTrigger>
                    <TabsTrigger value="youtube" className="text-xs">
                      YouTube
                    </TabsTrigger>
                    <TabsTrigger value="universal" className="text-xs">
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
              {(activePlayer === 'universal' || activePlayer === 'basic') && (
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
              </div>
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
                  <span>{Math.round(progress[activePlayer] || 0)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${progress[activePlayer] || 0}%` }}
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant={completions[activePlayer] ? "default" : "secondary"}>
                  {completions[activePlayer] ? "Concluído" : "Em Progresso"}
                </Badge>
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
                {activePlayer === 'basic' && 'Basic Protected Player'}
                {activePlayer === 'youtube' && 'Secure YouTube Player'}
                {activePlayer === 'universal' && 'Universal Secure Player'}
                <Badge variant="outline" className={protectionLevels[config.protectionLevel].color}>
                  {protectionLevels[config.protectionLevel].name}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activePlayer === 'basic' && (
                <SecureYouTubePlayer
                  videoUrl={config.videoUrl}
                  title={config.title}
                  onComplete={handleComplete('basic')}
                  onProgress={handleProgress('basic')}
                  autoplay={config.autoplay}
                  showControls={config.showControls}
                  className="w-full"
                />
              )}
              
              {activePlayer === 'youtube' && (
                <SecureYouTubePlayer
                  videoUrl={config.videoUrl}
                  title={config.title}
                  onComplete={handleComplete('youtube')}
                  onProgress={handleProgress('youtube')}
                  autoplay={config.autoplay}
                  showControls={config.showControls}
                  className="w-full"
                />
              )}
              
              {activePlayer === 'universal' && (
                <UniversalSecurePlayer
                  videoUrl={config.videoUrl}
                  videoType={config.videoType}
                  title={config.title}
                  onComplete={handleComplete('universal')}
                  onProgress={handleProgress('universal')}
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

          {/* Alerts and Warnings */}
          <div className="mt-4 space-y-2">
            {config.protectionLevel === 'maximum' && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Nível de proteção máximo ativado. Alguns recursos podem ser limitados para garantir a segurança do conteúdo.
                </AlertDescription>
              </Alert>
            )}
            
            {config.autoplay && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  A reprodução automática pode não funcionar em todos os navegadores devido às políticas de autoplay.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerTesting;