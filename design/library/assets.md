# Bookshelf artwork

The selected visual combines genre dioramas and customizable side cabinets. Design references and QA screenshots can contain personal book titles and shelf locations, so they are retained in the ignored local `private-data/pre-public-review/design/library/` archive rather than published with the source.

All environment and object assets were generated with the built-in Image Gen tool. Original PNGs remain in `public/library/`. Prompt records are in this directory where available.

| Public asset | Prompt record / art direction |
| --- | --- |
| environments/research.png | research-prompt.txt |
| environments/tech.png | Warm walnut inventor's workshop, brass circuits, vintage apparatus at the left, a dark book backdrop across the center and right; panoramic cabinet scene. |
| environments/study.png | Warm walnut study, subdued green damask, brass details and lamplight, a quiet center for books; panoramic cabinet scene. |
| environments/fantasy.png | fantasy-prompt.txt |
| environments/noir.png | noir-prompt.txt |
| environments/history.png | history-prompt.txt |
| environments/espionage.png | espionage-prompt.txt |
| objects/apple-ii.png | apple-ii-prompt.txt |
| objects/orrery.png | orrery-prompt.txt |
| objects/orrery-base.png | orrery-base-prompt.txt |
| objects/wafer.png | wafer-prompt.txt |
| objects/dragon.png | dragon-prompt.txt |
| objects/bust.png | bust-prompt.txt |
| objects/lantern.png | lantern-prompt.txt |

The computer is silhouette-clipped in CSS and has a functional screen overlay. Black-background objects blend into the real environment artwork. The orrery disk rotates independently of its pedestal. Original artwork is retained at full resolution; compression variants can be added before public deployment.

Shelf themes map to these assets in `src/modules/library/cabinet.ts`. Books, titles, locations and counts come from the existing persisted library, not the illustrative mockup.
