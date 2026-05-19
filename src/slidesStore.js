import { DEFAULT_ROWS } from "../Marquee.jsx";

export const SLIDE_TYPES = ["image", "collage", "vimeo", "youtube", "component", "iframe"];
export const COMPONENT_NAMES = ["Marquee"];

const KEY = "slide-deck-slides";

export const TYPE_META = {
  image:     { label: "Image",     color: "#6366f1", short: "IMG" },
  collage:   { label: "Collage",   color: "#8b5cf6", short: "COL" },
  vimeo:     { label: "Vimeo",     color: "#06b6d4", short: "VIM" },
  youtube:   { label: "YouTube",   color: "#ef4444", short: "YT"  },
  component: { label: "Component", color: "#f59e0b", short: "CMP" },
  iframe:    { label: "iFrame",    color: "#10b981", short: "IFR" },
};

export function loadSlides() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {}
  return [];
}

export function saveSlides(slides) {
  try { localStorage.setItem(KEY, JSON.stringify(slides)); } catch {}
}

export async function fetchDeployedSlides() {
  try {
    const res = await fetch("/slides.json", { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) && data.length ? data : [];
  } catch {
    return [];
  }
}

export function exportSlidesJSON(slides) {
  const blob = new Blob([JSON.stringify(slides, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "slides.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function importSlidesFromFile(onLoaded) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (Array.isArray(parsed)) onLoaded(parsed);
      } catch {
        alert("Couldn't parse that JSON file.");
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

export function makeSlide(type) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const base = { id, type, notes: "" };
  if (type === "image")     return { ...base, src: "" };
  if (type === "collage")   return { ...base, bgColor: "#000000", cols: 3, rows: 2, images: [
    { src: "", col: 1, row: 1, colSpan: 1, rowSpan: 1, fit: false },
  ] };
  if (type === "vimeo")     return { ...base, videoId: "" };
  if (type === "youtube")   return { ...base, videoId: "" };
  if (type === "component") return { ...base, component: "Marquee", rows: DEFAULT_ROWS };
  if (type === "iframe")    return { ...base, url: "" };
  return base;
}

export function colsForCount(n) {
  if (n <= 1) return 1;
  if (n <= 3) return n;
  if (n <= 4) return 2;
  if (n <= 9) return 3;
  return 4;
}
