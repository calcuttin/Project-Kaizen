import type { ReactNode } from 'react';
import { SignInButton, SignUpButton } from '@clerk/react';
import { Cloud, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuth } from './AuthProvider';

export function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth();

  if (!auth.ready) return <div className="auth-loading"><LoaderCircle className="auth-spinner" /><span>Opening Kaizen…</span></div>;
  if (auth.mode === 'device') return children;
  if (auth.error) return <div className="auth-shell"><div className="auth-card"><Cloud /><h1>Cloud mode needs configuration</h1><p>{auth.error}</p><code>Copy .env.example to .env.local and add your Supabase project values.</code></div></div>;
  if (auth.user) return children;

  return <div className="auth-shell">
    <div className="auth-card">
      <div className="auth-mark">改善</div>
      <span className="eyebrow">Your life, in steady motion</span>
      <h1>Welcome to Kaizen</h1>
      <p>Sign in to keep your private workspace in sync across your devices.</p>
      <SignUpButton mode="modal"><Button variant="primary">Create your account</Button></SignUpButton>
      <SignInButton mode="modal"><Button className="auth-google">Sign in</Button></SignInButton>
      <small>Each account has its own workspace. Changes sync automatically after sign-in.</small>
      <a className="btn ghost" href="/guides/using-kaizen.html">Help & guides</a>
    </div>
  </div>;
}
