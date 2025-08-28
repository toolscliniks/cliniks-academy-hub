import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Youtube, RefreshCw } from 'lucide-react';

const FixYouTubeLessons = () => {
  const [loading, setLoading] = useState(false);
  const [fixed, setFixed] = useState(0);
  const { toast } = useToast();

  const extractYouTubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  const fixYouTubeLessons = async () => {
    setLoading(true);
    setFixed(0);
    
    try {
      // Get all YouTube lessons without external_video_id
      const { data: lessons, error: fetchError } = await supabase
        .from('lessons')
        .select('id, video_url, external_video_id, external_video_platform')
        .eq('video_type', 'youtube')
        .is('external_video_id', null);

      if (fetchError) throw fetchError;

      let fixedCount = 0;
      
      for (const lesson of lessons || []) {
        if (lesson.video_url) {
          const videoId = extractYouTubeId(lesson.video_url);
          if (videoId) {
            const { error: updateError } = await supabase
              .from('lessons')
              .update({
                external_video_id: videoId,
                external_video_platform: 'youtube'
              })
              .eq('id', lesson.id);

            if (!updateError) {
              fixedCount++;
              setFixed(fixedCount);
            }
          }
        }
      }

      toast({
        title: "Correção concluída!",
        description: `${fixedCount} aulas do YouTube foram corrigidas.`
      });

    } catch (error: any) {
      console.error('Error fixing YouTube lessons:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao corrigir aulas do YouTube",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Youtube className="w-5 h-5" />
          Corrigir Aulas do YouTube
        </CardTitle>
        <CardDescription>
          Corrige aulas do YouTube que estão sem o ID do vídeo configurado corretamente
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Esta função irá procurar por aulas marcadas como YouTube que não têm o external_video_id 
            configurado e tentará extrair o ID do vídeo da URL salva.
          </p>
          
          {fixed > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800 text-sm">
                ✅ {fixed} aulas foram corrigidas com sucesso!
              </p>
            </div>
          )}

          <Button 
            onClick={fixYouTubeLessons}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Corrigindo aulas... ({fixed} corrigidas)
              </>
            ) : (
              <>
                <Youtube className="w-4 h-4 mr-2" />
                Corrigir Aulas do YouTube
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FixYouTubeLessons;