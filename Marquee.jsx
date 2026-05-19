export const DEFAULT_ROWS = [
  {
    words: ["Your Content Here", "Add Your Text", "Customize Rows", "Edit in the Panel"],
    size: 80, weight: 800, duration: 14, dir: -1, color: "#E31E67",
  },
  {
    words: ["Subtitle text", "More information", "Secondary content", "Supporting details"],
    size: 28, weight: 400, duration: 14, dir: 1, color: "rgba(255,255,255,0.3)",
  },
  {
    words: ["Section Title", "Key Points", "Highlights", "Topics", "Themes"],
    size: 64, weight: 700, duration: 18, dir: -1, color: "#7e25ff",
  },
  {
    words: ["Additional context", "Background information", "Supporting content", "Details"],
    size: 24, weight: 400, duration: 18, dir: 1, color: "rgba(255,255,255,0.22)",
  },
  {
    words: ["TAG1", "TAG2", "TAG3", "TAG4", "TAG5", "TAG6", "TAG7"],
    size: 56, weight: 700, duration: 12, dir: -1, color: "#00BAC8",
  },
  {
    words: ["Supporting note", "Extra context", "More details", "Fine print", "Background"],
    size: 22, weight: 400, duration: 22, dir: 1, color: "rgba(255,255,255,0.15)",
  },
];

const SANS = `'SF Pro Display', -apple-system, 'Segoe UI', sans-serif`;
const SEP = " · ";

function MarqueeRow({ words, size, weight, duration, dir, color }) {
  const repeated = [...words, ...words, ...words, ...words];
  const content = repeated.join(SEP) + SEP;
  const anim = dir === -1 ? "marquee-left" : "marquee-right";

  return (
    <div style={{ overflow: "hidden", whiteSpace: "nowrap", lineHeight: 1.15 }}>
      <span style={{
        display: "inline-block",
        animation: `${anim} ${duration}s linear infinite`,
        fontSize: size,
        fontWeight: weight,
        fontFamily: SANS,
        color,
        letterSpacing: size > 48 ? "-0.02em" : "0em",
      }}>
        {content}
      </span>
    </div>
  );
}

export default function Marquee({ slide }) {
  const rows = slide?.rows?.length ? slide.rows : DEFAULT_ROWS;
  return (
    <div style={{
      width: "100%",
      height: "100vh",
      background: "#000",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      gap: 4,
      overflow: "hidden",
      userSelect: "none",
    }}>
      <style>{`
        @keyframes marquee-left {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes marquee-right {
          from { transform: translateX(-50%); }
          to   { transform: translateX(0); }
        }
      `}</style>
      {rows.map((row, i) => (
        <MarqueeRow key={i} {...row} />
      ))}
    </div>
  );
}
