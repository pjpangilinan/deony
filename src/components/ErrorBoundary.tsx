import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background text-on-surface flex items-center justify-center p-gutter">
          <div className="flex flex-col items-center text-center max-w-[540px] p-xl rounded-2xl bg-surface border border-tertiary/25 shadow-sm">
            <span className="material-symbols-outlined text-[48px] text-error mb-sm">
              warning
            </span>
            <h2 className="font-headline-md text-headline-md text-primary mb-xs">
              A Ripple in the Sanctuary
            </h2>
            <p className="font-body-md text-body-md text-secondary mb-lg leading-relaxed">
              {this.state.error?.message || 'An unexpected error occurred while rendering this view.'}
            </p>
            <button 
              type="button"
              onClick={() => {
                this.setState({ hasError: false });
                window.location.href = '/';
              }}
              className="bg-primary text-on-primary font-label-md text-label-md px-xl py-sm rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
            >
              Return Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
