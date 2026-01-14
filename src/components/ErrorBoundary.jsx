import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="max-w-md w-full border-2 border-red-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Algo deu errado
                </h2>
                <p className="text-gray-600 mb-4">
                  Desculpe, ocorreu um erro inesperado. Tente recarregar a página.
                </p>
                {this.state.error && (
                  <details className="text-left mb-4 p-3 bg-gray-100 rounded-lg">
                    <summary className="text-xs font-medium text-gray-700 cursor-pointer">
                      Detalhes técnicos
                    </summary>
                    <pre className="text-xs text-gray-600 mt-2 overflow-auto">
                      {this.state.error.toString()}
                    </pre>
                  </details>
                )}
                <Button 
                  onClick={() => window.location.reload()}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Recarregar Página
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

export default ErrorBoundary;