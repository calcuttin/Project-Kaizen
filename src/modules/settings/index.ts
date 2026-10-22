import { Settings } from 'lucide-react';
import type { KaizenModule } from '@/app/modules';
import { lazy } from 'react';
const SettingsPage = lazy(() => import('./SettingsPage').then((module) => ({ default: module.SettingsPage })));

export const settingsModule: KaizenModule = {
  id: 'settings', name: 'Settings', tagline: 'Theme, backup, data', icon: Settings, path: '/settings', Page: SettingsPage, hidden: true,
};
