import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error if we have access to the error logger
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // You can also log to your external error reporting service here
    if ((window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: error.message,
        fatal: true
      });
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent 
            error={this.state.error} 
            resetError={() => this.setState({ hasError: false, error: null })}
          />
        );
      }

      return <DefaultErrorFallback 
        error={this.state.error} 
        resetError={() => this.setState({ hasError: false, error: null })}
      />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  const { logComponentError } = useErrorLogger();

  React.useEffect(() => {
    logComponentError('ErrorBoundary', error);
  }, [error, logComponentError]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Card className="max-w-md w-full bg-gradient-card border-border/50">
        <CardContent className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Algo deu errado</h2>
          <p className="text-muted-foreground mb-4">
            Ocorreu um erro inesperado. Nossa equipe foi notificada automaticamente.
          </p>
          
          {process.env.NODE_ENV === 'development' && (
            <details className="text-left mb-4 p-2 bg-muted rounded text-xs">
              <summary className="cursor-pointer mb-2 font-medium">Detalhes do erro</summary>
              <pre className="whitespace-pre-wrap">{error.message}</pre>
              {error.stack && (
                <pre className="mt-2 whitespace-pre-wrap text-xs opacity-70">
                  {error.stack}
                </pre>
              )}
            </details>
          )}
          
          <div className="space-y-2">
            <Button onClick={resetError} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar novamente
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'}
              className="w-full"
            >
              Voltar ao início
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
) {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}