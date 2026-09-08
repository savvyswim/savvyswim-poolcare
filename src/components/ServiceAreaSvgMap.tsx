import { SERVICE_LOCATIONS } from "@/lib/service-locations";

/**
 * Self-contained map of the cities we run weekly routes in.
 *
 * Drawn from the real city coordinates as an SVG, so it renders on every
 * domain with no external map key or network request.
 */

const W = 640;
const H = 420;
const PAD = 46;

const lats = SERVICE_LOCATIONS.map((l) => l.lat);
const lngs = SERVICE_LOCATIONS.map((l) => l.lng);
const minLat = Math.min(...lats);
const maxLat = Math.max(...lats);
const minLng = Math.min(...lngs);
const maxLng = Math.max(...lngs);

function project(lat: number, lng: number) {
  const x = PAD + ((lng - minLng) / (maxLng - minLng)) * (W - PAD * 2);
  const y = PAD + ((maxLat - lat) / (maxLat - minLat)) * (H - PAD * 2);
  return { x, y };
}

export default function ServiceAreaSvgMap() {
  const points = SERVICE_LOCATIONS.map((l) => ({ ...l, ...project(l.lat, l.lng) }));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label="Map of the North Dallas and Collin County cities Savvy Swim services weekly"
    >
      <rect width={W} height={H} fill="#F4EFE3" />

      {/* subtle grid */}
      <g stroke="#8E1F2C" strokeOpacity="0.08" strokeWidth="1">
        {Array.from({ length: 9 }, (_, i) => (
          <line key={`v${i}`} x1={(W / 8) * i} y1="0" x2={(W / 8) * i} y2={H} />
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <line key={`h${i}`} x1="0" y1={(H / 6) * i} x2={W} y2={(H / 6) * i} />
        ))}
      </g>

      {/* coverage blob */}
      <polygon
        points={points.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="#1FA9BE"
        fillOpacity="0.1"
        stroke="#1FA9BE"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />

      {points.map((p) => (
        <a key={p.name} href={p.href} aria-label={`${p.name} pool service — ${p.routeDays}`}>
          <circle cx={p.x} cy={p.y} r="12" fill="#8E1F2C" fillOpacity="0.12" />
          <circle cx={p.x} cy={p.y} r="5" fill="#8E1F2C" />
          <text
            x={p.x}
            y={p.y - 12}
            textAnchor="middle"
            fill="#4a2027"
            fontSize="13"
            fontWeight="700"
            fontFamily="system-ui, sans-serif"
          >
            {p.name}
          </text>
          <text
            x={p.x}
            y={p.y + 20}
            textAnchor="middle"
            fill="#4a2027"
            fillOpacity="0.6"
            fontSize="10"
            fontFamily="system-ui, sans-serif"
          >
            {p.routeDays}
          </text>
        </a>
      ))}
    </svg>
  );
}
