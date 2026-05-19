# Deckhand

A lightweight, hackable presentation tool built with React + Vite. No accounts, no subscriptions, no cloud — just a local dev server and a JSON file.

## Features

- **Slide editor** — sidebar list, drag to reorder, speaker notes panel
- **Marquee slides** — rows of scrolling text, each independently configurable (text, size, weight, speed, direction, colour)
- **Image slides** — background colour, fit / fill / natural size modes
- **Collage slides** — CSS grid layout with configurable rows, columns, and background colour
- **Video slides** — YouTube and Vimeo embeds with autoplay
- **iFrame slides** — embed any URL
- **Colour picker** — native OS colour wheel + hex input + up to 10 saved swatches, shared across all slides
- **Presenter view** — separate window with speaker notes, slide timer, and next-slide preview
- **Export / Import** — slides saved as plain JSON; deploy by dropping `slides.json` in `public/`

## Getting started

```bash
git clone https://github.com/jamesco/deckhand.git
cd deckhand
npm install
npm run dev
```

Open the editor, add slides, hit **Present** when ready. Press `F` in the presentation window to go fullscreen.

## Customizing

### Change the content

Edit slides directly in the browser. Export as `slides.json` when done, drop it in `public/`, and deploy anywhere that serves static files.

### Add a new component slide

1. Create `MyComponent.jsx` in the project root — it receives a `slide` prop
2. Lazy-import it in `src/SlideRenderer.jsx` and add it to `COMPONENTS`
3. Add `"MyComponent"` to `COMPONENT_NAMES` in `src/slidesStore.js`
4. Optionally add a custom editor UI in `src/App.jsx` under the `type === "component"` block

### Change the theme

All colours are CSS custom properties in `src/index.css`. Light and dark themes are both defined there.

## Marquee rows

Each row in a Marquee slide is an object:

```json
{
  "words": ["Your Text", "More Words"],
  "size": 80,
  "weight": 800,
  "duration": 14,
  "dir": -1,
  "color": "#E31E67"
}
```

| Field | Description |
|---|---|
| `words` | Array of strings — repeated automatically to fill the screen |
| `size` | Font size in px |
| `weight` | Font weight: 400 / 500 / 600 / 700 / 800 |
| `duration` | Scroll cycle in seconds — lower is faster |
| `dir` | `-1` scrolls left, `1` scrolls right |
| `color` | Any CSS color string |

Edit rows live in the editor — no code changes needed.

## Keyboard shortcuts

| Key | Action |
|---|---|
| `↑` / `↓` | Navigate slides in the editor |
| `→` / `↓` / `Space` | Next slide (presentation window) |
| `←` / `↑` | Previous slide (presentation window) |
| `F` | Toggle fullscreen |
| `Escape` | Close presentation window |

## License

MIT — do whatever you want with it. If you build something cool, I'd love to hear about it.
