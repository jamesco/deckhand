import { useState, useEffect, useRef } from "react";
import { loadSlides } from "./slidesStore.js";
import SlideRenderer from "./SlideRenderer.jsx";

export default function PresentationView() {
  const [slides, setSlides] = useState(loadSlides);
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(null);
  const [navKey, setNavKey] = useState(0);
  const [direction, setDirection] = useState(1);
  const [prevSlide, setPrevSlide] = useState(null);
  const channelRef = useRef(null);
  const advanceRef = useRef(null);
  const retreatRef = useRef(null);
  const indexRef = useRef(index);
  const slidesRef = useRef(slides);
  indexRef.current = index;
  slidesRef.current = slides;

  useEffect(() => {
    const ch = new BroadcastChannel("slide-deck-present");
    channelRef.current = ch;

    ch.onmessage = (e) => {
      const { type, index: i, slides: s, subIndex: si } = e.data;
      if (type === "slides") setSlides(s);
      if (type === "goto") {
        setPrevSlide(slidesRef.current[indexRef.current] ?? null);
        setDirection(i >= indexRef.current ? 1 : -1);
        setIndex(i);
        setSubIndex(si ?? null);
        setNavKey(k => k + 1);
      }
      if (type === "next") advanceRef.current?.();
      if (type === "prev") retreatRef.current?.();
    };

    ch.postMessage({ type: "ready" });
    return () => ch.close();
  }, []);

  advanceRef.current = advance;
  retreatRef.current = retreat;

  useEffect(() => {
    if (!prevSlide) return;
    const id = setTimeout(() => setPrevSlide(null), 300);
    return () => clearTimeout(id);
  }, [navKey]);

  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        advance();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        retreat();
      } else if (e.key === "f" || e.key === "F") {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
        else document.exitFullscreen?.();
      } else if (e.key === "Escape" && !document.fullscreenElement) {
        window.close();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [index, subIndex, slides]);

  function advance() {
    if (index < slides.length - 1) {
      setPrevSlide(slides[index]);
      setDirection(1);
      setIndex(index + 1);
      setNavKey(k => k + 1);
      channelRef.current?.postMessage({ type: "state", index: index + 1, subIndex: null });
    }
  }

  function retreat() {
    if (index > 0) {
      setPrevSlide(slides[index]);
      setDirection(-1);
      setIndex(index - 1);
      setNavKey(k => k + 1);
      channelRef.current?.postMessage({ type: "state", index: index - 1, subIndex: null });
    }
  }

  if (!slides.length) {
    return (
      <div style={shell}>
        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 16, fontFamily: "system-ui" }}>
          No slides yet — build your presentation in the editor.
        </div>
      </div>
    );
  }

  return (
    <div style={shell} tabIndex={0}>
      <style>{`
        @keyframes slide-from-right {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        @keyframes slide-from-left {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
      `}</style>

      {prevSlide && (
        <div style={{ position: "absolute", inset: 0 }}>
          <SlideRenderer slide={prevSlide} />
        </div>
      )}

      <div
        key={navKey}
        style={{
          position: "absolute", inset: 0,
          animation: `${direction >= 0 ? "slide-from-right" : "slide-from-left"} 0.25s cubic-bezier(0.22, 1, 0.36, 1) both`,
        }}
      >
        <SlideRenderer slide={slides[index]} subIndex={subIndex} />
      </div>
    </div>
  );
}

const shell = {
  width: "100vw",
  height: "100vh",
  background: "#000",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "none",
  outline: "none",
  overflow: "hidden",
  position: "relative",
};
