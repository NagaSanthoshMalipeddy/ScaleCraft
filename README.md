# Scalecraft

System design, animated. Each lesson starts with a real problem and adds one idea per step, while an isometric diagram shows traffic flowing, servers heating up and metrics changing.

- **11 lessons · 6 modules · 81 animated steps** — request lifecycle, latency & throughput, load balancing, caching, CDNs, replication, sharding, message queues, rate limiting, timeouts & retries, and a URL-shortener capstone.
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

Grid positions are `[col, row]`; moving `(+1, +1)` or `(+1, -1)` follows the isometric axes, and links between nodes that aren't on a shared axis are routed with one iso-aligned bend. Add the lesson to a module in `src/lessons/index.ts`.

> Diagrams and timings are teaching examples — measure your own systems.
