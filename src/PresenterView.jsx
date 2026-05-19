import { useState, useEffect, useRef } from "react";
import { loadSlides, TYPE_META } from "./slidesStore.js";

function fmt(s) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function SlideThumb({ slide, dim = 180 }) {
  if (!slide) return null;
  const meta = TYPE_META[slide.type] || {};
  const style = { width: dim, height: Math.round(dim * 9 / 16), background: "#0d0d0d", borderRadius: 6, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", border: "1px solid #2a2a2a" };

  if (slide.type === "image" && slide.src) {
    return <div style={style}><img src={slide.src} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} /></div>;
  }
  if (slide.type === "collage") {
    const imgs = (slide.images || []).filter(img => img.src).slice(0, 4);
    const cols = imgs.length <= 1 ? 1 : 2;
    return (
      <div style={style}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 1, width: "100%", height: "100%" }}>
          {imgs.map((img, i) => <img key={i} src={img.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />)}
        </div>
      </div>
    );
  }
  return (
    <div style={style}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: meta.color || "#666", letterSpacing: "0.04em" }}>{meta.short}</div>
        <div style={{ fontSize: 10, color: "#555", marginTop: 3 }}>{meta.label}</div>
      </div>
    </div>
  );
}

export default function PresenterView() {
  const [slides, setSlides] = useState(loadSlides);
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());
  const channelRef = useRef(null);

  const slide = slides[index] ?? null;
  const nextSlide = slides[index + 1] ?? null;

  useEffect(() => {
    const ch = new BroadcastChannel("slide-deck-present");
    channelRef.current = ch;

    ch.onmessage = (e) => {
      if (e.data.type === "slides") setSlides(e.data.slides);
      if (e.data.type === "goto") {
        setIndex(e.data.index ?? 0);
        setSubIndex(e.data.subIndex ?? null);
      }
      if (e.data.type === "state") {
        setIndex(e.data.index ?? 0);
        setSubIndex(e.data.subIndex ?? null);
      }
      if (e.data.type === "reset") {
        startRef.current = Date.now();
        setElapsed(0);
      }
    };

    return () => ch.close();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function handleKey(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        channelRef.current?.postMessage({ type: "next" });
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        channelRef.current?.postMessage({ type: "prev" });
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  function navigate(i) {
    channelRef.current?.postMessage({ type: "goto", index: i, subIndex: null });
    setIndex(i);
    setSubIndex(null);
  }

  const actGroups = slides.reduce((acc, s, i) => {
    const a = s.act || 1;
    if (!acc[a]) acc[a] = [];
    acc[a].push({ slide: s, index: i });
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#111", color: "#e8e8e8", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "10px 20px", borderBottom: "1px solid #222", background: "#0d0d0d", fontSize: 13 }}>
        <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>
          {slide ? `Slide ${index + 1} of ${slides.length}` : "No slides"}
          {slide?.act ? <span style={{ marginLeft: 8, fontSize: 11, color: "#555", fontWeight: 400 }}>Act {slide.act}</span> : null}
        </div>
        <div style={{ color: "#888", fontVariantNumeric: "tabular-nums", fontSize: 16, fontWeight: 500 }}>
          {fmt(elapsed)}
        </div>
        <button onClick={() => { startRef.current = Date.now(); setElapsed(0); }}
          style={{ background: "#1e1e1e", border: "1px solid #2e2e2e", borderRadius: 5, padding: "4px 10px", color: "#888", fontSize: 11, cursor: "pointer" }}>
          Reset timer
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={sectionLabel}>CURRENT</div>
              <SlideThumb slide={slide} dim={360} />
              {subIndex !== null && (
                <div style={{ marginTop: 6, fontSize: 11, color: "#555" }}>
                  Collage image {subIndex + 1}
                </div>
              )}
            </div>
            {nextSlide && (
              <div>
                <div style={sectionLabel}>NEXT — {nextSlide.type}</div>
                <SlideThumb slide={nextSlide} dim={240} />
              </div>
            )}
          </div>

          <div style={{ borderTop: "1px solid #1e1e1e", padding: "12px 12px", overflow: "auto", flex: 1 }}>
            <div style={sectionLabel}>ALL SLIDES</div>
            {Object.entries(actGroups).map(([act, items]) => (
              <div key={act} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.06em", fontWeight: 700, marginBottom: 4 }}>ACT {act}</div>
                {items.map(({ slide: s, index: i }) => {
                  const meta = TYPE_META[s.type] || {};
                  return (
                    <button key={s.id} onClick={() => navigate(i)} style={{
                      display: "flex", alignItems: "center", gap: 6, width: "100%",
                      textAlign: "left", padding: "5px 8px", borderRadius: 5, fontSize: 12,
                      background: index === i ? "#1e2a3a" : "transparent",
                      border: `1px solid ${index === i ? "#3b82f644" : "transparent"}`,
                      color: index === i ? "#60a5fa" : "#888",
                      cursor: "pointer", marginBottom: 2,
                    }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: meta.color || "#666", minWidth: 24 }}>{meta.short}</span>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {i + 1}. {s.type}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div style={{ width: "50%", maxWidth: 500, borderLeft: "1px solid #1e1e1e", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, padding: "14px 16px", overflow: "auto" }}>
            <div style={sectionLabel}>NOTES</div>
            <div style={{ fontSize: 15, lineHeight: 1.75, color: "#ccc", whiteSpace: "pre-wrap", marginTop: 6 }}>
              {slide?.notes || <span style={{ color: "#444", fontStyle: "italic" }}>No notes for this slide</span>}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "10px 20px", borderTop: "1px solid #1e1e1e", background: "#0d0d0d" }}>
        <button onClick={() => navigate(Math.max(0, index - 1))} disabled={index <= 0}
          style={{ ...btnStyle, opacity: index <= 0 ? 0.3 : 1 }}>← Prev</button>
        <span style={{ color: "#555", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
          {index + 1} / {slides.length}
        </span>
        <button onClick={() => navigate(Math.min(slides.length - 1, index + 1))} disabled={index >= slides.length - 1}
          style={{ ...btnStyle, opacity: index >= slides.length - 1 ? 0.3 : 1 }}>Next →</button>
      </div>
    </div>
  );
}

const sectionLabel = {
  fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#444",
  textTransform: "uppercase", marginBottom: 8,
};

const btnStyle = {
  padding: "7px 18px", fontSize: 13, fontWeight: 500,
  background: "#1e1e1e", border: "1px solid #2e2e2e",
  borderRadius: 6, color: "#ccc", cursor: "pointer",
};
