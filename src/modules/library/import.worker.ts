import { parseImport, type ImportKind } from './importPreview';
self.onmessage = (event: MessageEvent<{ kind: ImportKind; text: string }>) => {
  try { self.postMessage({ preview: parseImport(event.data.kind, event.data.text) }); }
  catch (error) { self.postMessage({ error: error instanceof Error ? error.message : 'Unable to read this file.' }); }
};
