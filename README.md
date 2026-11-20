# Scalecraft

System design, animated. Each lesson starts with a real problem and adds one idea per step, while an isometric diagram shows traffic flowing, servers heating up and metrics changing.

- **40 lessons · 9 modules · 313 animated steps** — Foundations, Scaling, Data & Storage, Communication, Reliability, Architecture, Security, Shipping, and Whole Systems capstones (URL shortener, news feed, chat).
- Step-by-step narrative panel with callouts, "what changed" lists and a "you'll learn" checklist.
- Live metric chips, load meters, health badges and animated request/response packets.
- Course drawer, `Ctrl`/`⌘` + `K` search across lessons and steps, light/dark theme.
- Progress and theme are stored in `localStorage` — nothing leaves your machine.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/
npm run preview    # serve the production build
npm run lint
npm run check:lessons  # layout checker for every lesson diagram
```

## Keyboard

| Key | Action |
| --- | --- |
| `←` / `→` | previous / next step |
| `R` | replay the step's animation |
| `Space` | pause / resume traffic |
| `Ctrl K` or `/` | search |
| `Esc` | close menu / search |

URLs are shareable: `#/<lesson-id>/<step>`, e.g. `#/caching/4`.

## Deploy

It's a fully static site — no server, database, API or environment variables. `npm run build` writes everything to `dist/` (about 770 KB: one HTML file, one JS bundle, one CSS file, fonts, favicon). Upload that folder to any static host:

- **GitHub Pages / Netlify / Cloudflare Pages / Vercel:** build command `npm run build`, output directory `dist`.
- **Any web server or bucket:** copy the contents of `dist/` (nginx, Apache, S3, an internal file share served over HTTP…).

Asset paths are relative and routing uses the URL hash, so it works from a sub-path (e.g. `https://you.github.io/scalecraft/`) and needs no rewrite rules. It does need to be served over HTTP(S); opening `dist/index.html` straight from disk won't load the JS module. Progress and settings live in each visitor's `localStorage`.

## How it's built

React 19 + TypeScript + Vite, hand-drawn SVG, no chart or animation libraries.

```
src/
  types.ts              Lesson / Step / Scene data model
  lessons/              Lesson content (pure data) + kit.ts authoring helpers
  scene/
    geom.ts             Iso grid projection, link routing, path maths
    shapes.tsx          Cubes, cylinders, laptops, queues, crowds, pills, meters
    layout.ts           Per-lesson camera bounds, label offsets
    Scene.tsx           SVG renderer + requestAnimationFrame packet loop
  components/           Header, Sidebar, LessonView, SearchModal, Outline
  hooks/state.ts        Hash routing, theme, progress
  index.css             Design tokens (light/dark) and all styling
```

### Adding a lesson

Lessons are data. Define a cast of nodes once, then pick and tweak them per step:

```ts
const n = cast({
  you:    { kind: 'device', at: [-4, 0], tag: 'you' },
  server: { kind: 'cube',   at: [0, 0],  label: 'Server', icon: Server, tone: 'blue' },
  db:     { kind: 'db',     at: [3.5, 3.5], tag: 'database' },
});

steps: [{
  short: 'Query', title: 'The server asks the database', tag: 'Technique',
  body: ['Text with **highlights** and `code`.'],
  scene: {
    nodes: n('you', ['server', { meter: 40 }], 'db'),
    links: [L('you', 'server'), L('server', 'db', { label: 'SELECT …' })],
    flows: [F(['you', 'server', 'db'], { ret: true })],
  },
  metrics: { latency: '55 ms' },
}]
```

Grid positions are `[col, row]`; moving `(+1, +1)` or `(+1, -1)` follows the isometric axes, and links between nodes that aren't on a shared axis are routed with one iso-aligned bend. Add the lesson to a module in `src/lessons/index.ts`, then run `npm run check:lessons` — it flags overlapping nodes and labels, links that cut through nodes, dangling ids and over-long text.

> Diagrams and timings are teaching examples — measure your own systems.
