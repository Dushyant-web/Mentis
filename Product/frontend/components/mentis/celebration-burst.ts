/**
 * fireCelebration() — the reward moment. Lazily mounts a fixed canvas and bursts
 * warm confetti + letter particles from a point (default: screen centre). Call it
 * on exercise completion, badge unlock, assessment done, etc.
 *
 *   import { fireCelebration } from "@/components/mentis/celebration-burst";
 *   fireCelebration();
 */
const COLORS = ["#EA6A2E", "#F4B740", "#C24E19", "#FCE6CE", "#ffffff"];
const LETTERS = ["b", "d", "p", "q", "✦", "★"];

type P = {
  x: number; y: number; vx: number; vy: number; g: number; s: number;
  rot: number; vr: number; life: number; c: string; t: string | null;
};

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let particles: P[] = [];
let running = false;

function ensureCanvas() {
  if (canvas) return;
  canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;z-index:9997;pointer-events:none";
  document.body.appendChild(canvas);
  ctx = canvas.getContext("2d");
  const size = () => { if (canvas) { canvas.width = innerWidth; canvas.height = innerHeight; } };
  size();
  window.addEventListener("resize", size);
}

function tick() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const font = getComputedStyle(document.body).fontFamily;
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life--;
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.globalAlpha = Math.max(0, p.life / 40);
    if (p.t) { ctx.fillStyle = p.c; ctx.font = `900 ${p.s + 8}px ${font}`; ctx.textAlign = "center"; ctx.fillText(p.t, 0, 0); }
    else { ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); }
    ctx.restore();
    if (p.life <= 0 || p.y > canvas.height + 40) particles.splice(i, 1);
  }
  if (particles.length > 0) requestAnimationFrame(tick);
  else running = false;
}

export function fireCelebration(opts?: { x?: number; y?: number; count?: number }) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion:reduce)").matches) return;
  ensureCanvas();
  const cx = opts?.x ?? innerWidth / 2;
  const cy = opts?.y ?? innerHeight * 0.5;
  const count = opts?.count ?? 170;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 6 + Math.random() * 12;
    particles.push({
      x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 6,
      g: 0.28 + Math.random() * 0.18, s: 7 + Math.random() * 9,
      rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
      life: 74 + Math.random() * 40, c: COLORS[i % COLORS.length],
      t: Math.random() < 0.28 ? LETTERS[i % LETTERS.length] : null,
    });
  }
  if (!running) { running = true; requestAnimationFrame(tick); }
}
