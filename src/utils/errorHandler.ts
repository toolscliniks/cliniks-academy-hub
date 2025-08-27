// Global error handler for postMessage errors from embedded iframes
export const setupGlobalErrorHandler = () => {
  // Handle uncaught postMessage errors from embedded content
  window.addEventListener('error', (event) => {
    const errorMessage = event.message || '';
    
    // Filter out postMessage origin mismatch errors from embedded content
    if (errorMessage.includes('postMessage') && errorMessage.includes('target origin')) {
      // These are typically harmless errors from YouTube/Vimeo embeds
      // trying to communicate with the parent window
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  });

  // Handle unhandled promise rejections related to postMessage
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || event.reason || '';
    
    if (typeof reason === 'string' && reason.includes('postMessage')) {
      event.preventDefault();
      return false;
    }
  });
};