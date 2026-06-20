// Hand-drawn field-journal night scene for the footer background.
// Pure line-art SVG (vector) so it stays crisp and transitions smoothly
// into the page's --paper background via a top fade mask applied in CSS.
// Palette: cream #e9e0cf, muted blue #5b8fb5, muted orange #c8703e.

const CREAM = "#e9e0cf";
const BLUE = "#5b8fb5";
const ORANGE = "#c8703e";

// A small scatter of stars (x, y, r) across the upper sky.
const STARS: [number, number, number][] = [
  [70, 70, 1.1], [150, 130, 0.8], [240, 60, 1.3], [330, 110, 0.9],
  [470, 80, 1.0], [560, 140, 0.8], [690, 64, 1.2], [820, 120, 0.9],
  [910, 78, 1.0], [1010, 132, 0.8], [1130, 70, 1.3], [1240, 116, 0.9],
  [1330, 60, 1.0], [1390, 128, 0.8], [40, 150, 0.7], [400, 160, 0.7],
  [760, 158, 0.7], [1080, 162, 0.7], [1290, 150, 0.7], [190, 168, 0.6],
];

export default function FooterScene() {
  return (
    <svg
      className="footer-scene"
      viewBox="0 0 1440 400"
      preserveAspectRatio="xMidYMax slice"
      role="img"
      aria-hidden="true"
      fill="none"
    >
      {/* ── stars ── */}
      <g className="footer-scene__stars">
        {STARS.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill={CREAM} opacity={0.7} />
        ))}
        {/* a few four-point sparkles */}
        {([[300, 70], [880, 96], [1180, 110]] as [number, number][]).map(([x, y], i) => (
          <path
            key={`s${i}`}
            d={`M${x},${y - 6} L${x + 1.3},${y - 1.3} L${x + 6},${y} L${x + 1.3},${y + 1.3} L${x},${y + 6} L${x - 1.3},${y + 1.3} L${x - 6},${y} L${x - 1.3},${y - 1.3} Z`}
            fill={CREAM}
            opacity={0.85}
          />
        ))}
      </g>

      {/* ── constellation (upper-left) ── */}
      <g className="footer-scene__constellation" stroke={BLUE} strokeWidth={1} opacity={0.65} strokeLinecap="round">
        <polyline points="120,90 200,150 290,120 360,180 300,70" fill="none" />
        {([[120, 90], [200, 150], [290, 120], [360, 180], [300, 70]] as [number, number][]).map(
          ([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={2.2} fill={BLUE} stroke="none" />
          )
        )}
      </g>

      {/* ── circuit motif (upper-right) ── */}
      <g className="footer-scene__circuit" stroke={ORANGE} strokeWidth={1} opacity={0.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M1180,150 L1180,100 L1260,100 L1260,60 L1340,60" fill="none" />
        <path d="M1260,100 L1310,100 L1310,140" fill="none" />
        {([[1180, 150], [1180, 100], [1260, 100], [1260, 60], [1340, 60], [1310, 140]] as [number, number][]).map(
          ([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={2.4} fill={ORANGE} stroke="none" />
          )
        )}
        <rect x={1255} y={95} width={10} height={10} fill="none" />
      </g>

      {/* ── back ridge (faint, blue) ── */}
      <path
        className="footer-scene__back-fill"
        d="M0,300 L180,262 L340,296 L520,250 L700,292 L900,256 L1080,300 L1260,262 L1440,294 L1440,400 L0,400 Z"
        fill={BLUE}
        fillOpacity={0.05}
      />
      <path
        className="footer-scene__back-ridge"
        d="M0,300 L180,262 L340,296 L520,250 L700,292 L900,256 L1080,300 L1260,262 L1440,294"
        stroke={BLUE}
        strokeWidth={1.2}
        opacity={0.4}
        strokeLinejoin="round"
      />

      {/* ── front ridge with prominent central peak (cream) ── */}
      <path
        className="footer-scene__front-fill"
        d="M0,346 L240,316 L430,352 L620,300 L760,232 L900,318 L1040,286 L1240,330 L1440,300 L1440,400 L0,400 Z"
        fill={CREAM}
        fillOpacity={0.04}
      />
      <path
        className="footer-scene__front-ridge"
        d="M0,346 L240,316 L430,352 L620,300 L760,232 L900,318 L1040,286 L1240,330 L1440,300"
        stroke={CREAM}
        strokeWidth={1.4}
        opacity={0.55}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* ── observatory on a hill (right-of-centre) ── */}
      <g className="footer-scene__observatory" strokeLinecap="round" strokeLinejoin="round">
        {/* hill the observatory sits on */}
        <path
          d="M980,318 Q1080,250 1180,318"
          stroke={CREAM}
          strokeWidth={1.2}
          opacity={0.5}
          fill={CREAM}
          fillOpacity={0.05}
        />
        {/* base building */}
        <path
          d="M1052,286 L1052,266 L1108,266 L1108,286"
          stroke={CREAM}
          strokeWidth={1.4}
          opacity={0.85}
          fill="none"
        />
        {/* dome */}
        <path
          d="M1048,266 A32,28 0 0 1 1112,266 Z"
          stroke={CREAM}
          strokeWidth={1.5}
          opacity={0.9}
          fill={CREAM}
          fillOpacity={0.06}
        />
        {/* dome slit / aperture */}
        <line x1={1080} y1={240} x2={1080} y2={266} stroke={BLUE} strokeWidth={2} opacity={0.85} />
        {/* little door */}
        <line x1={1080} y1={286} x2={1080} y2={272} stroke={CREAM} strokeWidth={1.2} opacity={0.6} />
      </g>

      {/* ── geologic strata (bottom, cream wavy layers) ── */}
      <g className="footer-scene__strata" stroke={CREAM} fill="none" strokeLinecap="round">
        <path d="M0,366 Q360,352 720,366 T1440,362" strokeWidth={1} opacity={0.28} />
        <path d="M0,380 Q400,368 800,382 T1440,378" strokeWidth={1} opacity={0.22} />
      </g>

      {/* ── concentric strata arcs (bottom-right, orange) ── */}
      <g className="footer-scene__arcs" stroke={ORANGE} fill="none" strokeLinecap="round" opacity={0.45}>
        <path d="M1200,400 A150,120 0 0 1 1440,330" strokeWidth={1} />
        <path d="M1230,400 A120,96 0 0 1 1440,352" strokeWidth={1} opacity={0.8} />
        <path d="M1262,400 A92,74 0 0 1 1440,372" strokeWidth={1} opacity={0.6} />
      </g>
    </svg>
  );
}
