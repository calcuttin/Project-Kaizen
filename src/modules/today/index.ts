import { Sunrise } from 'lucide-react';
import type { KaizenModule } from '@/app/modules';
import { lazy } from 'react';
const TodayPage = lazy(() => import('./TodayPage').then((module) => ({ default: module.TodayPage })));

export const todayModule: KaizenModule = {
  id: 'today', name: 'Today', tagline: 'Your day, composed', icon: Sunrise, path: '/', Page: TodayPage,
};
