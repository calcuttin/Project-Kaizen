import { Settings } from 'lucide-react';
import type { KaizenModule } from '@/app/modules';
import { SettingsPage } from './SettingsPage';

export const settingsModule: KaizenModule = {
  id: 'settings', name: 'Settings', tagline: 'Theme, backup, data', icon: Settings, path: '/settings', Page: SettingsPage, hidden: true,
};
