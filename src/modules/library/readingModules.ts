import { lazy } from 'react';
import { BookOpen, NotebookPen } from 'lucide-react';
import type { KaizenModule } from '@/app/modules';
export const readingModule: KaizenModule = { id: 'reading', name: 'Reading', tagline: 'Your current books and reading progress', icon: BookOpen, path: '/reading', Page: lazy(() => import('./ReadingPage').then(m => ({ default: m.ReadingPage }))) };
export const readingJournalModule: KaizenModule = { id: 'reading-journal', name: 'Journal', tagline: 'Your reading sessions and year in books', icon: NotebookPen, path: '/reading-journal', Page: lazy(() => import('./ReadingPage').then(m => ({ default: m.ReadingJournalPage }))) };
