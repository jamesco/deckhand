import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { colsForCount } from "./slidesStore.js";

const Marquee = lazy(() => import("../Marquee.jsx"));
const COMPONENTS = { Marquee };

// ── API loaders ───────────────────────────────────────────────────────────────
let ytReady = false;
const ytQueue = [];
function loadYTApi(cb) {
  if (ytReady) { cb(); return; }
  ytQueue.push(cb);
  if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
    window.onYouTubeIframeAPIReady = () => { ytReady = true; ytQueue.forEach(fn => fn()); ytQueue.length = 0; };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  }
}

let vimeoReady = false;
const vimeoQueue = [];
function loadVimeoApi(cb) {
  if (vimeoReady) { cb(); return; }
  vimeoQueue.push(cb);
  if (!document.querySelector('script[src*="player.vimeo.com/api/player"]')) {
    const s = document.createElement("script");
    s.src = "https://player.vimeo.com/api/player.js";
    s.onload = () => { vimeoReady = true; vimeoQueue.forEach(fn => fn()); vimeoQueue.length = 0; };
    document.head.appendChild(s);
  }
}

function extractYouTubeId(raw) {
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.hostname === "youtu.be") return url.pathname.slice(1).split("?")[0];
    if (url.hostname.includes("youtube.com")) return url.searchParams.get("v") || raw;
  } catch {}
  return raw;
}

// ── YouTube slide ─────────────────────────────────────────────────────────────
function YouTubeSlide({ videoId, startTime = 0, autoplay }) {
  const cleanId = extractYouTubeId(videoId);
  const divRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    if (!cleanId) return;
    let destroyed = false;

    loadYTApi(() => {
      if (destroyed || !divRef.current) return;
      playerRef.current = new window.YT.Player(divRef.current, {
        videoId: cleanId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          mute: 1,
          start: startTime || 0,
          rel: 0,
          controls: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          showinfo: 0,
        },
        events: {
          onReady(e) {
            e.target.mute();
            if (autoplay) e.target.playVideo();
          },
        },
      });
    });

    return () => {
      destroyed = true;
      try { playerRef.current?.destroy(); } catch {}
      playerRef.current = null;
    };
  }, [cleanId, startTime, autoplay]);

  if (!cleanId) return <div style={emptyStyle}>No video ID set</div>;
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <div ref={divRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

// ── Vimeo slide ───────────────────────────────────────────────────────────────
function VimeoSlide({ videoId, autoplay }) {
  const divRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    if (!videoId) return;
    let destroyed = false;

    loadVimeoApi(() => {
      if (destroyed || !divRef.current) return;
      const player = new window.Vimeo.Player(divRef.current, {
        id: videoId,
        autoplay: false,
        muted: false,
        responsive: true,
      });
      playerRef.current = player;

      player.ready().then(() => {
        if (destroyed) return;
        player.setVolume(0);
        if (autoplay) player.play();
      });
    });

    return () => {
      destroyed = true;
      try { playerRef.current?.destroy(); } catch {}
      playerRef.current = null;
    };
  }, [videoId, autoplay]);

  if (!videoId) return <div style={emptyStyle}>No video ID set</div>;
  return <div ref={divRef} style={{ width: "100%", height: "100%" }} />;
}

// ── Collage grid ──────────────────────────────────────────────────────────────
function CollageGrid({ slide, subIndex = null }) {
  const images = slide.images || [];
  if (!images.length) return <div style={emptyStyle}>No images added yet</div>;

  const isLegacy = typeof images[0] === "string";

  if (isLegacy) {
    const filled = images.filter(Boolean);
    const cols = colsForCount(filled.length);
    return (
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gridAutoRows: "1fr", width: "100%", height: "100%", gap: 2 }}>
        {filled.map((src, i) => (
          <div key={i} style={{ overflow: "hidden", outline: subIndex === i ? "3px solid white" : "none", outlineOffset: -3 }}>
            <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: subIndex !== null && subIndex !== i ? 0.35 : 1, transition: "opacity 0.3s" }}
              onError={(e) => { e.currentTarget.style.opacity = "0.2"; }} />
          </div>
        ))}
      </div>
    );
  }

  const cols = slide.cols || 3;
  const rows = slide.rows || 2;
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gridTemplateRows: `repeat(${rows}, 1fr)`,
      width: "100%",
      height: "100%",
      gap: 2,
    }}>
      {images.map((img, i) => (
        <div key={i} style={{
          gridColumn: `${img.col} / span ${img.colSpan}`,
          gridRow: `${img.row} / span ${img.rowSpan}`,
          overflow: "hidden",
          outline: subIndex === i ? "3px solid white" : "none",
          outlineOffset: -3,
        }}>
          <img src={img.src} alt="" style={{ width: "100%", height: "100%", objectFit: img.fit ? "contain" : "cover", display: "block", opacity: subIndex !== null && subIndex !== i ? 0.35 : 1, transition: "opacity 0.3s" }}
            onError={(e) => { e.currentTarget.style.opacity = "0.2"; }} />
        </div>
      ))}
    </div>
  );
}

// ── iFrame slide ──────────────────────────────────────────────────────────────
function IframeSlide({ url }) {
  const [blocked, setBlocked] = useState(false);
  if (!url) return <div style={emptyStyle}>No URL set</div>;
  if (blocked) return (
    <div style={{ ...emptyStyle, flexDirection: "column", gap: 12 }}>
      <div>This site blocks iframe embedding.</div>
      <a href={url} target="_blank" rel="noreferrer" style={{ color: "#60a5fa", fontSize: 13 }}>Open in new tab</a>
    </div>
  );
  return (
    <iframe
      src={url}
      style={{ width: "100%", height: "100%", border: "none" }}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
      allow="microphone; camera; clipboard-read; clipboard-write"
      onError={() => setBlocked(true)}
    />
  );
}

// ── Main renderer ─────────────────────────────────────────────────────────────
export default function SlideRenderer({ slide, subIndex = null, preview = false }) {
  if (!slide) return null;

  const box = {
    width: "100%", height: "100%", background: "#000",
    display: "flex", alignItems: "center", justifyContent: "center",
    overflow: "hidden", position: "relative",
  };

  switch (slide.type) {
    case "image":
      return (
        <div style={{ ...box, background: slide.bgColor || "#000" }}>
          {slide.src
            ? <img src={slide.src} alt="" style={slide.naturalSize
                ? { maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto", display: "block" }
                : { width: "100%", height: "100%", objectFit: slide.fit === false ? "cover" : "contain" }} />
            : <div style={emptyStyle}>No image URL set</div>}
        </div>
      );

    case "collage":
      return <div style={{ ...box, background: slide.bgColor || "#000" }}><CollageGrid slide={slide} subIndex={subIndex} /></div>;

    case "youtube":
      return (
        <div style={{ ...box, filter: slide.grayscale ? "grayscale(1)" : "none" }}>
          {preview
            ? <iframe
                src={`https://www.youtube.com/embed/${extractYouTubeId(slide.videoId)}?mute=1&rel=0&controls=1${slide.startTime > 0 ? `&start=${slide.startTime}` : ""}`}
                style={{ width: "100%", height: "100%", border: "none" }}
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            : <YouTubeSlide videoId={slide.videoId} startTime={slide.startTime || 0} autoplay />
          }
        </div>
      );

    case "vimeo":
      return (
        <div style={box}>
          <VimeoSlide videoId={slide.videoId} autoplay={!preview} />
        </div>
      );

    case "component": {
      const Comp = COMPONENTS[slide.component];
      if (!Comp) return <div style={{ ...box, color: "#fff" }}>Unknown component: {slide.component}</div>;
      return (
        <div style={box}>
          <Suspense fallback={<div style={emptyStyle}>Loading…</div>}>
            <Comp slide={slide} />
          </Suspense>
        </div>
      );
    }

    case "iframe":
      return <div style={box}><IframeSlide url={slide.url} /></div>;

    default:
      return <div style={{ ...box, color: "#666" }}>Unknown slide type</div>;
  }
}

const emptyStyle = {
  display: "flex", alignItems: "center", justifyContent: "center",
  width: "100%", height: "100%",
  color: "rgba(255,255,255,0.25)", fontSize: 14, fontFamily: "system-ui, sans-serif",
};
