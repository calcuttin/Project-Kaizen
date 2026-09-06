/**
 * Module registry — the extension point of Kaizen.
 *
 * Every feature (Tasks, Health, Library, Feed, …) is a self-contained module that declares:
 *   - a route + page component
 *   - navigation metadata
 *   - dashboard widgets that the Today page composes
 *   - quick actions exposed through the command palette
 *
 * Adding a new life area = adding one folder under src/modules and registering it in src/app/registry.ts.
 * Nothing else in the app needs to change.
 */
import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface DashboardWidget {
  id: string;
  /** Lower renders first. Today page sorts by this. */
  order: number;
  /** 'span-2' takes two columns on wide screens. */
  size?: 'span-1' | 'span-2';
  Component: ComponentType;
}

export interface QuickAction {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  keywords?: string[];
  /** Runs the action; receives the free text typed after the command (if any). */
  run: (input: string, nav: (path: string) => void) => void;
  /** If true, the palette treats trailing text as input for this action. */
  acceptsInput?: boolean;
}

export interface KaizenModule {
  id: string;
  name: string;
  tagline: string;
  icon: LucideIcon;
  path: string;
  Page: ComponentType;
  widgets?: DashboardWidget[];
  quickActions?: QuickAction[];
  /** Hide from the sidebar (e.g. settings lives in the footer). */
  hidden?: boolean;
}
