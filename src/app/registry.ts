/**
 * Register every module here. Order = sidebar order.
 * To add a life area: create src/modules/<area>/index.ts exporting a KaizenModule and add it to this list.
 */
import type { KaizenModule } from './modules';
import { todayModule } from '@/modules/today';
import { tasksModule } from '@/modules/tasks';
import { healthModule } from '@/modules/health';
import { libraryModule } from '@/modules/library';
import { feedModule } from '@/modules/feed';
import { studioModule } from '@/modules/studio';
import { settingsModule } from '@/modules/settings';

export const modules: KaizenModule[] = [todayModule, tasksModule, studioModule, healthModule, libraryModule, feedModule, settingsModule];
