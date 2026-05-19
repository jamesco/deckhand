# Slide Deck Template

A presentation tool for building and delivering slides. Built on React + Vite, designed to be forked and customized.

## What this is

A single-page React app with a slide editor, a fullscreen presentation view, and a presenter/notes view. Slides are stored in localStorage and can be exported/imported as JSON.

## Stack

- Vite + React 18
- No component library — inline styles with CSS custom properties
- Dark mode via `prefers-color-scheme` media query
- Icons are inline SVG components (no icon library)

## Running

```
npm install
npm run dev
```

## Key files

- `src/App.jsx` — editor UI (sidebar, content pane, notes pane, all slide editors)
- `src/SlideRenderer.jsx` — renders each slide type in the presentation view
- `src/slidesStore.js` — slide data model and localStorage persistence
- `src/PresentationView.jsx` — fullscreen presentation window
- `src/PresenterView.jsx` — speaker notes + timer window
- `Marquee.jsx` — scrolling text component (the only built-in component slide)

## Slide types

| Type | Description |
|---|---|
| Image | Single image with background colour, fit/fill/natural-size options |
| Collage | CSS grid of images with configurable layout and background colour |
| YouTube | Embeds a YouTube video (autoplay, muted) |
| Vimeo | Embeds a Vimeo video |
| Component | Renders a React component — currently only Marquee |
| iFrame | Embeds any URL in a sandboxed iframe |

## The Marquee component

The Marquee slide renders rows of scrolling text. Each row is independently configurable:

```json
{
  "words": ["Your Text", "More Words", "Keep Going"],
  "size": 80,
  "weight": 800,
  "duration": 14,
  "dir": -1,
  "color": "#E31E67"
}
```

- `words` — array of strings that scroll across the screen (repeated automatically)
- `size` — font size in px
- `weight` — font weight (400 / 500 / 600 / 700 / 800)
- `duration` — scroll cycle in seconds (lower = faster)
- `dir` — direction: `-1` scrolls left, `1` scrolls right
- `color` — any CSS color string including `rgba(...)`

Edit rows live in the editor panel — no code changes needed.

## Adding a new component slide

1. Create `MyComponent.jsx` in the project root — it receives a `slide` prop
2. Add a lazy import in `src/SlideRenderer.jsx` and register it in `COMPONENTS`
3. Add `"MyComponent"` to `COMPONENT_NAMES` in `src/slidesStore.js`
4. Optionally add a custom editor UI in `src/App.jsx` under the `type === "component"` section

## Colour picker

All colour fields use a shared picker: click the swatch to open the OS colour wheel, or type a hex code directly. Hit **Save** to store the colour (up to 10 saved, shared across all slides).

## Deploying slides

Export your slides as `slides.json` (Export JSON button in the sidebar), place the file in `public/`, and deploy. On first load with empty localStorage the app fetches from `/slides.json` automatically.

## Common tasks

- **Change the theme** — edit CSS custom properties in `src/index.css`
- **Add a new slide type** — define it in `slidesStore.js` (`TYPE_META`, `makeSlide`), handle it in `SlideRenderer.jsx`, add editor UI in `App.jsx`
- **Rename the app** — change the title in `index.html` and the sidebar header in `src/App.jsx`
