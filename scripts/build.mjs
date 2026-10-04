// Renders the profile cards in assets/ from profile.json and live Roblox stats.
// Run with: node scripts/build.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "assets");
const profile = JSON.parse(readFileSync(join(here, "profile.json"), "utf8"));
const b64 = (file) => readFileSync(join(here, file)).toString("base64");

// Palette and type lifted from karbon.cloud
const c = {
  bg: "#09090c",
  card: "#0f0f13",
  fg: "#ededf2",
  muted: "#8c8c99",
  accent: "#9d8cff",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.16)",
  live: "#4ade80",
};
const W = 840;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const full = (n) => n.toLocaleString("en-GB");
const compact = (n) => {
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1e4) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return full(n);
};

const baseCss = `
  @font-face { font-family: "Geist"; font-weight: 100 900; src: url(data:font/woff2;base64,${b64("fonts/geist.woff2")}) format("woff2"); }
  @font-face { font-family: "Geist Mono"; font-weight: 100 900; src: url(data:font/woff2;base64,${b64("fonts/geist-mono.woff2")}) format("woff2"); }
  text { font-family: "Geist", -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; fill: ${c.fg}; }
  .mono { font-family: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace; }
  .label { font-family: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; letter-spacing: 0.14em; fill: ${c.muted}; }
  .muted { fill: ${c.muted}; }
  .accent { fill: ${c.accent}; }
  .pulse { animation: pulse 2.4s ease-out infinite; transform-box: fill-box; transform-origin: center; }
  @keyframes pulse { 0% { transform: scale(1); opacity: 0.55; } 100% { transform: scale(3.2); opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
`;

const svg = (h, body, css = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}" fill="none">
<style>${baseCss}${css}</style>
${body}
</svg>
`;

const liveDot = (x, y) =>
  `<circle class="pulse" cx="${x}" cy="${y}" r="3" fill="${c.live}"/><circle cx="${x}" cy="${y}" r="3" fill="${c.live}"/>`;

const arrow = (x, y, s = 12) =>
  `<path d="M${x} ${y}h${s}v${s}M${x} ${y + s}L${x + s} ${y}" stroke="${c.accent}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;

// Digits roll up from zero to their value when the image loads. The resting
// transform is the final value, so viewers without animation still see it.
function odometer(text, x, y, size) {
  const cw = size * 0.6;
  const lh = Math.round(size * 1.3);
  let s = `<clipPath id="digit"><rect x="0" y="${-lh + Math.round(size * 0.28)}" width="${cw}" height="${lh}"/></clipPath>`;
  [...text].forEach((ch, i) => {
    const cx = x + i * cw;
    if (!/\d/.test(ch)) {
      s += `<text class="mono muted" x="${cx}" y="${y}" font-size="${size}" font-weight="500">${ch}</text>`;
      return;
    }
    const strip = Array.from({ length: 10 }, (_, d) => `<tspan x="0" y="${d * lh}">${d}</tspan>`).join("");
    s += `<g transform="translate(${cx} ${y})" clip-path="url(#digit)"><g class="roll" style="transform: translateY(${-ch * lh}px); animation-delay: ${(i * 0.06).toFixed(2)}s"><text class="mono" font-size="${size}" font-weight="500">${strip}</text></g></g>`;
  });
  return s;
}

function hero(stats) {
  const H = 328;
  const css = `
    .roll { animation: roll 1.8s cubic-bezier(0.16, 1, 0.3, 1) backwards; }
    @keyframes roll { from { transform: translateY(0); } }
    .glow { animation: breathe 9s ease-in-out infinite alternate; }
    @keyframes breathe { from { opacity: 0.55; } to { opacity: 1; } }
    .rise { animation: rise 0.9s cubic-bezier(0.16, 1, 0.3, 1) backwards; }
    @keyframes rise { from { opacity: 0; transform: translateY(10px); } }
  `;
  const stat = (x, label, value, live = false) =>
    `<text class="label" x="${x}" y="262">${label}</text><text class="mono" x="${x}" y="296" font-size="24" font-weight="500"${live ? ` style="fill: ${c.live}"` : ""}>${esc(value)}</text>`;
  const body = `
<defs>
  <clipPath id="frame"><rect width="${W}" height="${H}" rx="16"/></clipPath>
  <radialGradient id="glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(720 0) scale(460 300)">
    <stop stop-color="${c.accent}" stop-opacity="0.26"/><stop offset="1" stop-color="${c.accent}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="fade" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(700 30) scale(520 330)">
    <stop stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </radialGradient>
  <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#fff" fill-opacity="0.16"/></pattern>
  <mask id="dotmask"><rect width="${W}" height="${H}" fill="url(#fade)"/></mask>
</defs>
<g clip-path="url(#frame)">
  <rect width="${W}" height="${H}" fill="${c.bg}"/>
  <rect width="${W}" height="${H}" fill="url(#dots)" mask="url(#dotmask)"/>
  <rect class="glow" width="${W}" height="${H}" fill="url(#glow)"/>
</g>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="15.5" stroke="${c.border}"/>

<g class="rise">
  <text class="muted" x="38" y="96" font-size="52" font-weight="600" letter-spacing="-0.035em">Hi, I’m</text>
  <text x="38" y="156" font-size="60" font-weight="600" letter-spacing="-0.04em">${esc(profile.name)}<tspan class="accent">.</tspan></text>
</g>
<g class="rise" style="animation-delay: 0.12s">
  <text class="muted" x="40" y="194" font-size="16">${esc(profile.tagline[0])}</text>
  <text x="40" y="217" font-size="16">${esc(profile.tagline[1])}</text>
</g>

<path d="M0 234.5H${W}" stroke="${c.border}"/>
<text class="label" x="40" y="262">TOTAL VISITS</text>
${odometer(full(stats.visits), 40, 296, 24)}
${stat(300, "PLAYING NOW", full(stats.playing), true)}
${stat(470, "GAMES SHIPPED", String(stats.games).padStart(2, "0"))}
${stat(650, "BASED IN", profile.location)}
`;
  return svg(H, body, css);
}

function sectionBar(num, label, title) {
  const H = 52;
  return svg(
    H,
    `<text class="label" x="4" y="32"><tspan class="accent">${num}</tspan>  /  ${esc(label.toUpperCase())}</text>
<text x="${W - 4}" y="32" font-size="14" text-anchor="end" font-weight="500">${esc(title)}</text>`,
    // The bar has no card behind it, so its text follows the reader's theme.
    `text { fill: #1f2328; } .label { fill: #59636e; } .accent { fill: #6f5bd6; }
     @media (prefers-color-scheme: dark) { text { fill: ${c.fg}; } .label { fill: ${c.muted}; } .accent { fill: ${c.accent}; } }`
  );
}

// Lead project card. The right-hand panel is a station departure board whose
// "services" are the parts of the project.
function featured() {
  const f = profile.featured;
  const H = 236;
  const amber = "#ffb547";
  const px = 458, py = 24, pw = W - px - 24, ph = H - 48;
  const rowY = (i) => py + 58 + i * 26;
  const css = `
    .led { font-family: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; fill: ${amber}; }
    .ledhead { font-family: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 9.5px; letter-spacing: 0.12em; fill: ${amber}; fill-opacity: 0.5; }
    .flip { animation: flip 0.5s steps(4) backwards; }
    @keyframes flip { from { opacity: 0; } }
    .t1 { animation: swap 8s steps(1) infinite; }
    .t2 { opacity: 0; animation: swap 8s steps(1) reverse infinite; }
    @keyframes swap { 0% { opacity: 1; } 50% { opacity: 0; } }
  `;
  const rows = f.board
    .map(([part, stack], i) => `<g class="flip" style="animation-delay: ${(0.5 + i * 0.22).toFixed(2)}s">
  <text class="led" x="${px + 18}" y="${rowY(i)}">${i + 1}</text>
  <text class="led" x="${px + 62}" y="${rowY(i)}">${esc(part)}</text>
  <text class="led" x="${px + 142}" y="${rowY(i)}" fill-opacity="0.72">${esc(stack)}</text>
  <text class="led" x="${px + pw - 18}" y="${rowY(i)}" text-anchor="end">On time</text>
</g>`)
    .join("\n");
  const tickerY = py + ph - 16;
  const body = `
<defs>
  <pattern id="matrix" width="3" height="3" patternUnits="userSpaceOnUse"><path d="M0 2.5H3M2.5 0V3" stroke="#050506" stroke-opacity="0.5"/></pattern>
</defs>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="15.5" fill="${c.card}" stroke="${c.border}"/>

<text class="label" x="32" y="50"><tspan class="accent">FEATURED</tspan></text>
<text x="31" y="92" font-size="30" font-weight="600" letter-spacing="-0.03em">${esc(f.name)}</text>
<text class="muted" x="32" y="124" font-size="14">${esc(f.blurb[0])}</text>
<text class="muted" x="32" y="145" font-size="14">${esc(f.blurb[1])}</text>
<text class="mono" x="32" y="${H - 34}" font-size="12" letter-spacing="0.02em">synoptc/${esc(f.repo)}</text>
${arrow(32 + `synoptc/${f.repo}`.length * 7.45 + 10, H - 44, 9)}

<rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="10" fill="#050506" stroke="${c.borderStrong}"/>
<text class="ledhead" x="${px + 18}" y="${py + 28}">PLAT</text>
<text class="ledhead" x="${px + 62}" y="${py + 28}">SERVICE</text>
<text class="ledhead" x="${px + pw - 18}" y="${py + 28}" text-anchor="end">EXPECTED</text>
<path d="M${px + 18} ${py + 38.5}H${px + pw - 18}" stroke="${amber}" stroke-opacity="0.18"/>
${rows}
<path d="M${px + 18} ${tickerY - 17.5}H${px + pw - 18}" stroke="${amber}" stroke-opacity="0.18"/>
<text class="led t1" x="${px + pw / 2}" y="${tickerY}" text-anchor="middle">${esc(f.ticker[0])}</text>
<text class="led t2" x="${px + pw / 2}" y="${tickerY}" text-anchor="middle">${esc(f.ticker[1])}</text>
<rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="10" fill="url(#matrix)"/>
`;
  return svg(H, body, css);
}

function repoRow(i, repo) {
  const H = 88;
  const body = `
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="11.5" fill="${c.card}" stroke="${c.border}"/>
<text class="label" x="28" y="49">${String(i + 1).padStart(2, "0")}</text>
<text x="72" y="40" font-size="17" font-weight="600" letter-spacing="-0.01em">${esc(repo.name)}</text>
<text class="muted" x="72" y="62" font-size="13">${esc(repo.blurb)}</text>
<text class="mono muted" x="770" y="49" font-size="12" letter-spacing="0.02em" text-anchor="end">${esc(repo.stack)}</text>
${arrow(796, 38, 10)}
`;
  return svg(H, body);
}

function gameRow(i, game) {
  const H = 64;
  const live = game.playing > 0;
  const body = `
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="11.5" fill="${c.card}" stroke="${c.border}"/>
<text class="label" x="28" y="37">${String(i + 1).padStart(2, "0")}</text>
<text x="72" y="38" font-size="16" font-weight="600" letter-spacing="-0.01em">${esc(game.name)}</text>
${
  live
    ? `${liveDot(560 - full(game.playing).length * 8.4 - 12, 23)}
<text class="mono" x="560" y="28" font-size="14" font-weight="500" text-anchor="end">${full(game.playing)}</text>
<text class="label" x="560" y="46" font-size="9.5" text-anchor="end">PLAYING</text>`
    : ""
}
<text class="mono" x="672" y="28" font-size="14" font-weight="500" text-anchor="end">${compact(game.favourites)}</text>
<text class="label" x="672" y="46" font-size="9.5" text-anchor="end">FAVS</text>
<text class="mono" x="770" y="28" font-size="14" font-weight="500" text-anchor="end">${compact(game.visits)}</text>
<text class="label" x="770" y="46" font-size="9.5" text-anchor="end">VISITS</text>
${arrow(796, 26, 10)}
`;
  return svg(H, body);
}

function experience() {
  const rowH = 56;
  const H = profile.experience.length * rowH + 16;
  const rows = profile.experience
    .map((e, i) => {
      const y = 8 + i * rowH;
      const current = /present/i.test(e.period);
      return `${i ? `<path d="M28 ${y}.5H${W - 28}" stroke="${c.border}"/>` : ""}
<circle cx="32" cy="${y + 28}" r="3" fill="${current ? c.accent : "none"}" stroke="${current ? c.accent : c.borderStrong}"/>
<text class="label" x="52" y="${y + 32}">${esc(e.period.toUpperCase())}</text>
<text x="270" y="${y + 33}" font-size="15" font-weight="600">${esc(e.org)}</text>
<text class="muted" x="${W - 28}" y="${y + 33}" font-size="13" text-anchor="end">${esc(e.role)}</text>`;
    })
    .join("\n");
  return svg(H, `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="11.5" fill="${c.card}" stroke="${c.border}"/>\n${rows}`);
}

function tools() {
  const size = 12;
  const cw = size * 0.6 + size * 0.04; // mono advance plus letter-spacing
  const pad = 14, gap = 8, chipH = 30, inset = 20;
  let x = inset, y = inset, chips = "";
  for (const t of profile.tools) {
    const w = Math.ceil(t.length * cw + pad * 2);
    if (x + w > W - inset) { x = inset; y += chipH + gap; }
    chips += `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w}" height="${chipH}" rx="15" stroke="${c.borderStrong}"/>
<text class="mono" x="${x + pad}" y="${y + 20}" font-size="${size}" letter-spacing="0.04em">${esc(t)}</text>`;
    x += w + gap;
  }
  const H = y + chipH + inset + 1;
  return svg(H, `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="11.5" fill="${c.card}" stroke="${c.border}"/>\n${chips}`);
}

function contact() {
  const H = 132;
  const body = `
<defs>
  <clipPath id="frame"><rect width="${W}" height="${H}" rx="16"/></clipPath>
  <radialGradient id="glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(120 ${H + 20}) scale(420 200)">
    <stop stop-color="${c.accent}" stop-opacity="0.22"/><stop offset="1" stop-color="${c.accent}" stop-opacity="0"/>
  </radialGradient>
</defs>
<g clip-path="url(#frame)"><rect width="${W}" height="${H}" fill="${c.bg}"/><rect width="${W}" height="${H}" fill="url(#glow)"/></g>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="15.5" stroke="${c.border}"/>
<text class="label" x="40" y="48">GET IN TOUCH</text>
<text x="39" y="92" font-size="30" font-weight="600" letter-spacing="-0.03em">Got a project in mind?</text>
<text class="accent" x="${W - 62}" y="80" font-size="18" font-weight="600" text-anchor="end">Let’s talk</text>
${arrow(W - 52, 67, 11)}
<text class="label" x="${W - 40}" y="102" text-anchor="end" style="text-transform: none; letter-spacing: 0.04em">hello@karbon.cloud</text>
`;
  return svg(H, body);
}

async function fetchStats() {
  const ids = profile.games.map((g) => g.universeId).join(",");
  const res = await fetch(`https://games.roblox.com/v1/games?universeIds=${ids}`);
  if (!res.ok) throw new Error(`Roblox API returned ${res.status}`);
  const { data } = await res.json();
  const byId = new Map(data.map((g) => [g.id, g]));
  const games = profile.games.map((g) => {
    const live = byId.get(g.universeId);
    if (!live) throw new Error(`No stats returned for ${g.name}`);
    return { ...g, visits: live.visits, playing: live.playing, favourites: live.favoritedCount };
  });
  const sum = (k) => games.reduce((n, g) => n + g[k], 0);
  return { games, visits: sum("visits"), playing: sum("playing"), favourites: sum("favourites") };
}

const stats = await fetchStats();
mkdirSync(out, { recursive: true });
const write = (name, content) => writeFileSync(join(out, name), content);

write("hero.svg", hero({ ...stats, games: stats.games.length }));
write("bar-projects.svg", sectionBar("02", "Projects", "Open source on GitHub."));
write("featured.svg", featured());
profile.repos.forEach((r, i) => write(`repo-${r.repo}.svg`, repoRow(i + 1, r)));
write("bar-roblox.svg", sectionBar("03", "Roblox", "Games I’ve built and shipped."));
stats.games.filter((g) => g.featured).forEach((g, i) => write(`game-${g.slug.toLowerCase()}.svg`, gameRow(i, g)));
write("bar-experience.svg", sectionBar("04", "Experience", "Where I’ve worked."));
write("experience.svg", experience());
write("bar-tools.svg", sectionBar("05", "Stack", "What I build with."));
write("tools.svg", tools());
write("contact.svg", contact());

console.log(`visits ${full(stats.visits)} | playing ${full(stats.playing)} | favourites ${full(stats.favourites)}`);
