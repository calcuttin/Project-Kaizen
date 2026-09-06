import { Lightbulb, Mic } from 'lucide-react';
import type { KaizenModule } from '@/app/modules';
import { toast } from '@/components/Toast';
import { StudioPage } from './StudioPage';
import { StudioWidget } from './widgets';
import { useStudio } from './store';

export const studioModule: KaizenModule = {
  id: 'studio', name: 'Studio', tagline: 'Posts, episodes, and your audience', icon: Mic, path: '/studio', Page: StudioPage,
  widgets: [{ id: 'studio', order: 15, Component: StudioWidget }],
  quickActions: [{
    id: 'capture-idea', label: 'Capture idea', hint: 'Adds to your Studio ideas', icon: Lightbulb, acceptsInput: true, keywords: ['episode', 'post', 'content'],
    run: (input) => {
      const st = useStudio.getState(); st.ensureDefaults();
      const channel = Object.values(st.channels)[0]; if (!channel || !input.trim()) return;
      st.addPiece({ channelId: channel.id, title: input, stage: 'idea' }); toast('Idea captured');
    },
  }],
};
