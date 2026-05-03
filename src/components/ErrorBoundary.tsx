import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-white/5 border border-white/10 backdrop-blur-3xl rounded-[2.5rem] p-10 text-center shadow-2xl relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-600/20 blur-[80px] rounded-full pointer-events-none" />
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center text-red-500 mb-8">
                <AlertTriangle size={40} />
              </div>
              
              <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-4">
                Something went wrong
              </h1>
              
              <p className="text-slate-400 text-sm leading-relaxed mb-8">
                The application encountered an unexpected error. This might be due to corrupted data or a temporary glitch.
              </p>

              {error && (
                <div className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 mb-8 text-left">
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 px-1">Error Diagnostics</p>
                  <p className="text-xs font-mono text-red-400/80 break-all leading-tight">
                    {error.message}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-3 w-full">
                <button
                  onClick={this.handleReset}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20"
                >
                  <RotateCcw size={16} /> Hard Reload
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/60 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  <Home size={16} /> Return Home
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}
