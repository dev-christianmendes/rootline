"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw, Bug } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@rootline/ui";
import { toast } from "sonner";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
    this.props.onError?.(error, errorInfo);

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReport = () => {
    if (this.state.error) {
      // In production, send to error tracking service (Sentry, etc.)
      const errorReport = {
        message: this.state.error.message,
        stack: this.state.error.stack,
        componentStack: this.state.errorInfo?.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      // Copy to clipboard for easy reporting
      navigator.clipboard
        .writeText(JSON.stringify(errorReport, null, 2))
        .then(() => {
          toast.success("Error details copied to clipboard");
        })
        .catch(() => {
          toast.error("Failed to copy error details");
        });
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[300px] items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <Bug className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle>Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-muted-foreground">
                We caught an unexpected error. The development team has been
                notified.
              </p>

              {process.env.NODE_ENV === "development" && this.state.error && (
                <details className="text-left">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                    Error details (development)
                  </summary>
                  <pre className="mt-2 overflow-auto rounded-md bg-muted p-3 text-xs text-muted-foreground max-h-48">
                    {this.state.error?.message}
                    {this.state.error?.stack && `\n\n${this.state.error.stack}`}
                  </pre>
                </details>
              )}

              <div className="flex gap-2">
                <Button
                  variant="default"
                  onClick={this.handleRetry}
                  className="flex-1"
                >
                  Try again
                </Button>
                <Button
                  variant="outline"
                  onClick={this.handleReport}
                  className="flex-1"
                >
                  Copy error details
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

/**
 * Network error boundary specifically for API/network errors
 */
export function NetworkErrorBoundary({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <ErrorBoundary
      onError={(error) => {
        // Check if it's a network error
        if (
          error.message.includes("NetworkError") ||
          error.message.includes("Failed to fetch") ||
          error.message.includes("Network request failed")
        ) {
          toast.error("Network error", {
            description:
              "Unable to connect to the server. Please check your connection.",
            action: {
              label: "Retry",
              onClick: () => window.location.reload(),
            },
          });
        }
      }}
      fallback={fallback}
    >
      {children}
    </ErrorBoundary>
  );
}
