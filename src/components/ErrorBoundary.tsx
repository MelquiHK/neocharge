import React, { ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error) {
    console.error("ErrorBoundary caught:", error);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="container-page max-w-md text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-2xl font-bold">Algo salió mal</h1>
              <p className="text-muted-foreground">
                Encontramos un error inesperado. Por favor, intenta de nuevo.
              </p>
              {this.state.error && (
                <details className="mt-4 p-3 bg-muted rounded text-left text-xs text-muted-foreground">
                  <summary className="cursor-pointer font-mono font-semibold">Ver detalles del error</summary>
                  <div className="mt-2 space-y-2">
                    <p className="font-semibold">Mensaje:</p>
                    <pre className="overflow-auto">{this.state.error.message}</pre>
                    {this.state.error.stack && (
                      <>
                        <p className="font-semibold">Stack:</p>
                        <pre className="overflow-auto">{this.state.error.stack}</pre>
                      </>
                    )}
                  </div>
                </details>
              )}
            </div>
            <Button onClick={this.handleReset} variant="hero" size="lg" className="w-full">
              <RefreshCw className="w-4 h-4" /> Recargar
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
