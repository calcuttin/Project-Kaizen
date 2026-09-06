/** Sample data so a first-time user can feel the app before entering their own life. */
import { shiftKey, todayKey } from '@/core/dates';
import { useTasks } from '@/modules/tasks/store';
import { useHealth } from '@/modules/health/store';
import { useLibrary } from '@/modules/library/store';
import { useFeed } from '@/modules/feed/store';
import { useJournal } from '@/modules/journal/store';

export function seedSampleData() {
  const t = todayKey();
  const T = useTasks.getState();
  const admin = T.addProject('Admin', 'personal', '#7aa2f7');
  const home = T.addProject('Home', 'personal', '#73daca');
  const launch = T.addProject('Q4 launch', 'business', '#9ece6a');
  const clients = T.addProject('Clients', 'business', '#e0af68');
  T.addTask({ title: 'Renew passport', domain: 'personal', projectId: admin.id, priority: 2, due: shiftKey(t, 5), status: 'next' });
  T.addTask({ title: 'Book dentist appointment', domain: 'personal', projectId: admin.id, priority: 1, status: 'inbox' });
  T.addTask({ title: 'Fix the garage light', domain: 'personal', projectId: home.id, priority: 1, scheduled: t, status: 'next' });
  T.addTask({ title: 'Plan weekend hike', domain: 'personal', priority: 0, status: 'inbox' });
  T.addTask({ title: 'Finalize launch pricing', domain: 'business', projectId: launch.id, priority: 3, due: t, status: 'doing', subtasks: [{ id: 's1', title: 'Compare competitor tiers', done: true }, { id: 's2', title: 'Draft pricing page copy', done: false }] });
  T.addTask({ title: 'Send proposal to Northwind', domain: 'business', projectId: clients.id, priority: 3, due: shiftKey(t, -1), status: 'next' });
  T.addTask({ title: 'Waiting on legal review', domain: 'business', projectId: launch.id, priority: 2, status: 'waiting' });
  T.addTask({ title: 'Prep board update', domain: 'business', priority: 2, due: shiftKey(t, 3), status: 'next' });
  T.addTask({ title: 'Clear inbox to zero', domain: 'business', priority: 0, status: 'done', completedAt: new Date().toISOString() });

  const H = useHealth.getState();
  const water = H.addHabit({ name: 'Drink water', emoji: '💧', kind: 'count', target: 8, unit: 'glasses' });
  const walk = H.addHabit({ name: 'Walk 30 min', emoji: '🚶', kind: 'check' });
  const sleep = H.addHabit({ name: 'In bed by 11', emoji: '😴', kind: 'check' });
  const lift = H.addHabit({ name: 'Strength training', emoji: '🏋️', kind: 'check', daysPerWeek: 3 });
  for (let i = 1; i <= 20; i++) {
    const d = shiftKey(t, -i);
    if (i % 5 !== 0) H.setLog(water.id, d, 6 + (i % 3));
    if (i % 4 !== 0) H.setLog(walk.id, d, 1);
    if (i % 3 !== 0) H.setLog(sleep.id, d, 1);
    if (i % 2 === 0 && i % 6 !== 0) H.setLog(lift.id, d, 1);
  }
  H.setLog(water.id, t, 3); H.setLog(walk.id, t, 1);
  H.addGoal({ title: 'Reach 175 lb', emoji: '⚖️', unit: 'lb', start: 189, target: 175, deadline: shiftKey(t, 90), entries: [{ date: shiftKey(t, -30), value: 189 }, { date: shiftKey(t, -14), value: 186 }, { date: shiftKey(t, -3), value: 184.5 }] });
  H.addGoal({ title: 'Run 5k under 25:00', emoji: '🏃', unit: 'min', start: 31, target: 25, entries: [{ date: shiftKey(t, -20), value: 31 }, { date: shiftKey(t, -6), value: 29.5 }] });

  useJournal.getState().upsert(shiftKey(t, -1), { intention: 'Say no to one meeting that could be an email.', mood: 4, wins: ['Shipped the pricing draft', 'Walked at lunch instead of scrolling'] });

  const L = useLibrary.getState();
  if (Object.keys(L.books).length) return seedFeedIfEmpty();
  const office = L.addShelf('Office shelf');
  const kindle = L.addShelf('Kindle');
  const b1 = L.addBook({ title: 'Atomic Habits', author: 'James Clear', pages: 320, status: 'reading', currentPage: 140, shelfId: office.id, hue: 30 });
  const b2 = L.addBook({ title: 'The Almanack of Naval Ravikant', author: 'Eric Jorgenson', pages: 242, status: 'reading', currentPage: 60, shelfId: kindle.id, hue: 200 });
  L.addBook({ title: 'Deep Work', author: 'Cal Newport', pages: 296, status: 'finished', finishedAt: shiftKey(t, -40), rating: 5, shelfId: office.id, hue: 260 });
  L.addBook({ title: 'The Mom Test', author: 'Rob Fitzpatrick', pages: 136, status: 'finished', finishedAt: shiftKey(t, -12), rating: 4, shelfId: kindle.id, hue: 140 });
  L.addBook({ title: 'Thinking in Systems', author: 'Donella Meadows', pages: 240, status: 'want', shelfId: office.id, hue: 90 });
  L.addBook({ title: 'Meditations', author: 'Marcus Aurelius', pages: 254, status: 'want', shelfId: office.id, hue: 350 });
  L.addBook({ title: 'High Output Management', author: 'Andrew Grove', pages: 272, status: 'paused', currentPage: 90, shelfId: kindle.id, hue: 180 });
  L.logProgress(b1.id, 152, shiftKey(t, -2)); L.logProgress(b1.id, 165, shiftKey(t, -1)); L.logProgress(b2.id, 78, t);
  L.setGoal({ books: 20, pagesPerDay: 20 });
  seedFeedIfEmpty();
}

function seedFeedIfEmpty() {
  const F = useFeed.getState();
  if (Object.keys(F.sources).length) return;
  const acq = F.addSource({ name: 'Acquired', kind: 'podcast', domain: 'business', url: 'https://acquired.fm' });
  const lenny = F.addSource({ name: "Lenny's Newsletter", kind: 'substack', domain: 'business', url: 'https://lennysnewsletter.com' });
  const huber = F.addSource({ name: 'Huberman Lab', kind: 'podcast', domain: 'personal' });
  const stratechery = F.addSource({ name: 'Stratechery', kind: 'newsletter', domain: 'business' });
  F.addItem({ sourceId: acq.id, title: 'Costco', durationMin: 190, progressMin: 45, status: 'in-progress' });
  F.addItem({ sourceId: lenny.id, title: 'How to write a great PRD', durationMin: 12 });
  F.addItem({ sourceId: huber.id, title: 'Sleep toolkit', durationMin: 95, pinned: true });
  F.addItem({ sourceId: stratechery.id, title: 'The AI unbundling', durationMin: 15 });
  const done1 = F.addItem({ sourceId: lenny.id, title: 'Career ladders that actually work', durationMin: 10 });
  F.complete(done1.id, 'Promote on demonstrated scope, not tenure. Write the ladder before you need it.', 4);
  const done2 = F.addItem({ sourceId: acq.id, title: 'Nvidia (Part III)', durationMin: 210 });
  F.complete(done2.id, 'Platform moats compound when the ecosystem does the R&D for you.', 5);

}
