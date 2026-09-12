import { useRef } from "react";

/**
 * usePenTracking — captures pen/stylus telemetry and streams a polished,
 * "demo-grade" readout to the browser console (great for live hackathon demos).
 *
 * Real pressure only comes from a pressure-sensitive device (Apple Pencil,
 * Wacom, touchscreen). A mouse reports a constant 0.5 — so alongside pressure we
 * derive motion biometrics (speed, acceleration, tremor, straightness) that vary
 * naturally on ANY device and are genuine dysgraphia indicators.
 */

const banner = (text: string) =>
  console.log(
    `%c ✍️  ${text} `,
    "background:linear-gradient(90deg,#e0742f,#f4a261);color:#fff;font-weight:bold;font-size:13px;padding:4px 10px;border-radius:6px"
  );

export const usePenTracking = () => {
  const strokesRef = useRef<any[]>([]);
  const isDrawingRef = useRef(false);

  // --- console-logging helpers ---
  const strokeStartIdxRef = useRef(0);
  const strokeNoRef = useRef(0);
  const moveLogRef = useRef(0);
  const sessionBannerRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const startStroke = (x: number, y: number, pressure: number = 0.5, tiltX = 0, tiltY = 0) => {
    if (!sessionBannerRef.current) {
      banner("MENTIS PEN TELEMETRY — LIVE CAPTURE");
      sessionBannerRef.current = true;
    }
    isDrawingRef.current = true;
    strokeStartIdxRef.current = strokesRef.current.length;
    strokeNoRef.current += 1;
    moveLogRef.current = 0;
    lastPtRef.current = { x, y, time: Date.now() };
    console.log(
      `%c✍️ stroke #${strokeNoRef.current}  ▸ START`,
      "color:#e0742f;font-weight:bold",
      `@ (${Math.round(x)}, ${Math.round(y)})  pressure:${pressure.toFixed(3)}`
    );
    strokesRef.current.push({ x, y, time: Date.now(), pressure, tiltX, tiltY, type: "start" });
  };

  const moveStroke = (x: number, y: number, pressure: number = 0.5, tiltX = 0, tiltY = 0) => {
    if (!isDrawingRef.current) return;
    const now = Date.now();
    strokesRef.current.push({ x, y, time: now, pressure, tiltX, tiltY, type: "move" });

    // instantaneous speed (px/s) — varies on any device, looks alive
    let speed = 0;
    if (lastPtRef.current) {
      const dt = now - lastPtRef.current.time || 1;
      speed = (Math.hypot(x - lastPtRef.current.x, y - lastPtRef.current.y) / dt) * 1000;
    }
    lastPtRef.current = { x, y, time: now };

    if (++moveLogRef.current % 6 === 0) {
      const bar = "▉".repeat(Math.min(20, Math.round(speed / 60))); // mini speed meter
      console.log(
        `%c   · x:${String(Math.round(x)).padStart(4)} y:${String(Math.round(y)).padStart(4)}  ` +
          `speed:${String(Math.round(speed)).padStart(4)}px/s ${bar}  P:${pressure.toFixed(3)}`,
        "color:#b0833f;font-family:monospace"
      );
    }
  };

  const endStroke = (x: number, y: number, pressure: number = 0.5, tiltX = 0, tiltY = 0) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    strokesRef.current.push({ x, y, time: Date.now(), pressure, tiltX, tiltY, type: "end" });

    const m = computeStrokeMetrics(strokesRef.current.slice(strokeStartIdxRef.current));
    console.log(
      `%c✍️ stroke #${strokeNoRef.current}  ▸ END`,
      "color:#e0742f;font-weight:bold"
    );
    // pretty grid in DevTools
    console.table({
      points: m.points,
      "duration (ms)": m.durationMs,
      "distance (px)": m.distancePx,
      "avg speed (px/s)": m.avgSpeed,
      "peak speed (px/s)": m.peakSpeed,
      "acceleration (px/s²)": m.accel,
      "tremor index": m.tremor,
      "straightness 0-1": m.straightness,
      "pressure min/avg/max": `${m.pMin} / ${m.pAvg} / ${m.pMax}`,
      "tilt x/y (deg)": `${m.tiltX} / ${m.tiltY}`,
    });
  };

  const reset = () => {
    strokesRef.current = [];
    strokeStartIdxRef.current = 0;
    strokeNoRef.current = 0;
    moveLogRef.current = 0;
    lastPtRef.current = null;
  };

  return { strokesRef, startStroke, moveStroke, endStroke, reset };
};

function computeStrokeMetrics(pts: any[]) {
  const pressures = pts.map((p) => p.pressure);
  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const durMs = pts[pts.length - 1].time - pts[0].time || 1;

  let dist = 0;
  let peakSpeed = 0;
  let dirChanges = 0;
  let prevAngle: number | null = null;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    const seg = Math.hypot(dx, dy);
    dist += seg;
    const dt = pts[i].time - pts[i - 1].time || 1;
    peakSpeed = Math.max(peakSpeed, (seg / dt) * 1000);
    // tremor: count meaningful direction reversals along the path
    if (seg > 0.5) {
      const angle = Math.atan2(dy, dx);
      if (prevAngle !== null) {
        let d = Math.abs(angle - prevAngle);
        if (d > Math.PI) d = 2 * Math.PI - d;
        if (d > Math.PI / 4) dirChanges++;
      }
      prevAngle = angle;
    }
  }

  const net = Math.hypot(
    pts[pts.length - 1].x - pts[0].x,
    pts[pts.length - 1].y - pts[0].y
  );
  const avgSpeed = (dist / durMs) * 1000;

  return {
    points: pts.length,
    durationMs: durMs,
    distancePx: Math.round(dist),
    avgSpeed: Math.round(avgSpeed),
    peakSpeed: Math.round(peakSpeed),
    accel: Math.round((peakSpeed / (durMs / 1000)) || 0),
    tremor: +(dirChanges / Math.max(1, dist / 50)).toFixed(2), // reversals per ~50px
    straightness: +(net / Math.max(1, dist)).toFixed(2), // 1 = perfectly straight
    pMin: +Math.min(...pressures).toFixed(3),
    pAvg: +(pressures.reduce((a, b) => a + b, 0) / pressures.length).toFixed(3),
    pMax: +Math.max(...pressures).toFixed(3),
    tiltX: +avg(pts.map((p) => p.tiltX ?? 0)).toFixed(1),
    tiltY: +avg(pts.map((p) => p.tiltY ?? 0)).toFixed(1),
  };
}
