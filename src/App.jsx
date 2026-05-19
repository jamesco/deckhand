import { useState, useEffect, useRef, useCallback } from "react";
import {
  loadSlides, saveSlides, makeSlide, fetchDeployedSlides, exportSlidesJSON, importSlidesFromFile,
  SLIDE_TYPES, TYPE_META, COMPONENT_NAMES, colsForCount,
} from "./slidesStore.js";
import SlideRenderer from "./SlideRenderer.jsx";

function parseYouTubeInput(raw) {
  const str = raw.trim();
  try {
    const url = new URL(str);
    let videoId = null;
    if (url.hostname === "youtu.be") videoId = url.pathname.slice(1);
    else if (url.hostname.includes("youtube.com")) videoId = url.searchParams.get("v");
    if (videoId) {
      const t = url.searchParams.get("t") || "";
      return { videoId, startTime: parseYouTubeTime(t) };
    }
  } catch {}
  return { videoId: str, startTime: 0 };
}

function parseYouTubeTime(t) {
  if (!t) return 0;
  if (/^\d+$/.test(t)) return parseInt(t, 10);
  let s = 0;
  const h = t.match(/(\d+)h/); if (h) s += parseInt(h[1]) * 3600;
  const m = t.match(/(\d+)m/); if (m) s += parseInt(m[1]) * 60;
  const sec = t.match(/(\d+)s/); if (sec) s += parseInt(sec[1]);
  return s;
}

function fmtTime(s) {
  if (!s) return "";
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

// ── saved colour helpers ──────────────────────────────────────────────────────
const SAVED_COLORS_KEY = "saved-colors";
const MAX_SAVED_COLORS = 10;
function loadSavedColors() {
  try { return JSON.parse(localStorage.getItem(SAVED_COLORS_KEY)) || []; } catch { return []; }
}
function persistSavedColors(colors) {
  localStorage.setItem(SAVED_COLORS_KEY, JSON.stringify(colors));
}

// ── tiny icon helper ──────────────────────────────────────────────────────────
const Icon = ({ d, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}>
    <path d={d} />
  </svg>
);

// ── colour picker ─────────────────────────────────────────────────────────────
function ColorPicker({ value, onChange, label = "Background" }) {
  const [hex, setHex] = useState(value || "#000000");
  const [saved, setSaved] = useState(loadSavedColors);
  const nativeRef = useRef(null);

  useEffect(() => { setHex(value || "#000000"); }, [value]);

  function commitHex(h) {
    const clean = h.startsWith("#") ? h : "#" + h;
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) onChange(clean);
  }

  function handleHexChange(e) {
    const v = e.target.value;
    setHex(v);
    const clean = v.startsWith("#") ? v : "#" + v;
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) onChange(clean);
  }

  function saveColor() {
    const color = (value || "#000000").toLowerCase();
    const next = [color, ...saved.filter(c => c !== color)].slice(0, MAX_SAVED_COLORS);
    setSaved(next);
    persistSavedColors(next);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {label && <label style={{ ...labelStyle, marginBottom: 0 }}>{label}</label>}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div
            onClick={() => nativeRef.current?.click()}
            style={{ width: 28, height: 28, borderRadius: 6, background: value || "#000000", cursor: "pointer", border: "0.5px solid var(--color-border-secondary)" }}
          />
          <input
            ref={nativeRef} type="color" value={value || "#000000"}
            onChange={e => { onChange(e.target.value); setHex(e.target.value); }}
            style={{ position: "absolute", opacity: 0, pointerEvents: "none", inset: 0, width: "100%", height: "100%" }}
          />
        </div>
        <input
          value={hex} onChange={handleHexChange}
          onBlur={e => commitHex(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") commitHex(hex); }}
          placeholder="#000000" spellCheck={false}
          style={{ ...inputStyle, width: 90, fontFamily: "var(--font-mono)", fontSize: 12, padding: "5px 8px" }}
        />
        <button onClick={saveColor} style={{ ...ghostBtn, fontSize: 11, padding: "3px 8px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 5, color: "var(--color-text-tertiary)" }}>
          Save
        </button>
      </div>
      {saved.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, paddingLeft: 36 }}>
          {saved.map((c, i) => (
            <button key={i} onClick={() => { onChange(c); setHex(c); }} title={c} style={{
              width: 22, height: 22, borderRadius: 5, background: c, border: "none", cursor: "pointer", flexShrink: 0,
              outline: (value || "#000000").toLowerCase() === c ? "2px solid var(--color-text-primary)" : "2px solid transparent",
              outlineOffset: 2,
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── number input ──────────────────────────────────────────────────────────────
function NumInput({ value, min = 1, max = 12, onChange, width = 44 }) {
  return (
    <input
      type="number" value={value} min={min} max={max}
      onChange={e => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || min)))}
      style={{ ...inputStyle, width, padding: "5px 7px", fontSize: 13, textAlign: "center", MozAppearance: "textfield" }}
    />
  );
}

// ── collage grid editor ───────────────────────────────────────────────────────
function CollageEditor({ slide, onChange }) {
  const cols = slide.cols || 3;
  const rows = slide.rows || 2;
  const images = normalizeCollageImages(slide.images || []);

  function setGrid(field, val) { onChange({ ...slide, [field]: val }); }

  function setImage(i, field, val) {
    const next = images.map((img, idx) => idx === i ? { ...img, [field]: val } : img);
    onChange({ ...slide, images: next });
  }

  function addImage() {
    onChange({ ...slide, images: [...images, { src: "", col: 1, row: 1, colSpan: 1, rowSpan: 1, fit: false }] });
  }

  function removeImage(i) {
    onChange({ ...slide, images: images.filter((_, idx) => idx !== i) });
  }

  const PREVIEW_CELL = 40;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, overflow: "auto" }}>
      {/* Background colour */}
      <ColorPicker value={slide.bgColor || "#000000"} onChange={c => onChange({ ...slide, bgColor: c })} />

      {/* Grid dimensions */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <label style={{ ...labelStyle, marginBottom: 0 }}>Grid</label>
        <NumInput value={cols} max={12} onChange={v => setGrid("cols", v)} />
        <span style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>cols ×</span>
        <NumInput value={rows} max={12} onChange={v => setGrid("rows", v)} />
        <span style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>rows</span>
      </div>

      {/* Per-image editors */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={labelStyle}>Images</label>
        {images.map((img, i) => (
          <div key={i} style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "10px 12px", border: "0.5px solid var(--color-border-tertiary)" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
              <input
                value={img.src}
                onChange={e => setImage(i, "src", e.target.value)}
                placeholder="/slides/photo.jpg or https://…"
                style={{ ...inputStyle, flex: 1, fontFamily: "var(--font-mono)", fontSize: 11, padding: "5px 8px" }}
              />
              <button onClick={() => removeImage(i)} style={{ ...ghostBtn, opacity: 0.5, padding: 3 }}>
                <Icon d="M18 6 6 18M6 6l12 12" size={11} />
              </button>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 12, color: "var(--color-text-secondary)", flexWrap: "wrap" }}>
              <span>Col</span>
              <NumInput value={img.col} max={cols} onChange={v => setImage(i, "col", v)} />
              <span>span</span>
              <NumInput value={img.colSpan} max={cols - img.col + 1} onChange={v => setImage(i, "colSpan", v)} />
              <span style={{ marginLeft: 8 }}>Row</span>
              <NumInput value={img.row} max={rows} onChange={v => setImage(i, "row", v)} />
              <span>span</span>
              <NumInput value={img.rowSpan} max={rows - img.row + 1} onChange={v => setImage(i, "rowSpan", v)} />
              <div style={{ marginLeft: "auto", display: "flex", borderRadius: 6, overflow: "hidden", border: "0.5px solid var(--color-border-secondary)" }}>
                {["Fill", "Fit"].map(mode => (
                  <button key={mode} onClick={() => setImage(i, "fit", mode === "Fit")}
                    style={{ padding: "3px 10px", fontSize: 11, fontWeight: 500, border: "none", cursor: "pointer", fontFamily: "inherit",
                      background: (mode === "Fit") === !!img.fit ? "var(--color-background-primary)" : "transparent",
                      color: (mode === "Fit") === !!img.fit ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
                    }}>
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
        <button onClick={addImage} style={{ ...ghostBtn, alignSelf: "flex-start", padding: "5px 10px", fontSize: 12, border: "0.5px solid var(--color-border-tertiary)", borderRadius: 6 }}>
          + Add image
        </button>
      </div>

      {/* Grid layout preview */}
      {images.length > 0 && (
        <div>
          <label style={labelStyle}>Layout preview</label>
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, ${PREVIEW_CELL}px)`,
            gridTemplateRows: `repeat(${rows}, ${PREVIEW_CELL}px)`,
            gap: 2,
            width: "fit-content",
            borderRadius: 6,
            overflow: "hidden",
            border: "1px solid var(--color-border-tertiary)",
          }}>
            {Array.from({ length: cols * rows }, (_, i) => (
              <div key={i} style={{ background: "var(--color-background-secondary)", width: PREVIEW_CELL, height: PREVIEW_CELL }} />
            ))}
            {images.map((img, i) => (
              <div key={`img-${i}`} style={{
                gridColumn: `${img.col} / span ${img.colSpan}`,
                gridRow: `${img.row} / span ${img.rowSpan}`,
                gridRowStart: img.row,
                gridColumnStart: img.col,
                overflow: "hidden",
                position: "relative",
              }}>
                {img.src
                  ? <img src={img.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  : <div style={{ width: "100%", height: "100%", background: `hsl(${i * 60}, 40%, 25%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "rgba(255,255,255,0.5)" }}>{i + 1}</div>
                }
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 6 }}>
            {cols} × {rows} grid · {images.length} image{images.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
}

function normalizeCollageImages(images) {
  if (!images.length) return [];
  if (typeof images[0] === "string") {
    return images.map((src, i) => ({ src, col: i + 1, row: 1, colSpan: 1, rowSpan: 1 }));
  }
  return images;
}

// ── marquee row editor ────────────────────────────────────────────────────────
function MarqueeEditor({ slide, onChange }) {
  const rows = slide.rows || [];

  function setRow(i, field, val) {
    const next = rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r);
    onChange({ ...slide, rows: next });
  }

  function addRow() {
    onChange({ ...slide, rows: [...rows, { words: ["Text here"], size: 48, weight: 700, duration: 16, dir: -1, color: "#ffffff" }] });
  }

  function removeRow(i) {
    onChange({ ...slide, rows: rows.filter((_, idx) => idx !== i) });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <label style={labelStyle}>Rows</label>
      {rows.map((row, i) => (
        <div key={i} style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "12px 14px", border: "0.5px solid var(--color-border-tertiary)", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-tertiary)", letterSpacing: "0.04em", textTransform: "uppercase" }}>Row {i + 1}</span>
            <button onClick={() => removeRow(i)} style={{ ...ghostBtn, opacity: 0.5, padding: 3 }}>
              <Icon d="M18 6 6 18M6 6l12 12" size={11} />
            </button>
          </div>
          <Field label="Words (comma-separated)">
            <input
              value={row.words.join(", ")}
              onChange={e => setRow(i, "words", e.target.value.split(",").map(w => w.trim()).filter(Boolean))}
              placeholder="Word One, Word Two, Word Three"
              style={{ ...inputStyle, fontSize: 12 }}
            />
          </Field>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            <Field label="Size">
              <NumInput value={row.size} min={12} max={200} onChange={v => setRow(i, "size", v)} width={58} />
            </Field>
            <Field label="Weight">
              <select value={row.weight} onChange={e => setRow(i, "weight", Number(e.target.value))} style={{ ...inputStyle, width: 80, padding: "5px 8px" }}>
                {[400, 500, 600, 700, 800].map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </Field>
            <Field label="Speed (s)">
              <NumInput value={row.duration} min={2} max={120} onChange={v => setRow(i, "duration", v)} width={58} />
            </Field>
            <Field label="Direction">
              <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", border: "0.5px solid var(--color-border-secondary)" }}>
                {[["←", -1], ["→", 1]].map(([lbl, dir]) => (
                  <button key={dir} onClick={() => setRow(i, "dir", dir)}
                    style={{ padding: "5px 14px", fontSize: 13, border: "none", cursor: "pointer", fontFamily: "inherit",
                      background: row.dir === dir ? "var(--color-background-primary)" : "transparent",
                      color: row.dir === dir ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
                    }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </Field>
          </div>
          <ColorPicker value={row.color} onChange={c => setRow(i, "color", c)} label="Colour" />
        </div>
      ))}
      <button onClick={addRow} style={{ ...ghostBtn, alignSelf: "flex-start", padding: "5px 10px", fontSize: 12, border: "0.5px solid var(--color-border-tertiary)", borderRadius: 6 }}>
        + Add row
      </button>
    </div>
  );
}

// ── content pane ──────────────────────────────────────────────────────────────
function ContentPane({ slide, onChange }) {
  if (!slide) return <div style={emptyMsg}>Select or create a slide</div>;

  function set(field, val) { onChange({ ...slide, [field]: val }); }

  const { type } = slide;

  return (
    <div style={{ flex: 1, padding: "20px 24px", overflow: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
      {type === "image" && (
        <>
          <Field label="Image URL or path">
            <input value={slide.src || ""} onChange={(e) => set("src", e.target.value)}
              placeholder="https://… or /slides/my-image.jpg"
              style={{ ...inputStyle, fontFamily: "var(--font-mono)", fontSize: 12 }} />
          </Field>
          <ColorPicker value={slide.bgColor || "#000000"} onChange={c => set("bgColor", c)} />
          <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", border: "0.5px solid var(--color-border-secondary)", alignSelf: "flex-start" }}>
            {["Fill", "Fit"].map(mode => (
              <button key={mode} onClick={() => set("fit", mode === "Fit")}
                style={{ padding: "4px 14px", fontSize: 12, fontWeight: 500, border: "none", cursor: "pointer", fontFamily: "inherit",
                  background: (mode === "Fit") === (slide.fit !== false) ? "var(--color-background-secondary)" : "transparent",
                  color: (mode === "Fit") === (slide.fit !== false) ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
                }}>
                {mode}
              </button>
            ))}
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer", userSelect: "none" }}>
            <input type="checkbox" checked={!!slide.naturalSize} onChange={e => set("naturalSize", e.target.checked)} />
            Natural size (don't upscale)
          </label>
          {slide.src && (
            <div style={{ borderRadius: 8, overflow: "hidden", background: "#000", height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src={slide.src} alt="" style={slide.naturalSize
                ? { maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto" }
                : { width: "100%", height: "100%", objectFit: slide.fit === false ? "cover" : "contain" }}
                onError={(e) => { e.currentTarget.style.display = "none"; }} />
            </div>
          )}
        </>
      )}

      {type === "collage" && (
        <CollageEditor slide={slide} onChange={onChange} />
      )}

      {(type === "vimeo" || type === "youtube") && (
        <>
          {type === "youtube" && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer", userSelect: "none" }}>
              <input type="checkbox" checked={!!slide.grayscale} onChange={e => set("grayscale", e.target.checked)} />
              Black & white
            </label>
          )}
          <Field label={type === "vimeo" ? "Vimeo video ID" : "YouTube URL or video ID"}>
            <input
              value={slide.videoId || ""}
              onChange={(e) => {
                if (type === "youtube") {
                  const { videoId, startTime } = parseYouTubeInput(e.target.value);
                  onChange({ ...slide, videoId, startTime });
                } else {
                  set("videoId", e.target.value);
                }
              }}
              placeholder={type === "vimeo" ? "123456789" : "https://youtu.be/abc123?t=45  or  dQw4w9WgXcQ"}
              style={{ ...inputStyle, fontFamily: "var(--font-mono)", fontSize: 12 }}
            />
            {type === "youtube" && slide.startTime > 0 && (
              <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 4 }}>
                Starts at {fmtTime(slide.startTime)} ({slide.startTime}s)
              </div>
            )}
          </Field>
          {slide.videoId && (
            <div style={{ borderRadius: 8, overflow: "hidden", background: "#000", aspectRatio: "16/9" }}>
              <iframe
                src={type === "vimeo"
                  ? `https://player.vimeo.com/video/${slide.videoId}?muted=1`
                  : `https://www.youtube.com/embed/${slide.videoId}?mute=1&rel=0${slide.startTime > 0 ? `&start=${slide.startTime}` : ""}`}
                style={{ width: "100%", height: "100%", border: "none" }}
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            </div>
          )}
        </>
      )}

      {type === "component" && (
        <>
          <Field label="Component">
            <select value={slide.component || "Marquee"} onChange={(e) => set("component", e.target.value)} style={inputStyle}>
              {COMPONENT_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
          {slide.component === "Marquee" && (
            <MarqueeEditor slide={slide} onChange={onChange} />
          )}
        </>
      )}

      {type === "iframe" && (
        <>
          <Field label="URL">
            <input value={slide.url || ""} onChange={(e) => set("url", e.target.value)}
              placeholder="https://example.com/"
              style={{ ...inputStyle, fontFamily: "var(--font-mono)", fontSize: 12 }} />
          </Field>
          {slide.url && (
            <div style={{ borderRadius: 8, overflow: "hidden", background: "#000", height: 300, border: "1px solid var(--color-border-tertiary)" }}>
              <iframe src={slide.url} style={{ width: "100%", height: "100%", border: "none" }}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                allow="clipboard-read; clipboard-write" />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── notes pane ────────────────────────────────────────────────────────────────
function NotesPane({ slide, onChange }) {
  if (!slide) return null;
  return (
    <div style={{
      width: 300, minWidth: 260, borderLeft: "0.5px solid var(--color-border-tertiary)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <div style={{ padding: "16px 20px 8px", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", color: "var(--color-text-tertiary)", textTransform: "uppercase" }}>
        Speaker notes
      </div>
      <textarea
        value={slide.notes || ""}
        onChange={(e) => onChange({ ...slide, notes: e.target.value })}
        placeholder={"What you'll say on this slide…\n\nThis is your full script."}
        style={{
          flex: 1, width: "100%", boxSizing: "border-box",
          resize: "none", border: "none", outline: "none",
          background: "transparent", color: "var(--color-text-primary)",
          fontFamily: "var(--font-sans)", fontSize: 13,
          lineHeight: 1.7, padding: "8px 20px 20px",
        }}
      />
    </div>
  );
}

// ── new-slide type picker modal ───────────────────────────────────────────────
function TypePicker({ onPick, onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: 14, padding: 28, width: 420, maxWidth: "90vw",
      }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>New slide — choose type</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {SLIDE_TYPES.map(type => {
            const meta = TYPE_META[type];
            return (
              <button key={type} onClick={() => onPick(type)} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                padding: "16px 12px", borderRadius: 10,
                background: "var(--color-background-secondary)",
                border: "0.5px solid var(--color-border-tertiary)",
                color: "var(--color-text-primary)", cursor: "pointer",
                transition: "all 0.12s",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, background: meta.color + "22",
                  color: meta.color, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
                }}>
                  {meta.short}
                </div>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── sidebar slide item ────────────────────────────────────────────────────────
function SlideItem({ slide, index, isActive, onClick, onDelete, onDragStart, onDragOver, onDrop, onDragEnd, dropAbove }) {
  const meta = TYPE_META[slide.type] || {};
  const label = slideLabel(slide);
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 10px", borderRadius: 8, cursor: "grab", userSelect: "none",
        background: isActive ? "var(--color-background-secondary)" : "transparent",
        border: `0.5px solid ${isActive ? "var(--color-border-secondary)" : "transparent"}`,
        marginBottom: 2, position: "relative",
        borderTop: dropAbove ? "2px solid #60a5fa" : "2px solid transparent",
      }}>
      <div style={{ color: "var(--color-text-tertiary)", opacity: 0.4, fontSize: 10, lineHeight: 1, cursor: "grab", flexShrink: 0 }}>⠿</div>
      <div style={{
        width: 28, height: 28, minWidth: 28, borderRadius: 6,
        background: (meta.color || "#888") + "22", color: meta.color || "#888",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, fontWeight: 700, letterSpacing: "0.03em",
      }}>
        {meta.short}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {index + 1}. {label}
        </div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
        style={{ ...ghostBtn, opacity: 0.4, padding: 3 }} title="Delete slide">
        <Icon d="M18 6 6 18M6 6l12 12" size={11} />
      </button>
    </div>
  );
}

function slideLabel(slide) {
  if (slide.type === "image") return slide.src ? urlFilename(slide.src) : "Image slide";
  if (slide.type === "collage") return `${(slide.images || []).filter(Boolean).length} images`;
  if (slide.type === "vimeo") return slide.videoId ? `Vimeo ${slide.videoId}` : "Vimeo slide";
  if (slide.type === "youtube") return slide.videoId ? `YT ${slide.videoId}` : "YouTube slide";
  if (slide.type === "component") return slide.component || "Component";
  if (slide.type === "iframe") return slide.url ? urlDomain(slide.url) : "iFrame slide";
  return slide.type;
}

function urlFilename(url) {
  try { return url.split("/").pop().split("?")[0] || url; } catch { return url; }
}

function urlDomain(url) {
  try { return new URL(url).hostname; } catch { return url; }
}

// ── main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [slides, setSlides] = useState(loadSlides);
  const [activeId, setActiveId] = useState(slides[0]?.id ?? null);
  const [picking, setPicking] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [hoverIndex, setHoverIndex] = useState(null);
  const presWindowRef = useRef(null);
  const channelRef = useRef(null);

  const activeIndex = slides.findIndex(s => s.id === activeId);
  const activeSlide = slides[activeIndex] ?? null;

  useEffect(() => {
    if (slides.length > 0) return;
    fetchDeployedSlides().then(deployed => {
      if (deployed.length) {
        setSlides(deployed);
        saveSlides(deployed);
        setActiveId(deployed[0].id);
      }
    });
  }, []);

  useEffect(() => { saveSlides(slides); }, [slides]);

  useEffect(() => {
    const ch = new BroadcastChannel("slide-deck-present");
    channelRef.current = ch;
    ch.onmessage = (e) => {
      if (e.data.type === "ready") {
        ch.postMessage({ type: "slides", slides });
        if (activeIndex >= 0) ch.postMessage({ type: "goto", index: activeIndex });
      }
    };
    return () => ch.close();
  }, [slides, activeIndex]);

  function broadcast(newSlides, idx) {
    channelRef.current?.postMessage({ type: "slides", slides: newSlides });
    channelRef.current?.postMessage({ type: "goto", index: idx });
  }

  function openPresentation() {
    if (presWindowRef.current && !presWindowRef.current.closed) {
      presWindowRef.current.focus();
    } else {
      presWindowRef.current = window.open(
        window.location.origin + window.location.pathname + "?present",
        "slide-deck-present",
        "width=1280,height=800"
      );
    }
    broadcast(slides, Math.max(0, activeIndex));
    openPresenter();
  }

  function openPresenter() {
    window.open(
      window.location.origin + window.location.pathname + "?presenter",
      "slide-deck-presenter",
      "width=1000,height=660"
    );
  }

  function addSlide(type) {
    const s = makeSlide(type);
    const newSlides = [...slides, s];
    setSlides(newSlides);
    setActiveId(s.id);
    setPicking(false);
    broadcast(newSlides, newSlides.length - 1);
  }

  function updateSlide(updated) {
    const newSlides = slides.map(s => s.id === updated.id ? updated : s);
    setSlides(newSlides);
    broadcast(newSlides, activeIndex);
  }

  function deleteSlide(id) {
    const idx = slides.findIndex(s => s.id === id);
    const newSlides = slides.filter(s => s.id !== id);
    setSlides(newSlides);
    if (activeId === id) {
      const next = newSlides[idx] || newSlides[idx - 1] || null;
      setActiveId(next?.id ?? null);
    }
    broadcast(newSlides, Math.max(0, idx - 1));
  }

  function selectSlide(id) {
    setActiveId(id);
    const idx = slides.findIndex(s => s.id === id);
    broadcast(slides, idx);
  }

  function reorderSlides(from, to) {
    if (from === to || from == null || to == null) return;
    const next = [...slides];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setSlides(next);
    const newActiveIndex = next.findIndex(s => s.id === activeId);
    broadcast(next, newActiveIndex);
  }

  useEffect(() => {
    function handleKey(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      if (e.key === "ArrowDown" && activeIndex < slides.length - 1) {
        e.preventDefault();
        selectSlide(slides[activeIndex + 1].id);
      } else if (e.key === "ArrowUp" && activeIndex > 0) {
        e.preventDefault();
        selectSlide(slides[activeIndex - 1].id);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeIndex, slides]);

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--color-background-tertiary)", color: "var(--color-text-primary)", overflow: "hidden" }}>
      {/* Sidebar */}
      <div style={{
        width: 220, minWidth: 220,
        background: "var(--color-background-primary)",
        borderRight: "0.5px solid var(--color-border-tertiary)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{ padding: "18px 16px 12px" }}>
          <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}>Slide Deck</div>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 2 }}>
            {slides.length} slide{slides.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
          {slides.length === 0 && (
            <div style={{ padding: "24px 8px", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 12, lineHeight: 1.6 }}>
              No slides yet.<br />Click below to add one.
            </div>
          )}
          {slides.map((slide, i) => (
            <SlideItem
              key={slide.id}
              slide={slide}
              index={i}
              isActive={slide.id === activeId}
              onClick={() => selectSlide(slide.id)}
              onDelete={() => deleteSlide(slide.id)}
              dropAbove={hoverIndex === i && dragIndex !== i && dragIndex !== i - 1}
              onDragStart={() => setDragIndex(i)}
              onDragOver={() => setHoverIndex(i)}
              onDrop={() => reorderSlides(dragIndex, hoverIndex)}
              onDragEnd={() => { setDragIndex(null); setHoverIndex(null); }}
            />
          ))}
        </div>

        <div style={{ padding: "10px 8px 12px", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", flexDirection: "column", gap: 5 }}>
          <button onClick={() => setPicking(true)} style={{
            ...ghostBtn, width: "100%", padding: "8px 12px", fontSize: 13, fontWeight: 500,
            background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: 8, color: "var(--color-text-primary)",
          }}>
            + New slide
          </button>
          <div style={{ display: "flex", gap: 5 }}>
            <button onClick={openPresentation} title="Then press F for fullscreen" style={{
              ...ghostBtn, flex: 1, padding: "7px 8px", fontSize: 12,
              background: "#1a3320", border: "0.5px solid #2d5c3a", color: "#4ade80", borderRadius: 8,
            }}>
              Present
            </button>
            <button onClick={openPresenter} style={{
              ...ghostBtn, flex: 1, padding: "7px 8px", fontSize: 12,
              background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)",
              color: "var(--color-text-secondary)", borderRadius: 8,
            }}>
              Presenter
            </button>
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            <button onClick={() => exportSlidesJSON(slides)} style={{
              ...ghostBtn, flex: 1, padding: "6px 8px", fontSize: 11,
              border: "0.5px solid var(--color-border-tertiary)",
              color: "var(--color-text-tertiary)", borderRadius: 8,
            }}>
              Export JSON
            </button>
            <button onClick={() => importSlidesFromFile((imported) => {
              saveSlides(imported);
              setSlides(imported);
              setActiveId(imported[0]?.id ?? null);
            })} style={{
              ...ghostBtn, flex: 1, padding: "6px 8px", fontSize: 11,
              border: "0.5px solid var(--color-border-tertiary)",
              color: "var(--color-text-tertiary)", borderRadius: 8,
            }}>
              Import JSON
            </button>
          </div>
        </div>
      </div>

      {/* Main editor area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {activeSlide && (
          <div style={{
            height: 44, minHeight: 44, display: "flex", alignItems: "center",
            padding: "0 20px", gap: 10,
            borderBottom: "0.5px solid var(--color-border-tertiary)",
            background: "var(--color-background-primary)",
          }}>
            {(() => {
              const meta = TYPE_META[activeSlide.type] || {};
              return (
                <>
                  <div style={{
                    padding: "3px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
                    background: (meta.color || "#888") + "22", color: meta.color || "#888",
                  }}>
                    {meta.label}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>
                    Slide {activeIndex + 1} of {slides.length}
                  </div>
                </>
              );
            })()}
            <div style={{ flex: 1 }} />
            <button onClick={() => activeIndex > 0 && selectSlide(slides[activeIndex - 1].id)}
              disabled={activeIndex <= 0} style={{ ...ghostBtn, opacity: activeIndex <= 0 ? 0.3 : 1 }}>
              <Icon d="M15 18l-6-6 6-6" size={13} />
            </button>
            <button onClick={() => activeIndex < slides.length - 1 && selectSlide(slides[activeIndex + 1].id)}
              disabled={activeIndex >= slides.length - 1} style={{ ...ghostBtn, opacity: activeIndex >= slides.length - 1 ? 0.3 : 1 }}>
              <Icon d="M9 6l6 6-6 6" size={13} />
            </button>
          </div>
        )}

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <ContentPane slide={activeSlide} onChange={updateSlide} />
          <NotesPane slide={activeSlide} onChange={updateSlide} />
        </div>

        {!activeSlide && (
          <div style={{
            position: "absolute", inset: 0, left: 220, display: "flex",
            alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16,
            color: "var(--color-text-tertiary)",
          }}>
            <div style={{ fontSize: 40, opacity: 0.15 }}>▤</div>
            <div style={{ fontSize: 15, color: "var(--color-text-secondary)" }}>No slides yet</div>
            <button onClick={() => setPicking(true)} style={{
              padding: "9px 20px", fontSize: 14, fontWeight: 500,
              background: "var(--color-background-primary)", color: "var(--color-text-primary)",
              border: "0.5px solid var(--color-border-secondary)", borderRadius: 8,
            }}>
              + New slide
            </button>
          </div>
        )}
      </div>

      {picking && <TypePicker onPick={addSlide} onClose={() => setPicking(false)} />}
    </div>
  );
}

// ── shared style primitives ───────────────────────────────────────────────────
const labelStyle = {
  display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
  color: "var(--color-text-tertiary)", textTransform: "uppercase", marginBottom: 6,
};

const inputStyle = {
  width: "100%", boxSizing: "border-box",
  padding: "8px 12px", fontSize: 14,
  background: "var(--color-background-secondary)",
  border: "0.5px solid var(--color-border-secondary)",
  borderRadius: 7, color: "var(--color-text-primary)", outline: "none",
  fontFamily: "var(--font-sans)",
};

const ghostBtn = {
  background: "none", border: "none", padding: "4px 6px",
  color: "var(--color-text-secondary)", cursor: "pointer",
  borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: "inherit",
};

const emptyMsg = {
  flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
  color: "var(--color-text-tertiary)", fontSize: 14,
};

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}
