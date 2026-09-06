import { useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ClerkProvider } from '@clerk/react';
import { modules } from './registry';
import { useUI } from './uiStore';
import { Shell } from '@/components/Shell';
import { toast } from '@/components/Toast';
import { ClerkAuthProvider, DeviceAuthProvider } from '@/core/auth/AuthProvider';
import { AuthGate } from '@/core/auth/AuthGate';
import { WorkspaceGate } from '@/core/auth/WorkspaceGate';
import '@/core/auth/auth.css';
import { CloudSync } from '@/core/sync/CloudSync';
import { cloudConfigurationError, config } from '@/core/config';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Shell />,
    children: modules.map((m) => ({ path: m.path === '/' ? undefined : m.path.slice(1), index: m.path === '/', element: <m.Page /> })),
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
  return <ErrorBoundary><ClerkProvider publishableKey={config.clerkPublishableKey} afterSignOutUrl={config.appUrl}><ClerkAuthProvider><WorkspaceGate><AuthGate><CloudSync />{app}</AuthGate></WorkspaceGate></ClerkAuthProvider></ClerkProvider></ErrorBoundary>;
}
