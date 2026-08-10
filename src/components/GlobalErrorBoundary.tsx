import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Send, ShieldAlert } from "lucide-react";

interface Props {
  children: ReactNode;
  currentUserEmail?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isReporting: boolean;
  reported: boolean;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isReporting: false,
      reported: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    this.sendCrashReport(error, errorInfo?.componentStack || "");
  }

  componentDidMount() {
    // Listen to uncaught JS exceptions
    window.addEventListener("error", this.handleGlobalError);
    window.addEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener("error", this.handleGlobalError);
    window.removeEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  handleGlobalError = (event: ErrorEvent) => {
    if (event.error) {
      this.sendCrashReport(event.error, "Global Window Error");
    } else if (event.message) {
      this.sendCrashReport(new Error(event.message), `File: ${event.filename}:${event.lineno}`);
    }
  };

  handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const err = reason instanceof Error ? reason : new Error(String(reason || "Unhandled Promise Rejection"));
    this.sendCrashReport(err, "Unhandled Promise Rejection");
  };

  sendCrashReport = async (error: Error, componentStack: string) => {
    const msg = (error.message || String(error)).toLowerCase();
    
    // Filtra rumore innocuo di sviluppo (es. WebSocket di Vite HMR o estensioni browser)
    if (
      msg.includes("websocket closed") ||
      msg.includes("failed to connect to websocket") ||
      msg.includes("resizeobserver loop") ||
      msg.includes("chrome-extension://") ||
      msg.includes("moz-extension://")
    ) {
      return;
    }

    if (this.state.isReporting) return;
    this.setState({ isReporting: true });

    try {
      await fetch("/api/report-crash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: error.message || String(error),
          stack: error.stack || "",
          componentStack: componentStack || "",
          userEmail: this.props.currentUserEmail || "Anonimo",
          url: window.location.href,
          userAgent: navigator.userAgent,
          appVersion: "1.0.0",
        }),
      });
      this.setState({ reported: true, isReporting: false });
    } catch (e) {
      console.warn("Failed to transmit crash report:", e);
      this.setState({ isReporting: false });
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-3 mb-4 text-amber-400">
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <AlertTriangle className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white leading-tight">
                  Ops! Si è verificato un errore
                </h1>
                <p className="text-xs text-slate-400">ViaCamperApp Safety Guard</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              L'applicazione ha riscontrato un problema imprevisto. Abbiamo catturato e inviato automaticamente il log tecnico agli sviluppatori.
            </p>

            {this.state.error && (
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-rose-300 mb-4 overflow-x-auto max-h-36">
                <p className="font-semibold text-rose-400 mb-1">{this.state.error.message}</p>
                {this.state.error.stack && (
                  <p className="text-[10px] text-slate-400 whitespace-pre-wrap">{this.state.error.stack.slice(0, 300)}...</p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-400 mb-5 px-1">
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {this.state.reported ? "Report registrato con successo" : "Invio report in corso..."}
                </span>
              </div>
            </div>

            <button
              onClick={this.handleReload}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-950/40"
            >
              <RefreshCw className="w-4 h-4 animate-spin-slow" />
              <span>Riavvia Applicazione</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
