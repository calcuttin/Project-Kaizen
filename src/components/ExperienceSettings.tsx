import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/auth/AuthProvider';
import { experienceHome, type Experience } from '@/core/experience';
import { Card } from './ui';
import { toast } from './Toast';

export function ExperienceSettings() {
  const { experience, setExperience, mode } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const nav = useNavigate();
  const choose = async (next: Experience) => {
    setSaving(true); setError('');
    try {
      await setExperience(next);
      nav(experienceHome(next));
      toast(next === 'bookshelf' ? 'Welcome to your reading space' : 'Your full Kaizen workspace is ready');
    } catch { setError('Could not save your experience. Your current setup is unchanged. Please retry.'); }
    finally { setSaving(false); }
  };
  return <Card title="Your experience"><p className="muted">One account, two ways to use it. Your books and reading progress stay the same when you switch.</p><div className="experience-options" role="group" aria-label="Account experience">
    <button disabled={saving || experience === 'full'} aria-pressed={experience === 'full'} onClick={() => void choose('full')}><strong>Full Kaizen</strong><span>Tasks, habits, books, and your daily workspace</span></button>
    <button disabled={saving || experience === 'bookshelf'} aria-pressed={experience === 'bookshelf'} onClick={() => void choose('bookshelf')}><strong>Bookshelf only</strong><span>Books, reading progress, notes, and journal</span></button>
  </div>{saving && <p role="status">Saving your preference…</p>}{error && <p role="alert">{error}</p>}<small className="muted">{mode === 'cloud' ? 'This preference belongs to your account. Your other Kaizen records remain available when you switch back.' : 'This device-only preference stays in this browser. Sign-in is available on a cloud deployment.'}</small></Card>;
}
