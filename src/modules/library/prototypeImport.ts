import { assertSafeJson, isRecord, validateBackupField } from '@/core/backupValidation';
import { isDateKey } from '@/core/dates';
import type { Book, BookStatus, ReadingSession, Shelf } from './store';

export const PROTOTYPE_KEY = 'kaizen-bookshelf:library:v1';
type PrototypeBook = { id:string; title:string; author:string; pages:number; currentPage:number; status:BookStatus; shelf:string; notes:string; isbn:string; rating:number; color:number; finishedAt:string|null };
export type PrototypeLibrary = { version:1; demo:boolean; books:PrototypeBook[]; sessions:ReadingSession[] };
export function parsePrototype(raw:string): PrototypeLibrary {
  const value:unknown=JSON.parse(raw);assertSafeJson(value);
  const invalid=()=>{throw new Error('The earlier library could not be read safely. Download it to keep a copy; nothing has been imported.');};
  if(!isRecord(value)||value.version!==1||typeof value.demo!=='boolean'||!Array.isArray(value.books)||!Array.isArray(value.sessions)) return invalid();
  const ids=new Set<string>();
  for(const b of value.books){
    if(!isRecord(b)||typeof b.id!=='string'||!b.id||ids.has(b.id)||typeof b.title!=='string'||!b.title.trim()||typeof b.author!=='string'||typeof b.shelf!=='string'||typeof b.notes!=='string'||typeof b.isbn!=='string'||!['want','reading','finished','paused'].includes(String(b.status))||!Number.isInteger(b.pages)||Number(b.pages)<1||!Number.isInteger(b.currentPage)||Number(b.currentPage)<0||Number(b.currentPage)>Number(b.pages)||!Number.isInteger(b.rating)||Number(b.rating)<0||Number(b.rating)>5||!Number.isInteger(b.color)||!(b.finishedAt===null||isDateKey(b.finishedAt))) return invalid();
    ids.add(b.id);
  }
  const sessions=new Set<string>();
  for(const s of value.sessions){if(!isRecord(s)||typeof s.id!=='string'||sessions.has(s.id)||typeof s.bookId!=='string'||!ids.has(s.bookId)||!isDateKey(s.date)||!Number.isInteger(s.pages)||Number(s.pages)<1)return invalid();sessions.add(s.id);}
  return value as unknown as PrototypeLibrary;
}
const idFor=(kind:string,id:string)=>`bookshelf-v1:${kind}:${encodeURIComponent(id)}`;
const titleKey=(b:{title:string;author:string})=>`${b.title.trim().toLocaleLowerCase()}|${b.author.trim().toLocaleLowerCase()}`;
const isbnKey=(isbn?:string)=>isbn?.replace(/[^\dx]/gi,'').toUpperCase()||'';
export function planPrototypeImport(old:PrototypeLibrary,current:{books:Record<string,Book>;shelves:Record<string,Shelf>;sessions:ReadingSession[]},includeSamples=false){
  const books={...current.books},shelves={...current.shelves},sessions=[...current.sessions];
  const existingTitles=new Set(Object.values(books).map(titleKey));
  const existingIsbns=new Set(Object.values(books).map(b=>isbnKey(b.isbn)).filter(Boolean));
  const addedIds=new Set<string>();const now=new Date().toISOString();let skipped=0;
  for(const b of old.books){
    if(old.demo&&!includeSamples&&b.id.startsWith('sample-')){skipped++;continue;}
    const id=idFor('book',b.id),isbn=isbnKey(b.isbn);
    if(books[id]||existingTitles.has(titleKey(b))||(isbn&&existingIsbns.has(isbn))){skipped++;continue;}
    const shelfName=b.shelf.trim()||'My bookshelf';
    let shelf=Object.values(shelves).find(s=>s.name.toLocaleLowerCase()===shelfName.toLocaleLowerCase());
    if(!shelf){shelf={id:idFor('shelf',shelfName),name:shelfName,order:Object.keys(shelves).length,createdAt:now,updatedAt:now};shelves[shelf.id]=shelf;}
    books[id]={id,title:b.title,author:b.author,pages:b.pages,currentPage:b.currentPage,status:b.status,shelfId:shelf.id,isbn:b.isbn||undefined,notes:b.notes,rating:b.rating?b.rating as Book['rating']:undefined,hue:Math.abs(b.color*47)%360,tags:[],finishedAt:b.status==='finished'?b.finishedAt??undefined:undefined,createdAt:now,updatedAt:now};
    existingTitles.add(titleKey(b));if(isbn)existingIsbns.add(isbn);addedIds.add(b.id);
  }
  const sessionIds=new Set(sessions.map(s=>s.id));
  for(const s of old.sessions){const id=idFor('session',s.id);if(addedIds.has(s.bookId)&&!sessionIds.has(id)){sessions.push({...s,id,bookId:idFor('book',s.bookId)});sessionIds.add(id);}}
  validateBackupField('library.books',books,current.books);validateBackupField('library.shelves',shelves,current.shelves);validateBackupField('library.sessions',sessions,current.sessions);
  return {books,shelves,sessions,added:addedIds.size,skipped};
}
