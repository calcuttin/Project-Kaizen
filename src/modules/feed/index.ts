import { Rss } from 'lucide-react';
import type { KaizenModule } from '@/app/modules';
import { FeedPage } from './FeedPage';
import { UpNextWidget } from './widgets';

export const feedModule: KaizenModule = {
  id: 'feed', name: 'Feed', tagline: 'Podcasts, Substacks, and takeaways', icon: Rss, path: '/feed', Page: FeedPage,
  widgets: [{ id: 'up-next', order: 40, Component: UpNextWidget }],
};
