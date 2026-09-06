import { Library } from 'lucide-react';
import type { KaizenModule } from '@/app/modules';
import { LibraryPage } from './LibraryPage';
import { ReadingWidget } from './widgets';

export const libraryModule: KaizenModule = {
  id: 'library', name: 'Library', tagline: 'Bookshelves and reading goals', icon: Library, path: '/library', Page: LibraryPage,
  widgets: [{ id: 'reading', order: 30, Component: ReadingWidget }],
};
