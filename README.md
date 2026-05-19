# Deckhand

A lightweight, hackable presentation tool built with React + Vite. No accounts, no subscriptions, no cloud; just a local dev server, a JSON file, a hope and a dream.

## Features

- **Slide editor** — sidebar list, drag to reorder, speaker notes panel
- **Marquee slides** — rows of scrolling text, each independently configurable (text, size, weight, speed, direction, colour)
- **Image slides** — background colour, fit / fill / natural size modes
- **Collage slides** — CSS grid layout with configurable rows, columns, and background colour
- **Video slides** — YouTube and Vimeo embeds with autoplay
- **iFrame slides** — embed any URL
- **Colour picker** — background colour picker for Image & Collage slides – native OS colour wheel + hex input + up to 10 saved swatches
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

### Adding images

Images can be linked to from the web, or added to the `/public/slides` folder and linked to from there.

### Change the content

Edit slides directly in the browser. Remember to Export JSON when done, as by default the content is only saved to localStorage in the browser. Drop the `slides.json` file in the `public/` folder and you're good to go.

### Change the theme

All colours are CSS custom properties in `src/index.css`. Light and dark themes are both defined there.

## Components

The **Component** slide type is a hook for dropping custom React components into your presentation. `Marquee.jsx` ships as a working example: scrolling text rows with a live editor UI, but it's just one possibility. Anything you can build in React can become a slide: a live chart, a code playground, an animated diagram, a countdown timer.

### Adding a component manually

1. **Create your component** — add `MyComponent.jsx` to the project root. It receives a `slide` prop, so you can store any configuration you need directly on the slide object.

```jsx
// MyComponent.jsx
export default function MyComponent({ slide }) {
  return (
    <div style={{ width: "100%", height: "100%", background: "#000", color: "#fff" }}>
      {slide.message || "Hello"}
    </div>
  );
}
```

2. **Register it in the renderer** — open `src/SlideRenderer.jsx` and add a lazy import alongside the existing one, then add it to the `COMPONENTS` map:

```js
const MyComponent = lazy(() => import("../MyComponent.jsx"));
const COMPONENTS = { Marquee, MyComponent };
```

3. **Add the name to the store** — open `src/slidesStore.js` and add `"MyComponent"` to `COMPONENT_NAMES`. If your component needs default slide data, update `makeSlide` too:

```js
export const COMPONENT_NAMES = ["Marquee", "MyComponent"];

// in makeSlide:
if (type === "component") return { ...base, component: "Marquee", rows: DEFAULT_ROWS };
// → update the default component name and add any fields your component needs
```

4. **Optionally add an editor UI** — open `src/App.jsx` and find the `type === "component"` section. Add a block for your component next to the existing `MarqueeEditor`:

```jsx
{slide.component === "MyComponent" && (
  <MyComponentEditor slide={slide} onChange={onChange} />
)}
```

The editor UI is optional — your component can hardcode its content, read from `slide` fields you set manually via Export/Import JSON, or anything else.

### Adding a component with Claude Code or Codex

If you're using Claude Code or Codex, you can describe what you want and let it handle the wiring:

```
add a new component slide called Countdown that shows a large number counting down from slide.startValue. wire it up in the renderer, store, and add an editor field for startValue.
```

The codebase is intentionally small and consistent — AI tools navigate it well. The four files that need touching (`MyComponent.jsx`, `SlideRenderer.jsx`, `slidesStore.js`, `App.jsx`) follow clear patterns, so generated code tends to fit without much correction.

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

## Customizing

### Change the content

Edit slides directly in the browser. Export as `slides.json` when done, drop it in `public/`, and deploy anywhere that serves static files.

### Change the theme

All colours are CSS custom properties in `src/index.css`. Light and dark themes are both defined there.

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
