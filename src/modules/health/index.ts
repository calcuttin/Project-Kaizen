import { HeartPulse } from 'lucide-react';
import type { KaizenModule } from '@/app/modules';
import { HealthPage } from './HealthPage';
import { HabitsWidget } from './widgets';

export const healthModule: KaizenModule = {
  id: 'health', name: 'Health', tagline: 'Habits, streaks, and goals', icon: HeartPulse, path: '/health', Page: HealthPage,
  widgets: [{ id: 'habits', order: 20, Component: HabitsWidget }],
};
