import { lazy, Suspense, useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { modules } from './registry';
import { useUI } from './uiStore';
import { Shell } from '@/components/Shell';
import { toast } from '@/components/Toast';
import { DeviceAuthProvider } from '@/core/auth/AuthProvider';
import '@/core/auth/auth.css';
import { cloudConfigurationError, config } from '@/core/config';
import { ErrorBoundary, RecoveryScreen } from '@/components/ErrorBoundary';

const CloudApplication = lazy(() => import('./CloudApplication'));

const router = createBrowserRouter([
  {
    path: '/',
    element: <Shell />,
    errorElement: <RecoveryScreen />,
    children: modules.map((m) => ({ path: m.path === '/' ? undefined : m.path.slice(1), index: m.path === '/', element: <Suspense fallback={<div className="page" role="status">Loading…</div>}><m.Page /></Suspense>, errorElement: <RecoveryScreen /> })),
  },
]);

export function App() {
  const theme = useUI((s) => s.theme);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => {
    if (!config.enableBundledImports) return;
    void import('./imports').then(({ runBundledImports }) => runBundledImports()).then(({ books, items }) => {
      if (books || items) toast(`Imported ${books ? `${books} books from your shelves` : ''}${books && items ? ' and ' : ''}${items ? `${items} reading-list items from Notion` : ''}`);
    }).catch(console.error);
  }, []);
  const app = <RouterProvider router={router} />;
  if (config.mode === 'device') return <ErrorBoundary><DeviceAuthProvider>{app}</DeviceAuthProvider></ErrorBoundary>;
  if (!config.clerkPublishableKey || cloudConfigurationError()) return <ErrorBoundary><div className="auth-shell"><div className="auth-card"><h1>Cloud mode needs configuration</h1><p>{cloudConfigurationError()}</p></div></div></ErrorBoundary>;
  return <ErrorBoundary><Suspense fallback={<div className="auth-shell" role="status">Loading sign-in…</div>}><CloudApplication>{app}</CloudApplication></Suspense></ErrorBoundary>;
}
