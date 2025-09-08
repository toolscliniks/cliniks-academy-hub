import { useEffect } from 'react';

/**
 * Hook para suprimir erros relacionados a bloqueadores de anúncios,
 * especialmente do YouTube/DoubleClick que aparecem no console
 */
export const useAdBlockErrorSuppression = () => {
  useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;
    
    // Padrões expandidos para capturar mais tipos de erros de ads
    const adBlockPatterns = [
      // DoubleClick/Google Ads
      'doubleclick.net',
      'googlesyndication',
      'googleadservices',
      'static.doubleclick.net',
      'securepubads.g.doubleclick.net',
      
      // YouTube Ads
      'ad_status.js',
      'instream/ad_status.js',
      'www-embed-player.js',
      'youtube.com/api/stats/ads',
      'youtube.com/ptracking',
      'youtube.com/youtubei/v1/log_event',
      
      // Erros de rede relacionados a ads
      'ERR_BLOCKED_BY_CLIENT',
      'net::ERR_BLOCKED_BY_CLIENT',
      'ERR_NETWORK_CHANGED',
      'ERR_INTERNET_DISCONNECTED',
      
      // Outros padrões de ads
      'adsystem',
      'adnxs.com',
      'amazon-adsystem.com',
      'facebook.com/tr',
      'google-analytics.com/collect',
      
      // Erros específicos do YouTube Player
      'Failed to execute \'postMessage\' on \'DOMWindow\'',
      'The play() request was interrupted',
      'NotAllowedError: play() failed',
      'AbortError: The play() request was interrupted',
      
      // CSP e CORS relacionados a ads
      'Content Security Policy',
      'Cross-Origin Request Blocked',
      'Mixed Content',
      
      // Tracking e Analytics
      'gtag',
      'gtm.js',
      'analytics.js',
      '_gaq',
      'fbevents.js'
    ];
    
    const shouldSuppressMessage = (message: string): boolean => {
      if (!message || typeof message !== 'string') return false;
      
      const lowerMessage = message.toLowerCase();
      return adBlockPatterns.some(pattern => 
        lowerMessage.includes(pattern.toLowerCase())
      );
    };
    
    // Interceptar console.error
    console.error = (...args) => {
      const message = args.join(' ');
      if (!shouldSuppressMessage(message)) {
        originalError.apply(console, args);
      }
    };
    
    // Interceptar console.warn
    console.warn = (...args) => {
      const message = args.join(' ');
      if (!shouldSuppressMessage(message)) {
        originalWarn.apply(console, args);
      }
    };
    
    // Interceptar console.log (opcional, para casos específicos)
    console.log = (...args) => {
      const message = args.join(' ');
      if (!shouldSuppressMessage(message)) {
        originalLog.apply(console, args);
      }
    };
    
    // Interceptar erros globais
    const handleError = (event: ErrorEvent) => {
      if (event.message && shouldSuppressMessage(event.message)) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
      
      // Também verificar o stack trace
      if (event.error?.stack && shouldSuppressMessage(event.error.stack)) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };
    
    // Interceptar promises rejeitadas
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.toString() || '';
      if (shouldSuppressMessage(reason)) {
        event.preventDefault();
        return false;
      }
      
      // Verificar se é um erro de rede relacionado a ads
      if (event.reason?.name === 'TypeError' && 
          event.reason?.message && 
          shouldSuppressMessage(event.reason.message)) {
        event.preventDefault();
        return false;
      }
    };
    
    // Interceptar fetch para suprimir erros de rede relacionados a ads
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        return await originalFetch(...args);
      } catch (error: any) {
        const errorMessage = error?.toString() || '';
        const url = args[0]?.toString() || '';
        
        if (shouldSuppressMessage(errorMessage) || shouldSuppressMessage(url)) {
          // Retornar uma resposta vazia para evitar quebrar a aplicação
          return new Response('', { 
            status: 200, 
            statusText: 'OK',
            headers: new Headers()
          });
        }
        throw error;
      }
    };
    
    // Interceptar XMLHttpRequest para casos específicos
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      if (typeof url === 'string' && shouldSuppressMessage(url)) {
        // Substituir por uma URL dummy para evitar erros
        url = 'data:text/plain;base64,';
      }
      return originalXHROpen.call(this, method, url, ...args);
    };
    
    // Adicionar listeners
    window.addEventListener('error', handleError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true);
    
    // Cleanup function
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      console.log = originalLog;
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalXHROpen;
      window.removeEventListener('error', handleError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true);
    };
  }, []);
};

export default useAdBlockErrorSuppression;