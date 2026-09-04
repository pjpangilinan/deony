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
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', fontFamily: 'var(--font-family-base)' }}>
          <h2 style={{ fontFamily: 'var(--font-family-serif)', color: 'var(--color-primary-dark)' }}>Oops, something went wrong!</h2>
          <p style={{ margin: '1rem 0', color: 'var(--color-text-secondary)' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button 
            onClick={() => {
              this.setState({ hasError: false });
              window.location.href = '/';
            }}
            style={{ 
              padding: '0.75rem 1.5rem', 
              marginTop: '1rem', 
              cursor: 'pointer',
              background: 'var(--color-primary-dark)',
              color: '#fff',
              border: 'none',
              borderRadius: '4px'
            }}
          >
            Return to Home
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
