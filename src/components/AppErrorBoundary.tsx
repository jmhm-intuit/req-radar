import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

function recoverySnapshot(): Record<string, unknown> {
  const storage: Record<string, string> = {};
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !key.startsWith("req-radar:")) continue;
      storage[key] = localStorage.getItem(key) || "";
    }
  } catch {
    // Recovery still works when storage access itself is unavailable.
  }
  return {
    app: "ReqRadar",
    appVersion: __APP_VERSION__,
    recoveredAt: new Date().toISOString(),
    storage
  };
}

function downloadRecoverySnapshot(): void {
  const blob = new Blob([JSON.stringify(recoverySnapshot(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `req-radar-recovery-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function resetReqRadarStorage(): void {
  if (!window.confirm("Reset ReqRadar data stored in this browser? Download a recovery file first if you need to preserve it.")) return;
  try {
    const keys: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith("req-radar:")) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } finally {
    window.location.reload();
  }
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("ReqRadar recovered from a runtime error.", error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <main className="app-error-screen" role="alert">
        <section>
          <div className="app-error-mark">RR</div>
          <span className="eyebrow">ReqRadar v{__APP_VERSION__}</span>
          <h1>ReqRadar could not finish loading</h1>
          <p>
            Your browser data has not been deleted. Download a recovery copy, reload the app,
            or reset only ReqRadar&apos;s local data if an older record is preventing startup.
          </p>
          <details>
            <summary>Technical detail</summary>
            <code>{this.state.error.message || "Unknown runtime error"}</code>
          </details>
          <div className="app-error-actions">
            <button className="primary" onClick={() => window.location.reload()}>Reload ReqRadar</button>
            <button className="secondary" onClick={downloadRecoverySnapshot}>Download recovery data</button>
            <button className="danger-link" onClick={resetReqRadarStorage}>Reset local ReqRadar data</button>
          </div>
        </section>
      </main>
    );
  }
}
