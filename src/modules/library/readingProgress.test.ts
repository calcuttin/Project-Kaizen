import 'fake-indexeddb/auto';
import { beforeEach, expect, it } from 'vitest';
import { useLibrary } from './store';
beforeEach(() => useLibrary.setState({ books:{}, shelves:{}, sessions:[], annotations:{} }));
it('switching a finished book back to Reading keeps history and starts a fresh pass', () => {
 const lib=useLibrary.getState(); const b=lib.addBook({title:'Test book',author:'Author',pages:100,status:'reading'});
 lib.logProgress(b.id,100);
 expect(useLibrary.getState().sessions).toHaveLength(1);
 lib.setStatus(b.id,'reading');
 expect(useLibrary.getState().books[b.id]).toMatchObject({status:'reading',currentPage:0,finishedAt:undefined});
 expect(useLibrary.getState().sessions[0].pages).toBe(100);
 lib.logProgress(b.id,10);
 expect(useLibrary.getState().sessions.map(s=>s.pages)).toEqual([100,10]);
});
it('same-page logging does not duplicate a session and manual completion invents no pages', () => {
 const lib=useLibrary.getState();const b=lib.addBook({title:'Progress',author:'A',pages:100});
 lib.logProgress(b.id,30);lib.logProgress(b.id,30);lib.setStatus(b.id,'finished');
 expect(useLibrary.getState().sessions).toHaveLength(1);
 expect(useLibrary.getState().sessions[0].pages).toBe(30);
 lib.setStatus(b.id,'paused');expect(useLibrary.getState().books[b.id].finishedAt).toBeUndefined();
});
