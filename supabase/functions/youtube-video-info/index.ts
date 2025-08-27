import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      throw new Error('URL do YouTube é obrigatória');
    }

    // Extract video ID from YouTube URL
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
      throw new Error('URL do YouTube inválida');
    }

    // Get YouTube API key from environment
    const apiKey = Deno.env.get('YOUTUBE_API_KEY');
    if (!apiKey) {
      throw new Error('YouTube API key não configurada');
    }

    // Fetch video information from YouTube API
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails`
    );

    if (!response.ok) {
      throw new Error('Erro ao buscar informações do YouTube');
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      throw new Error('Vídeo não encontrado no YouTube');
    }

    const video = data.items[0];
    const duration = parseYouTubeDuration(video.contentDetails.duration);

    return new Response(
      JSON.stringify({
        title: video.snippet.title,
        description: video.snippet.description,
        duration: duration, // in seconds
        thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

function extractYouTubeVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function parseYouTubeDuration(duration: string): number {
  // Parse ISO 8601 duration format (PT4M13S) to seconds
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  return hours * 3600 + minutes * 60 + seconds;
}