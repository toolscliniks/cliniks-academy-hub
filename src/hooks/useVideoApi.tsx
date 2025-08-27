import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface VideoInfo {
  id: string;
  title: string;
  description: string;
  duration: string;
  thumbnail: string;
  platform: 'youtube' | 'vimeo';
  embed_url: string;
  view_count?: number;
  published_at?: string;
  channel_name?: string;
}

export const useVideoApi = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const getYouTubeVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const getVimeoVideoId = (url: string): string | null => {
    const patterns = [
      /vimeo\.com\/(\d+)/,
      /player\.vimeo\.com\/video\/(\d+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const detectPlatform = (url: string): 'youtube' | 'vimeo' | null => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube';
    }
    if (url.includes('vimeo.com')) {
      return 'vimeo';
    }
    return null;
  };

  const fetchVideoInfo = async (videoUrl: string): Promise<VideoInfo | null> => {
    setLoading(true);

    try {
      const platform = detectPlatform(videoUrl);
      
      if (!platform) {
        throw new Error('Plataforma de vídeo não suportada. Use YouTube ou Vimeo.');
      }

      let videoId: string | null = null;
      
      if (platform === 'youtube') {
        videoId = getYouTubeVideoId(videoUrl);
      } else if (platform === 'vimeo') {
        videoId = getVimeoVideoId(videoUrl);
      }

      if (!videoId) {
        throw new Error('ID do vídeo não pôde ser extraído da URL');
      }

      // Call edge function to get video info
      const { data, error } = await supabase.functions.invoke('youtube-video-info', {
        body: {
          video_id: videoId,
          platform: platform
        }
      });

      if (error) throw error;

      const videoInfo: VideoInfo = {
        id: videoId,
        title: data.title,
        description: data.description,
        duration: data.duration,
        thumbnail: data.thumbnail,
        platform: platform,
        embed_url: platform === 'youtube' 
          ? `https://www.youtube.com/embed/${videoId}`
          : `https://player.vimeo.com/video/${videoId}`,
        view_count: data.view_count,
        published_at: data.published_at,
        channel_name: data.channel_name
      };

      return videoInfo;

    } catch (error: any) {
      toast({
        title: "Erro ao buscar informações do vídeo",
        description: error.message,
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const generateEmbedCode = (videoInfo: VideoInfo, options?: {
    autoplay?: boolean;
    controls?: boolean;
    width?: number;
    height?: number;
  }): string => {
    const { 
      autoplay = false, 
      controls = true, 
      width = 560, 
      height = 315 
    } = options || {};

    if (videoInfo.platform === 'youtube') {
      const params = new URLSearchParams({
        ...(autoplay ? { autoplay: '1' } : {}),
        ...(controls ? {} : { controls: '0' }),
        modestbranding: '1',
        rel: '0'
      });

      return `<iframe width="${width}" height="${height}" src="${videoInfo.embed_url}?${params.toString()}" title="${videoInfo.title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
    } else {
      const params = new URLSearchParams({
        ...(autoplay ? { autoplay: '1' } : {}),
        ...(controls ? {} : { controls: '0' }),
        title: '0',
        byline: '0',
        portrait: '0'
      });

      return `<iframe src="${videoInfo.embed_url}?${params.toString()}" width="${width}" height="${height}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="${videoInfo.title}"></iframe>`;
    }
  };

  const validateVideoUrl = (url: string): { isValid: boolean; platform?: 'youtube' | 'vimeo'; message?: string } => {
    if (!url || !url.trim()) {
      return { isValid: false, message: 'URL é obrigatória' };
    }

    const platform = detectPlatform(url);
    
    if (!platform) {
      return { 
        isValid: false, 
        message: 'Plataforma não suportada. Use URLs do YouTube ou Vimeo.' 
      };
    }

    let videoId: string | null = null;
    
    if (platform === 'youtube') {
      videoId = getYouTubeVideoId(url);
    } else if (platform === 'vimeo') {
      videoId = getVimeoVideoId(url);
    }

    if (!videoId) {
      return { 
        isValid: false, 
        platform,
        message: 'Formato de URL inválido para esta plataforma' 
      };
    }

    return { isValid: true, platform };
  };

  return {
    loading,
    fetchVideoInfo,
    generateEmbedCode,
    validateVideoUrl,
    detectPlatform,
    getYouTubeVideoId,
    getVimeoVideoId
  };
};