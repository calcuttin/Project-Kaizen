import type { ReactNode } from 'react';
import { ClerkProvider } from '@clerk/react';
import { ClerkAuthProvider } from '@/core/auth/ClerkAuthProvider';
import { AuthGate } from '@/core/auth/AuthGate';
import { WorkspaceGate } from '@/core/auth/WorkspaceGate';
import { CloudSync } from '@/core/sync/CloudSync';
import { config } from '@/core/config';

export default function CloudApplication({ children }: { children: ReactNode }) {
  return <ClerkProvider publishableKey={config.clerkPublishableKey!} afterSignOutUrl={config.appUrl}><ClerkAuthProvider><WorkspaceGate><AuthGate><CloudSync />{children}</AuthGate></WorkspaceGate></ClerkAuthProvider></ClerkProvider>;
}
