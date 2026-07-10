import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/** Catches render errors so a single bad state never white-screens the app. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('FretNavigator caught an error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-screen">
          <h1>Something went wrong</h1>
          <p className="error-screen__msg">{this.state.error.message}</p>
          <div className="error-screen__actions">
            <button type="button" className="btn" onClick={() => this.setState({ error: null })}>
              Try again
            </button>
            <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
              Reload app
            </button>
          </div>
          <p className="error-screen__hint">
            If this keeps happening, reloading usually fixes it (it re-reads and repairs your saved boards).
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
