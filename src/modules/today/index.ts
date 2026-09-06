import { Sunrise } from 'lucide-react';
import type { KaizenModule } from '@/app/modules';
import { TodayPage } from './TodayPage';

export const todayModule: KaizenModule = {
  id: 'today', name: 'Today', tagline: 'Your day, composed', icon: Sunrise, path: '/', Page: TodayPage,
};
