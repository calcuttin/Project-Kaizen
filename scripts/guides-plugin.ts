import { readFileSync } from 'node:fs';
import { posix, resolve } from 'node:path';
import { Marked } from 'marked';
import GithubSlugger from 'github-slugger';
import type { Plugin } from 'vite';

// Explicit publication list: never glob the workspace or include environment/backup files.
const guides = {
  'README.md': 'index',
  'docs/setup-guide.md': 'setup',
  'docs/user-guide.md': 'using-kaizen',
  'docs/local-setup.md': 'local',
  'docs/cloud-setup.md': 'cloud',
  'docs/development.md': 'development',
  'docs/operations.md': 'operations',
  'docs/security/review-2026-09-06.md': 'security',
  'TRADEMARKS.md': 'trademarks',
};
const sources = [
  'LICENSE',
  'supabase/migrations/202609040001_product_foundation.sql',
  'supabase/migrations/202609060002_clerk_auth.sql',
  'supabase/migrations/202609060003_restrict_anonymous_rpc.sql',
  'supabase/functions/delete-account/index.ts',
  'supabase/functions/delete-account/storage.ts',
];
const urls = new Map([
  ...Object.entries(guides).map(([file, slug]) => [file, `/guides/${slug}.html`] as const),
  ...sources.map((file) => [file, `/guides/source/${file}.txt`] as const),
]);
const escape = (text: string) => text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

function renderGuide(file: string, markdown: string) {
  const slugger = new GithubSlugger();
  const title = markdown.match(/^# (.+)$/m)?.[1] ?? 'Kaizen guide';
  const marked = new Marked({
    renderer: {
      heading({ tokens, depth, text }) {
        return `<h${depth} id="${escape(slugger.slug(text))}">${this.parser.parseInline(tokens)}</h${depth}>`;
      },
      // Only repository-authored Markdown is rendered; embedded HTML is displayed as text.
      html({ text }) { return escape(text); },
      image({ text }) { return escape(text); },
      link({ href, tokens }) {
        let target = href;
        if (!href.startsWith('#') && !/^https?:\/\//i.test(href)) {
          if (/^[a-z][a-z\d+.-]*:/i.test(href) || href.startsWith('//')) throw new Error(`Unsupported guide URL in ${file}`);
          const [path, fragment] = href.split('#');
          const source = posix.normalize(posix.join(posix.dirname(file), path));
          const published = urls.get(source);
          if (!published) throw new Error(`Unpublished guide link: ${file} → ${href}`);
          target = published + (fragment ? `#${fragment}` : '');
        }
        return `<a href="${escape(target)}">${this.parser.parseInline(tokens)}</a>`;
      },
    },
  });
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark"><title>${escape(title)} · Kaizen Help</title>
<link rel="icon" href="/favicon.svg"><style>
:root{color-scheme:light dark;font-family:system-ui,sans-serif;line-height:1.7;background:#faf9f6;color:#292d28}
body{max-width:860px;margin:auto;padding:24px clamp(18px,4vw,40px) 72px;overflow-wrap:break-word}
nav{display:flex;flex-wrap:wrap;gap:10px 22px;padding-bottom:20px;border-bottom:1px solid #b8c0b4;font-size:.95rem}
a{color:#345e3c;text-underline-offset:3px}a:hover{text-decoration-thickness:2px}
:focus-visible{outline:3px solid #6f9661;outline-offset:4px}h1{font-size:clamp(1.8rem,5vw,2.4rem);line-height:1.2;margin-top:36px}
h2{font-size:1.4rem;margin-top:38px}h3{font-size:1.1rem;margin-top:26px}h1,h2,h3,h4{scroll-margin-top:24px}
p,ul,ol{margin:16px 0}li+li{margin-top:8px}pre{padding:18px;overflow-x:auto;white-space:pre;background:#eeeee7;border-radius:10px}
code{font-size:.9em;background:#eeeee7;padding:2px 4px;border-radius:4px}pre code{padding:0}
table{display:block;max-width:100%;overflow-x:auto;border-collapse:collapse;margin:22px 0;font-size:.95rem}
td,th{padding:12px;text-align:left;border:1px solid #b8c0b4;min-width:120px}th{background:#eeeee7}
blockquote{margin:20px 0;padding:0 18px;border-left:3px solid #6f9661}footer{margin-top:48px;border-top:1px solid #b8c0b4;padding-top:20px;font-size:.9rem}
@media(prefers-color-scheme:dark){:root{background:#171d18;color:#e4e9df}a{color:#b1d69f}code,pre,th{background:#252e25}td,th,nav,footer{border-color:#53634c}}
@media print{nav,footer{display:none}body{max-width:none;padding:0}pre{white-space:pre-wrap}table{display:table;font-size:.8rem}a{color:inherit}}
</style></head><body>
<nav aria-label="Help navigation"><a href="/">Open Kaizen</a><a href="/guides/using-kaizen.html">Using Kaizen</a><a href="/guides/setup.html">Choose a setup</a><a href="/guides/local.html">Local setup</a><a href="/guides/cloud.html">Cloud setup</a></nav>
<main>${marked.parse(markdown)}</main>
<footer>These guides ship with this version of Kaizen. <a href="/guides/index.html">Project README</a> · <a href="/guides/operations.html">Operations</a> · <a href="/guides/source/LICENSE.txt">License</a></footer>
</body></html>`;
}

export function guidesPlugin(): Plugin {
  let root: string;
  const read = (file: string) => readFileSync(resolve(root, file), 'utf8');
  return {
    name: 'kaizen-guides',
    configResolved(config) { root = config.root; },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = new URL(req.url ?? '/', 'http://localhost').pathname;
        const entry = [...urls].find(([, url]) => url === path);
        if (!entry) return next();
        try {
          const [file] = entry;
          const isGuide = file in guides;
          res.setHeader('Content-Type', isGuide ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8');
          res.end(isGuide ? renderGuide(file, read(file)) : read(file));
        } catch (error) { next(error); }
      });
    },
    generateBundle() {
      for (const [file, url] of urls) {
        this.addWatchFile(resolve(root, file));
        this.emitFile({ type: 'asset', fileName: url.slice(1), source: file in guides ? renderGuide(file, read(file)) : read(file) });
      }
    },
  };
}
