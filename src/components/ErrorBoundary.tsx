import { Component, type ErrorInfo, type ReactNode } from 'react';
import { exportAll } from '@/core/store';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};

  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Kaizen render failure', error, info.componentStack); }

  private downloadBackup = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(exportAll(), null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `kaizen-recovery-${new Date().toISOString().slice(0, 10)}.json`; anchor.click();
    URL.revokeObjectURL(url);
  };

  render() {
    if (!this.state.error) return this.props.children;
    return <main className="auth-shell"><section className="auth-card"><div className="auth-mark">改善</div><h1>Kaizen hit a rough patch</h1><p>Your device data is still stored locally. Download a recovery copy, then reload the app.</p><div className="row" style={{ justifyContent: 'center' }}><button className="btn" onClick={this.downloadBackup}>Download recovery copy</button><button className="btn primary" onClick={() => window.location.reload()}>Reload</button></div><small>{this.state.error.message}</small></section></main>;
  }
}
