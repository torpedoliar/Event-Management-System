'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="glass-card max-w-lg w-full p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-danger/20 mb-6">
              <AlertTriangle className="w-8 h-8 text-brand-danger" />
            </div>
            
            <h2 className="text-xl font-semibold text-white mb-2">
              Terjadi Kesalahan
            </h2>
            
            <p className="text-white/60 mb-6">
              Maaf, terjadi kesalahan yang tidak terduga. Silakan coba lagi atau kembali ke halaman utama.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-brand-primary hover:bg-brand-primarySoft text-white font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Coba Lagi
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
              >
                <Home className="w-4 h-4" />
                Kembali
              </button>
            </div>

            {/* Error Details (collapsible) */}
            {this.state.error && (
              <div className="text-left">
                <button
                  onClick={this.toggleDetails}
                  className="flex items-center gap-2 text-white/40 hover:text-white/60 text-sm mb-2 transition-colors"
                >
                  {this.state.showDetails ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  Detail Error
                </button>
                
                {this.state.showDetails && (
                  <div className="bg-black/30 rounded-lg p-4 overflow-auto max-h-48">
                    <p className="text-brand-danger text-sm font-mono mb-2">
                      {this.state.error.message}
                    </p>
                    {this.state.errorInfo?.componentStack && (
                      <pre className="text-white/40 text-xs overflow-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook-based error boundary wrapper for function components
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback} onError={onError}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

// Simple error fallback component
export function ErrorFallback({ 
  error, 
  resetError 
}: { 
  error?: Error; 
  resetError?: () => void;
}) {
  return (
    <div className="p-6 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-danger/20 mb-4">
        <AlertTriangle className="w-6 h-6 text-brand-danger" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">Gagal Memuat</h3>
      <p className="text-white/60 text-sm mb-4">
        {error?.message || 'Terjadi kesalahan saat memuat komponen ini.'}
      </p>
      {resetError && (
        <button
          onClick={resetError}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Coba Lagi
        </button>
      )}
    </div>
  );
}

export default ErrorBoundary;
