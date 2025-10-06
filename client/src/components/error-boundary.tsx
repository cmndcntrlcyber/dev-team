import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-dark flex items-center justify-center p-6">
          <Card className="bg-surface border-gray-700 max-w-md w-full">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle className="h-8 w-8 text-error" />
                </div>
                <h2 className="text-2xl font-bold text-gray-100 mb-3">Something went wrong</h2>
                <p className="text-gray-400 mb-6">
                  We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
                </p>
                {this.state.error && (
                  <details className="text-left mb-6">
                    <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                      Error details
                    </summary>
                    <pre className="mt-2 text-xs text-gray-500 bg-card p-3 rounded overflow-auto max-h-32">
                      {this.state.error.toString()}
                    </pre>
                  </details>
                )}
                <Button
                  onClick={this.handleReset}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Application
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
