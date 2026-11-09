import { config } from '@/core/config';
import { EXPERIENCE_METADATA_KEY, experienceHome, type Experience } from '@/core/experience';
import { useState, type ReactNode } from 'react';
import { SignInButton, SignUpButton } from '@clerk/react';
import { Cloud, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuth } from './AuthProvider';

export function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [experience, setExperience] = useState<Experience>(config.defaultExperience);

  if (!auth.ready) return <div className="auth-loading"><LoaderCircle className="auth-spinner" /><span>Opening Kaizen…</span></div>;
  if (auth.mode === 'device') return children;
  if (auth.error) return <div className="auth-shell"><div className="auth-card"><Cloud /><h1>Cloud mode needs configuration</h1><p>{auth.error}</p><code>Copy .env.example to .env.local and add your Supabase project values.</code></div></div>;
  if (auth.user) return children;

  return <div className="auth-shell">
    <div className="auth-card">
      <div className="auth-mark">改善</div>
      <span className="eyebrow">One account. Your kind of progress.</span>
      <h1>Welcome to Kaizen</h1>
      <p>Start with the full workspace or a quiet home for your books. You can switch anytime with the same account.</p>
      <div className="experience-options" role="group" aria-label="Choose your experience">
        <button type="button" aria-pressed={experience === 'full'} onClick={() => setExperience('full')}><strong>Full Kaizen</strong><span>Tasks, habits, books, and your daily workspace</span></button>
        <button type="button" aria-pressed={experience === 'bookshelf'} onClick={() => setExperience('bookshelf')}><strong>Bookshelf only</strong><span>Your books, reading progress, notes, and journal</span></button>
      </div>
      <SignUpButton mode="modal" unsafeMetadata={{ [EXPERIENCE_METADATA_KEY]: experience }} forceRedirectUrl={`${config.hashRouting ? '/#' : ''}${experienceHome(experience)}`}><Button variant="primary">Create your account</Button></SignUpButton>
      <SignInButton mode="modal"><Button className="auth-google">Sign in</Button></SignInButton>
      <small>Already use Kaizen? Sign in with your existing account. Your books stay with you in either experience.</small>
      <a className="btn ghost" href="/guides/using-kaizen.html">Help & guides</a>
    </div>
  </div>;
}
