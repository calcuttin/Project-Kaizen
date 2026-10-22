import { downloadJson, supportReport } from '@/core/diagnostics';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { exportAll } from '@/core/store';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};

  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Kaizen render failure', error, info.componentStack); }

  render() {
    if (!this.state.error) return this.props.children;
    return <RecoveryScreen />;
  }
}

export function RecoveryScreen() {
    return <main className="auth-shell"><section className="auth-card"><div className="auth-mark">改善</div><h1>Kaizen hit a rough patch</h1><p>Download a recovery copy of the data currently available, then return to Settings or reload the app.</p><div className="row" style={{ justifyContent: 'center' }}><button className="btn" onClick={() => downloadJson(exportAll(), `kaizen-recovery-${new Date().toISOString().slice(0, 10)}.json`)}>Download recovery copy</button><a className="btn" href="/settings">Open Settings</a><button className="btn primary" onClick={() => window.location.reload()}>Reload</button></div><button className="btn" onClick={() => downloadJson(supportReport('render-failure'), 'kaizen-support-report.json')}>Download support report</button><small>The report contains save status only. Nothing is sent automatically.</small></section></main>;
}
