import type { JSX } from "react";
import { colorway, DEFAULT_AVATAR, type Colorway } from "@/lib/avatars";

/**
 * Readlet's mascot: an original round ginger cat in flat vector style.
 * Pure SVG + CSS keyframes (no hooks), so it works in server components.
 * All animation is gated behind `prefers-reduced-motion: no-preference`.
 */

export type CatState = "sleepy" | "reading" | "celebrating" | "sad" | "waving";

const INK = "#3B2F2A";
const LIGHT_LINE = "#F3E9DF";
const PINK = "#F28C9B";
const TEAR = "#6EC1F0";

const DEFAULT_TITLES: Record<CatState, string> = {
  sleepy: "Cat napping, waiting for today's reading",
  reading: "Cat reading a book",
  celebrating: "Cat jumping for joy",
  sad: "Sad cat with a small tear",
  waving: "Cat waving hello",
};

const CSS = `
.rl-cat-tail,.rl-cat-wave,.rl-cat-bounce,.rl-cat-breathe,.rl-cat-z,.rl-cat-tear,.rl-cat-shadow,.rl-cat-sparkle{transform-box:fill-box}
.rl-cat-tail{transform-origin:0% 100%}
.rl-cat-wave{transform-origin:10% 90%}
.rl-cat-bounce{transform-origin:50% 100%}
.rl-cat-breathe{transform-origin:50% 100%}
.rl-cat-shadow{transform-origin:50% 50%}
.rl-cat-sparkle{transform-origin:50% 50%}
.rl-cat-tear{transform-origin:50% 0%}
@media (prefers-reduced-motion: no-preference){
.rl-cat-tail{animation:rl-cat-swish 1.8s ease-in-out infinite}
.rl-cat-wave{animation:rl-cat-wave 1.2s ease-in-out infinite}
.rl-cat-bounce{animation:rl-cat-jump .9s cubic-bezier(.3,0,.4,1) infinite}
.rl-cat-shadow{animation:rl-cat-shadow .9s cubic-bezier(.3,0,.4,1) infinite}
.rl-cat-sparkle{animation:rl-cat-twinkle 1.4s ease-in-out infinite}
.rl-cat-sparkle-2{animation-delay:-.7s}
.rl-cat-breathe{animation:rl-cat-breathe 3.6s ease-in-out infinite}
.rl-cat-z{animation:rl-cat-float 3s ease-in-out infinite}
.rl-cat-z-2{animation-delay:-1.5s}
.rl-cat-tear{animation:rl-cat-drop 2.4s ease-in infinite}
@keyframes rl-cat-swish{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(10deg)}}
@keyframes rl-cat-wave{0%,100%{transform:rotate(0deg)}25%{transform:rotate(14deg)}75%{transform:rotate(-10deg)}}
@keyframes rl-cat-jump{0%,100%{transform:translateY(0) scale(1.03,.97)}15%{transform:translateY(0) scale(1,1)}50%{transform:translateY(-14px) scale(.98,1.02)}85%{transform:translateY(0) scale(1,1)}}
@keyframes rl-cat-shadow{0%,15%,85%,100%{transform:scale(1);opacity:1}50%{transform:scale(.7);opacity:.6}}
@keyframes rl-cat-twinkle{0%,100%{transform:scale(.6);opacity:.4}50%{transform:scale(1.15);opacity:1}}
@keyframes rl-cat-breathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.015,1.035)}}
@keyframes rl-cat-float{0%{transform:translate(0,6px);opacity:0}30%{opacity:1}100%{transform:translate(8px,-14px);opacity:0}}
@keyframes rl-cat-drop{0%,20%{transform:translateY(0) scale(.6);opacity:0}35%{transform:translateY(0) scale(1);opacity:1}85%{transform:translateY(10px) scale(1);opacity:1}100%{transform:translateY(14px) scale(.8);opacity:0}}
}
`;

// ---------- colour helpers ----------

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.replace(/./g, (ch) => ch + ch) : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function isDark(hex: string): boolean {
  return luminance(hex) < 0.4;
}

/** Mix a colour towards white; amount 0..1. */
function tint(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const mix = (v: number) => Math.round(v + (255 - v) * amount);
  return `#${[mix(r), mix(g), mix(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

type Palette = {
  c: Colorway;
  /** Mouth line colour (light on dark faces / siamese mask). */
  mouth: string;
  /** Brow colour (light on dark fur). */
  brow: string;
  paw: string;
  tail: string;
  earOuterL: string;
  earOuterR: string;
};

function palette(c: Colorway): Palette {
  const darkBody = isDark(c.body);
  const mouth = c.pattern === "tuxedo" ? INK : c.pattern === "points" || darkBody ? LIGHT_LINE : INK;
  const paw = c.pattern === "tuxedo" ? c.belly : c.pattern === "points" ? c.accent : c.body;
  const tail = c.pattern === "points" ? c.accent : c.pattern === "patches" ? INK : c.body;
  const earOuterL = c.pattern === "points" ? c.accent : c.pattern === "patches" ? c.accent : c.body;
  const earOuterR = c.pattern === "points" ? c.accent : c.pattern === "patches" ? INK : c.body;
  return { c, mouth, brow: darkBody ? LIGHT_LINE : INK, paw, tail, earOuterL, earOuterR };
}

// ---------- head (shared by every state and the avatar) ----------

type Eyes = "open" | "half" | "down";
type Mouth = "smile" | "open" | "frown" | "sleep";

const HEAD_RX = 52;
const HEAD_RY = 42;

function Ear({ fill, inner, down, side }: { fill: string; inner: string; down: boolean; side: 1 | -1 }) {
  // Drawn for the left ear; the right ear is mirrored.
  const outer = down ? "M -44 -16 L -66 -34 L -18 -36 Z" : "M -44 -16 L -42 -60 L -10 -38 Z";
  const inn = down ? "M -43.5 -21.1 L -56.7 -31.9 L -27.9 -33.1 Z" : "M -39.2 -24.8 L -38 -51.2 L -18.8 -38 Z";
  return (
    <g transform={side === -1 ? "scale(-1 1)" : undefined}>
      <path d={outer} fill={fill} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      <path d={inn} fill={inner} strokeLinejoin="round" stroke={inner} strokeWidth={2} />
    </g>
  );
}

function HeadPattern({ c }: { c: Colorway }) {
  switch (c.pattern) {
    case "stripes":
      return (
        <g stroke={c.accent} strokeWidth={4} strokeLinecap="round" fill="none">
          <path d="M -10 -38 q 3 8 0 15" />
          <path d="M 0 -40 v 17" />
          <path d="M 10 -38 q -3 8 0 15" />
          <path d="M -49 -6 q 7 1 11 4" />
          <path d="M -50 4 q 7 0 10 2" />
          <path d="M 49 -6 q -7 1 -11 4" />
          <path d="M 50 4 q -7 0 -10 2" />
        </g>
      );
    case "points":
      return <ellipse cx={0} cy={11} rx={30} ry={22} fill={c.accent} opacity={0.88} />;
    case "patches":
      return (
        <g>
          <path d="M -52 0 A 52 42 0 0 1 -10 -41.2 Q -12 -24 -24 -16 Q -38 -8 -52 0 Z" fill={c.accent} />
          <path d="M 10 -41.2 A 52 42 0 0 1 49.4 -13.1 Q 40 -12 32 -18 Q 22 -26 10 -41.2 Z" fill={INK} />
        </g>
      );
    case "tuxedo":
      return (
        <g fill={c.belly}>
          <path d="M 0 -16 Q 7 0 16 10 L -16 10 Q -7 0 0 -16 Z" />
          <ellipse cx={0} cy={19} rx={20} ry={13} />
        </g>
      );
    default:
      return null;
  }
}

function Eye({ x, y, kind, c }: { x: number; y: number; kind: Eyes; c: Colorway }) {
  if (kind === "half") {
    return (
      <g>
        <path d={`M ${x - 11} ${y + 3} A 11 7.5 0 0 0 ${x + 11} ${y + 3} Z`} fill={c.eye} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
        <path d={`M ${x - 7} ${y + 3} A 7 5.5 0 0 0 ${x + 7} ${y + 3} Z`} fill={INK} />
        <circle cx={x + 3} cy={y + 5.5} r={1.5} fill="#fff" />
        <path d={`M ${x - 12.5} ${y + 3.5} Q ${x} ${y - 2.5} ${x + 12.5} ${y + 3.5}`} stroke={INK} strokeWidth={3} strokeLinecap="round" fill="none" />
      </g>
    );
  }
  const py = kind === "down" ? 3 : 1;
  return (
    <g>
      <circle cx={x} cy={y} r={11} fill={c.eye} stroke={INK} strokeWidth={2.5} />
      <circle cx={x} cy={y + py} r={8} fill={INK} />
      <circle cx={x + 3.5} cy={y + py - 3.5} r={3.2} fill="#fff" />
      <circle cx={x - 3} cy={y + py + 3.5} r={1.5} fill="#fff" />
    </g>
  );
}

function MouthShape({ kind, color }: { kind: Mouth; color: string }) {
  switch (kind) {
    case "open":
      return (
        <g>
          <path d="M -8 20 Q 0 34 8 20 Q 0 23 -8 20 Z" fill={INK} stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
          <path d="M -4 26.5 Q 0 23.5 4 26.5 Q 0 30 -4 26.5 Z" fill={PINK} />
        </g>
      );
    case "frown":
      return <path d="M -7 26 Q 0 19 7 26" stroke={color} strokeWidth={2.4} strokeLinecap="round" fill="none" />;
    case "sleep":
      return <path d="M -3.5 21 Q 0 23.5 3.5 21" stroke={color} strokeWidth={2.2} strokeLinecap="round" fill="none" />;
    default:
      return (
        <path
          d="M 0 18 Q -2 23.5 -7 22 M 0 18 Q 2 23.5 7 22"
          stroke={color}
          strokeWidth={2.2}
          strokeLinecap="round"
          fill="none"
        />
      );
  }
}

function Head({
  p,
  eyes = "open",
  mouth = "smile",
  earsDown = false,
  tear = false,
}: {
  p: Palette;
  eyes?: Eyes;
  mouth?: Mouth;
  earsDown?: boolean;
  tear?: boolean;
}) {
  const { c } = p;
  return (
    <g>
      <Ear fill={p.earOuterL} inner={c.ear} down={earsDown} side={1} />
      <Ear fill={p.earOuterR} inner={c.ear} down={earsDown} side={-1} />
      <ellipse cx={0} cy={0} rx={HEAD_RX} ry={HEAD_RY} fill={c.body} />
      <HeadPattern c={c} />
      <ellipse cx={0} cy={0} rx={HEAD_RX} ry={HEAD_RY} fill="none" stroke={INK} strokeWidth={3} />
      {/* blush */}
      <ellipse cx={-34} cy={16} rx={7} ry={4} fill={PINK} opacity={0.5} />
      <ellipse cx={34} cy={16} rx={7} ry={4} fill={PINK} opacity={0.5} />
      {/* whiskers */}
      <g stroke={INK} strokeWidth={1.8} strokeLinecap="round">
        <path d="M -42 11 L -63 7 M -42 17 L -63 19" />
        <path d="M 42 11 L 63 7 M 42 17 L 63 19" />
      </g>
      {earsDown && (
        <g stroke={p.brow} strokeWidth={2.6} strokeLinecap="round">
          <path d="M -29 -12 L -14 -17" />
          <path d="M 29 -12 L 14 -17" />
        </g>
      )}
      <Eye x={-20} y={2} kind={eyes} c={c} />
      <Eye x={20} y={2} kind={eyes} c={c} />
      {/* nose */}
      <path d="M -5 12 Q 0 10.5 5 12 Q 1.5 17.5 0 18 Q -1.5 17.5 -5 12 Z" fill={PINK} stroke={PINK} strokeWidth={1} strokeLinejoin="round" />
      <MouthShape kind={mouth} color={p.mouth} />
      {tear && (
        <g transform="translate(-27 13)">
          <path className="rl-cat-tear" d="M 0 0 C 3 5 4.5 8 0 11 C -4.5 8 -3 5 0 0 Z" fill={TEAR} stroke={INK} strokeWidth={1} />
        </g>
      )}
    </g>
  );
}

// ---------- body parts ----------

const SIT_BODY = "M 66 104 C 52 130 48 160 60 178 Q 100 190 140 178 C 152 160 148 130 134 104 Z";

function SitBody({ p }: { p: Palette }) {
  const { c } = p;
  return (
    <g>
      <path d={SIT_BODY} fill={c.body} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      {c.pattern === "patches" && (
        <g>
          <path d="M 61 146 Q 66 132 78 136 Q 86 146 78 160 Q 64 166 61 146 Z" fill={c.accent} />
          <path d="M 124 120 Q 134 114 140 124 Q 142 136 132 138 Q 122 134 124 120 Z" fill={INK} />
        </g>
      )}
      <ellipse cx={100} cy={152} rx={c.pattern === "tuxedo" ? 29 : 25} ry={28} fill={c.belly} />
      {c.pattern === "stripes" && (
        <g stroke={c.accent} strokeWidth={4} strokeLinecap="round" fill="none">
          <path d="M 58 136 q 9 2 14 -4" />
          <path d="M 56 152 q 9 2 14 -4" />
          <path d="M 142 136 q -9 2 -14 -4" />
          <path d="M 144 152 q -9 2 -14 -4" />
        </g>
      )}
      <path d={SIT_BODY} fill="none" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
    </g>
  );
}

/** Thick stroked limb/tail with an ink outline (two passes). */
function Limb({ d, fill, w = 11, stripes, className }: { d: string; fill: string; w?: number; stripes?: string; className?: string }) {
  return (
    <g className={className}>
      <path d={d} stroke={INK} strokeWidth={w + 5} strokeLinecap="round" fill="none" />
      <path d={d} stroke={fill} strokeWidth={w} strokeLinecap="round" fill="none" />
      {stripes && <path d={d} stroke={stripes} strokeWidth={w} strokeDasharray="4 8" strokeDashoffset={-8} fill="none" />}
    </g>
  );
}

function Tail({ p, d, className }: { p: Palette; d: string; className?: string }) {
  return <Limb d={d} fill={p.tail} w={11} stripes={p.c.pattern === "stripes" ? p.c.accent : undefined} className={className} />;
}

function Paw({ x, y, rx = 10, ry = 7, p, pad = false }: { x: number; y: number; rx?: number; ry?: number; p: Palette; pad?: boolean }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={p.paw} stroke={INK} strokeWidth={2.5} />
      {pad && <ellipse cx={x} cy={y + 1.5} rx={rx * 0.4} ry={ry * 0.35} fill={PINK} />}
    </g>
  );
}

function Feet({ p, y = 180 }: { p: Palette; y?: number }) {
  return (
    <g>
      <Paw x={74} y={y} rx={14} ry={8} p={p} />
      <Paw x={126} y={y} rx={14} ry={8} p={p} />
    </g>
  );
}

function Sparkle({ x, y, r, color, second }: { x: number; y: number; r: number; color: string; second?: boolean }) {
  const d = `M ${x} ${y - r} Q ${x} ${y} ${x + r} ${y} Q ${x} ${y} ${x} ${y + r} Q ${x} ${y} ${x - r} ${y} Q ${x} ${y} ${x} ${y - r} Z`;
  return <path className={second ? "rl-cat-sparkle rl-cat-sparkle-2" : "rl-cat-sparkle"} d={d} fill={color} />;
}

// ---------- poses ----------

function Waving({ p }: { p: Palette }) {
  return (
    <g>
      <Tail p={p} d="M 138 172 C 175 176 182 142 168 124" />
      <SitBody p={p} />
      <Feet p={p} />
      <Paw x={92} y={175} p={p} />
      <g transform="translate(100 76)">
        <Head p={p} />
      </g>
      <g className="rl-cat-wave">
        <Limb d="M 132 126 Q 152 114 162 94" fill={p.c.body} />
        <Paw x={163} y={88} rx={10} ry={10} p={p} pad />
      </g>
    </g>
  );
}

function Reading({ p }: { p: Palette }) {
  return (
    <g>
      <Tail p={p} d="M 138 172 C 175 176 182 142 168 124" className="rl-cat-tail" />
      <SitBody p={p} />
      <Feet p={p} />
      <g transform="translate(100 76)">
        <Head p={p} eyes="down" />
      </g>
      {/* open book */}
      <path d="M 62 132 L 100 140 L 138 132 L 138 168 L 100 176 L 62 168 Z" fill="#3E7CB1" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M 66 133 Q 84 128 100 137 L 100 170 Q 84 162 66 164 Z" fill="#FFFDF7" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <path d="M 134 133 Q 116 128 100 137 L 100 170 Q 116 162 134 164 Z" fill="#FFFDF7" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <g stroke="#C9BFB5" strokeWidth={1.6} strokeLinecap="round" fill="none">
        <path d="M 72 141 Q 84 138 94 143" />
        <path d="M 72 148 Q 84 145 94 150" />
        <path d="M 72 155 Q 84 152 94 157" />
        <path d="M 128 141 Q 116 138 106 143" />
        <path d="M 128 148 Q 116 145 106 150" />
        <path d="M 128 155 Q 116 152 112 154" />
      </g>
      <Paw x={63} y={150} rx={9} ry={9} p={p} />
      <Paw x={137} y={150} rx={9} ry={9} p={p} />
    </g>
  );
}

function Celebrating({ p }: { p: Palette }) {
  const armFill = p.c.body;
  return (
    <g>
      <ellipse className="rl-cat-shadow" cx={100} cy={194} rx={36} ry={4} fill={INK} opacity={0.14} />
      <Sparkle x={26} y={36} r={7} color="#F5B82E" />
      <Sparkle x={176} y={30} r={6} color="#4FB3E8" second />
      <Sparkle x={18} y={128} r={5} color="#F27A9B" second />
      <Sparkle x={184} y={120} r={6} color="#7BC67E" />
      <g className="rl-cat-bounce">
        <Tail p={p} d="M 136 170 C 168 170 178 150 184 136" />
        <SitBody p={p} />
        <Feet p={p} y={184} />
        <Limb d="M 70 124 Q 50 112 40 92" fill={armFill} />
        <Limb d="M 130 124 Q 150 112 160 92" fill={armFill} />
        <Paw x={37} y={85} rx={10} ry={10} p={p} pad />
        <Paw x={163} y={85} rx={10} ry={10} p={p} pad />
        <g transform="translate(100 72)">
          <Head p={p} mouth="open" />
        </g>
      </g>
    </g>
  );
}

function Sad({ p }: { p: Palette }) {
  return (
    <g>
      <Tail p={p} d="M 136 180 C 156 189 176 187 188 179" />
      <SitBody p={p} />
      <Feet p={p} />
      <Paw x={89} y={175} p={p} />
      <Paw x={111} y={175} p={p} />
      <g transform="translate(100 82)">
        <Head p={p} earsDown mouth="frown" tear />
      </g>
    </g>
  );
}

function Sleepy({ p }: { p: Palette }) {
  const { c } = p;
  return (
    <g>
      <text className="rl-cat-z" x={140} y={78} fontSize={20} fontWeight={700} fill={INK} fontFamily="ui-rounded, system-ui, sans-serif">
        z
      </text>
      <text className="rl-cat-z rl-cat-z-2" x={158} y={56} fontSize={14} fontWeight={700} fill={INK} fontFamily="ui-rounded, system-ui, sans-serif">
        z
      </text>
      <g className="rl-cat-breathe">
        <ellipse cx={112} cy={150} rx={66} ry={34} fill={c.body} stroke={INK} strokeWidth={3} />
        {c.pattern === "stripes" && (
          <g stroke={c.accent} strokeWidth={4} strokeLinecap="round" fill="none">
            <path d="M 120 119 q 4 9 0 17" />
            <path d="M 138 121 q 4 9 0 15" />
            <path d="M 156 127 q 3 7 0 13" />
          </g>
        )}
        {c.pattern === "patches" && (
          <g>
            <path d="M 132 132 Q 146 124 158 134 Q 162 148 148 152 Q 132 150 132 132 Z" fill={c.accent} />
            <path d="M 160 152 Q 170 146 174 156 Q 172 166 164 164 Q 156 160 160 152 Z" fill={INK} />
          </g>
        )}
        {c.pattern === "tuxedo" && <ellipse cx={112} cy={170} rx={40} ry={10} fill={c.belly} />}
        <ellipse cx={112} cy={150} rx={66} ry={34} fill="none" stroke={INK} strokeWidth={3} />
        <Tail p={p} d="M 170 160 C 180 188 120 192 66 182" />
        <Paw x={62} y={176} rx={11} ry={6.5} p={p} />
        <Paw x={86} y={178} rx={11} ry={6.5} p={p} />
        <g transform="translate(76 124) rotate(-10)">
          <Head p={p} eyes="half" mouth="sleep" />
        </g>
      </g>
    </g>
  );
}

const POSES: Record<CatState, (props: { p: Palette }) => JSX.Element> = {
  sleepy: Sleepy,
  reading: Reading,
  celebrating: Celebrating,
  sad: Sad,
  waving: Waving,
};

// ---------- public components ----------

export function Cat({
  state,
  avatar = DEFAULT_AVATAR,
  size = 160,
  className,
  title,
}: {
  state: CatState;
  avatar?: string;
  size?: number;
  className?: string;
  title?: string;
}): JSX.Element {
  const p = palette(colorway(avatar));
  const Pose = POSES[state] ?? Waving;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title ?? DEFAULT_TITLES[state] ?? DEFAULT_TITLES.waving}</title>
      <style>{CSS}</style>
      <Pose p={p} />
    </svg>
  );
}

export function CatAvatar({
  avatar,
  size = 40,
  className,
}: {
  avatar: string;
  size?: number;
  className?: string;
}): JSX.Element {
  const c = colorway(avatar);
  const p = palette(c);
  const bg = tint(luminance(c.body) > 0.75 ? c.accent : c.body, 0.72);
  return (
    <svg
      width={size}
      height={size}
      viewBox="-64 -64 128 128"
      aria-hidden="true"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx={0} cy={0} r={64} fill={bg} />
      <g transform="translate(0 9) scale(0.86)">
        <Head p={p} />
      </g>
    </svg>
  );
}
