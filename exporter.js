/* ==========================================================================
   LUMINA STUDIO — Production Code Exporter, Syntax Highlighter & Media Capture
   ========================================================================== */

window.Lumina = window.Lumina || {};

(function (Lumina) {
  'use strict';

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function getEasingCss(motion) {
    switch (motion.easing) {
      case 'expo': return 'cubic-bezier(0.16, 1, 0.3, 1)';
      case 'quart': return 'cubic-bezier(0.25, 1, 0.5, 1)';
      case 'back': return 'cubic-bezier(0.34, 1.56, 0.64, 1)';
      case 'linear': return 'linear';
      case 'spring':
      default: {
        // Approximate overshoot from stiffness/damping ratio
        const zeta = motion.damping / (2 * Math.sqrt(motion.stiffness * (motion.mass || 1)));
        if (zeta < 0.7) return 'cubic-bezier(0.22, 1.35, 0.36, 1)';
        if (zeta < 1.0) return 'cubic-bezier(0.18, 1.12, 0.32, 1)';
        return 'cubic-bezier(0.16, 1, 0.3, 1)';
      }
    }
  }

  /* ---- 1. CSS Design Tokens Generator ---- */
  function generateTokens(state, scope, activeModule) {
    const p = state.palette;
    const c = state.components;
    const m = state.motion;
    const ease = getEasingCss(m);

    return `/* ============================================================
   Lumina Studio — Design Tokens & CSS Variables
   Preset: ${state.presetId} | Scope: ${scope === 'module' ? activeModule : 'full-scene'}
   ============================================================ */

@property --beam-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

:root {
  /* Color Palette */
  --lumina-bg: ${p.bg};
  --lumina-primary: ${p.c1};
  --lumina-secondary: ${p.c2};
  --lumina-accent: ${p.c3};
  --lumina-highlight: ${p.c4};
  --lumina-text: ${p.text};
  --lumina-text-muted: ${p.textMuted};

  /* Typography */
  --lumina-font-display: '${state.textfx.font}', system-ui, sans-serif;
  --lumina-headline-size: ${state.textfx.size}px;
  --lumina-tracking: ${state.textfx.tracking}em;

  /* Glass & Surface Material (${c.cardStyle}) */
  --lumina-card-blur: ${c.cardBlur}px;
  --lumina-card-opacity: ${c.cardOpacity};
  --lumina-card-radius: ${c.cardRadius}px;
  --lumina-card-glow: ${c.cardGlow};
  --lumina-holo-intensity: ${c.holoIntensity};
  --lumina-beam-duration: ${(c.beamSpeed / m.speed).toFixed(2)}s;

  /* Lighting & Atmosphere */
  --lumina-orb-blur: ${state.lighting.orbBlur}px;
  --lumina-orb-opacity: ${state.lighting.orbOpacity};
  --lumina-grain-opacity: ${state.lighting.grainOpacity};
  --lumina-vignette: ${state.lighting.vignetteStrength};

  /* Motion Lab Physics */
  --lumina-speed: ${m.speed};
  --lumina-ease: ${ease};
  --lumina-stagger: ${m.stagger}ms;
  /* Spring Reference -> stiffness: ${m.stiffness}, damping: ${m.damping}, mass: ${m.mass} */
}

/* Reusable Utility Keyframes */
@keyframes lumina-beam-spin {
  to { --beam-angle: 360deg; }
}

@keyframes lumina-shimmer {
  0% { background-position: 140% 50%; }
  100% { background-position: -100% 50%; }
}

@keyframes lumina-liquid-flow {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

@keyframes lumina-split-reveal {
  from { opacity: 0; transform: translateY(22px); filter: blur(11px); }
  to { opacity: 1; transform: translateY(0); filter: blur(0); }
}`;
  }

  /* ---- 2. Minimal Standalone HTML / CSS / JS Generator ---- */
  function generateBackgroundSnippetJS(state) {
    const bg = state.background;
    const p = state.palette;
    return `  // Lumina Background Engine (${bg.type}${bg.type === 'grid' ? ' · ' + bg.gridStyle : bg.type === 'dither' ? ' · ' + bg.ditherStyle : ''})
  const canvas = document.getElementById('lumina-bg');
  const ctx = canvas.getContext('2d');
  let w, h, mx = 0.5, my = 0.5;
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  addEventListener('resize', resize); resize();
  addEventListener('pointermove', e => { mx = e.clientX / w; my = e.clientY / h; });
  const colors = ['${p.c1}', '${p.c2}', '${p.c3}', '${p.c4}'];
  function frame(now) {
    const t = now * 0.001 * ${(bg.speed * state.motion.speed).toFixed(2)};
    ctx.fillStyle = '${p.bg}';
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    colors.forEach((col, i) => {
      const cx = w * (0.5 + 0.32 * Math.sin(t * 0.45 + i * 1.7) + (mx - 0.5) * ${(bg.mouseReactivity * 0.16).toFixed(2)});
      const cy = h * (0.5 + 0.28 * Math.cos(t * 0.38 + i * 2.1) + (my - 0.5) * ${(bg.mouseReactivity * 0.16).toFixed(2)});
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.52);
      g.addColorStop(0, col + '99');
      g.addColorStop(1, col + '00');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
    ctx.restore();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);`;
  }

  function generateHTML(state, scope, activeModule) {
    const p = state.palette;
    const c = state.components;
    const t = state.textfx;
    const l = state.lighting;
    const m = state.motion;
    const ease = getEasingCss(m);

    if (scope === 'module') {
      if (activeModule === 'components') {
        return `<!-- Lumina Studio — ${c.cardStyle.toUpperCase()} Card + ${c.buttonStyle} Button -->
<style>
  @property --beam-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
  .lumina-card {
    position: relative; width: 420px; padding: 1.5px; border-radius: ${c.cardRadius}px;
    background: rgba(255,255,255,0.1); overflow: hidden; color: ${p.text};
    font-family: '${t.font}', system-ui, sans-serif; transition: transform 0.22s ${ease};
    transform-style: preserve-3d;
  }
  ${c.cardStyle === 'bento' ? `.lumina-card::before {
    content: ''; position: absolute; inset: -60%;
    background: conic-gradient(from var(--beam-angle), transparent 250deg, ${p.c1} 300deg, ${p.c2} 340deg, #fff 356deg, transparent 360deg);
    animation: spinBeam ${(c.beamSpeed / m.speed).toFixed(2)}s linear infinite;
  }` : ''}
  .lumina-card-inner {
    position: relative; z-index: 2; padding: 24px; border-radius: ${Math.max(2, c.cardRadius - 2)}px;
    background: ${c.cardStyle === 'liquid'
      ? `linear-gradient(145deg, rgba(255,255,255,${(c.cardOpacity * 0.95).toFixed(2)}), rgba(255,255,255,${(c.cardOpacity * 0.35).toFixed(2)}))`
      : `rgba(12, 14, 22, 0.84)`};
    backdrop-filter: blur(${c.cardBlur}px) saturate(180%);
  }
  ${c.cardStyle === 'holo' ? `.lumina-foil {
    position: absolute; inset: 0; z-index: 4; pointer-events: none; mix-blend-mode: color-dodge;
    opacity: ${(c.holoIntensity * 0.65).toFixed(2)};
    background: repeating-linear-gradient(128deg, #ff008077 0%, #ffd60077 18%, #00ffc677 36%, #38bdf877 54%, #a855f777 72%);
    background-size: 250% 250%; background-position: var(--mx, 50%) var(--my, 50%);
  }` : ''}
  @keyframes spinBeam { to { --beam-angle: 360deg; } }
</style>

<div class="lumina-card" id="luminaCard">
  ${c.cardStyle === 'holo' ? '<div class="lumina-foil"></div>' : ''}
  <div class="lumina-card-inner">
    <h3 style="margin:0 0 8px;font-size:18px;">${escHtml(c.cardTitle)}</h3>
    <p style="margin:0;opacity:0.75;font-size:13px;line-height:1.5;">${escHtml(c.cardDesc)}</p>
  </div>
</div>

<script>
  const card = document.getElementById('luminaCard');
  card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    card.style.setProperty('--mx', (px * 100) + '%');
    card.style.setProperty('--my', (py * 100) + '%');
    card.style.transform = \`perspective(1000px) rotateX(\${((0.5 - py) * ${c.tiltStrength * 2}).toFixed(1)}deg) rotateY(\${((px - 0.5) * ${c.tiltStrength * 2}).toFixed(1)}deg)\`;
  });
  card.addEventListener('pointerleave', () => { card.style.transform = ''; });
</script>`;
      }

      if (activeModule === 'textfx') {
        return `<!-- Lumina Studio — Typography FX (${t.effect}) -->
<style>
  .lumina-headline {
    font-family: '${t.font}', system-ui, sans-serif;
    font-size: clamp(32px, 5vw, ${t.size}px);
    font-weight: 700; letter-spacing: ${t.tracking}em; color: ${p.text};
    ${t.effect === 'liquid' ? `background: linear-gradient(120deg, ${p.c1}, ${p.c2}, ${p.c3}, ${p.c4}, ${p.c1});
    background-size: 300% 300%; -webkit-background-clip: text; color: transparent;
    animation: luminaLiquid ${(6 / m.speed).toFixed(2)}s ease infinite;` : ''}
    ${t.effect === 'shimmer' ? `background: linear-gradient(110deg, #94a3b8 25%, #fff 48%, ${p.c2} 52%, #94a3b8 75%);
    background-size: 240% 100%; -webkit-background-clip: text; color: transparent;
    animation: luminaShimmer ${(3.2 / m.speed).toFixed(2)}s linear infinite;` : ''}
  }
  .lumina-char { display: inline-block; opacity: 0; filter: blur(11px); transform: translateY(20px); animation: charIn 0.75s ${ease} forwards; }
  @keyframes charIn { to { opacity: 1; filter: blur(0); transform: translateY(0); } }
  @keyframes luminaLiquid { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
  @keyframes luminaShimmer { 0% { background-position: 140% 50%; } 100% { background-position: -100% 50%; } }
</style>

<h1 class="lumina-headline" id="luminaTitle">${escHtml(t.headline)}</h1>
${t.effect === 'split' ? `<script>
  const el = document.getElementById('luminaTitle');
  const txt = el.textContent; el.textContent = '';
  [...txt].forEach((ch, i) => {
    const s = document.createElement('span');
    s.className = 'lumina-char';
    s.style.animationDelay = (i * ${m.stagger}) + 'ms';
    s.textContent = ch === ' ' ? '\\u00A0' : ch;
    el.appendChild(s);
  });
</script>` : ''}`;
      }
    }

    // Full standalone scene HTML
    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Lumina Export — ${state.presetId}</title>
<style>
  @property --beam-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
  :root {
    --bg: ${p.bg}; --c1: ${p.c1}; --c2: ${p.c2}; --c3: ${p.c3}; --c4: ${p.c4};
    --text: ${p.text}; --muted: ${p.textMuted};
    --ease: ${ease};
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    min-height: 100vh; display: grid; place-items: center; overflow: hidden;
    background: var(--bg); color: var(--text); font-family: '${t.font}', system-ui, sans-serif;
  }
  #lumina-bg { position: fixed; inset: 0; width: 100%; height: 100%; z-index: 0; opacity: ${state.background.enabled ? state.background.opacity : 0}; }
  .orb { position: fixed; border-radius: 50%; filter: blur(${l.orbBlur}px); mix-blend-mode: ${l.blendMode}; opacity: ${l.enabled && l.orbs ? l.orbOpacity : 0}; pointer-events: none; z-index: 1; }
  .orb-1 { width: 420px; height: 420px; top: 5%; left: 12%; background: radial-gradient(circle, var(--c1), transparent 70%); }
  .orb-2 { width: 380px; height: 380px; bottom: 8%; right: 10%; background: radial-gradient(circle, var(--c2), transparent 70%); }
  .hero { position: relative; z-index: 5; max-width: 740px; padding: 32px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 18px; }
  .badge {
    display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 99px;
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14); font-size: 12px; backdrop-filter: blur(12px);
  }
  .headline {
    font-size: clamp(32px, 5vw, ${t.size}px); font-weight: 700; line-height: 1.06; letter-spacing: ${t.tracking}em;
    ${t.effect === 'liquid' ? 'background: linear-gradient(120deg, var(--c1), var(--c2), var(--c3), var(--c4)); background-size: 300% 300%; -webkit-background-clip: text; color: transparent; animation: flow 6s ease infinite;' : ''}
    ${t.effect === 'shimmer' ? 'background: linear-gradient(110deg, #94a3b8 25%, #fff 48%, var(--c2) 52%, #94a3b8 75%); background-size: 240% 100%; -webkit-background-clip: text; color: transparent; animation: shimmer 3.2s linear infinite;' : ''}
  }
  .subtitle { font-size: 15px; line-height: 1.55; color: var(--muted); max-width: 52ch; }
  .card {
    position: relative; width: min(440px, 100%); padding: 1.5px; border-radius: ${c.cardRadius}px;
    background: rgba(255,255,255,0.12); overflow: hidden; margin-top: 8px; transition: transform 0.22s var(--ease);
  }
  .card::before {
    content: ''; position: absolute; inset: -60%;
    background: conic-gradient(from var(--beam-angle), transparent 250deg, var(--c1) 300deg, var(--c2) 340deg, #fff 356deg, transparent 360deg);
    animation: spinBeam ${(c.beamSpeed / m.speed).toFixed(2)}s linear infinite;
    display: ${c.cardStyle === 'bento' ? 'block' : 'none'};
  }
  .card-inner {
    position: relative; z-index: 2; padding: 22px; text-align: left; border-radius: ${Math.max(2, c.cardRadius - 2)}px;
    background: rgba(12, 14, 22, ${c.cardStyle === 'liquid' ? c.cardOpacity : 0.82});
    backdrop-filter: blur(${c.cardBlur}px) saturate(180%);
  }
  @keyframes spinBeam { to { --beam-angle: 360deg; } }
  @keyframes flow { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
  @keyframes shimmer { 0% { background-position: 140% 50%; } 100% { background-position: -100% 50%; } }
</style>
</head>
<body>
  <canvas id="lumina-bg"></canvas>
  <div class="orb orb-1"></div>
  <div class="orb orb-2"></div>

  <main class="hero">
    ${c.showBadge ? `<div class="badge">${escHtml(c.badgeText)}</div>` : ''}
    ${t.enabled ? `<h1 class="headline">${escHtml(t.headline)}</h1>
    <p class="subtitle">${escHtml(t.subtitle)}</p>` : ''}
    ${c.showCard ? `<div class="card" id="card">
      <div class="card-inner">
        <h3 style="margin-bottom:6px;font-size:17px;">${escHtml(c.cardTitle)}</h3>
        <p style="font-size:13px;color:var(--muted);line-height:1.5;">${escHtml(c.cardDesc)}</p>
      </div>
    </div>` : ''}
  </main>

<script>
${generateBackgroundSnippetJS(state)}

  // Interactive 3D Tilt & Spotlight
  const card = document.getElementById('card');
  if (card) {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      card.style.transform = \`perspective(1000px) rotateX(\${((0.5 - py) * ${c.tiltStrength * 2}).toFixed(1)}deg) rotateY(\${((px - 0.5) * ${c.tiltStrength * 2}).toFixed(1)}deg)\`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  }
</script>
</body>
</html>`;
  }

  /* ---- 3. React + Tailwind CSS Generator ---- */
  function generateReact(state, scope, activeModule) {
    const p = state.palette;
    const c = state.components;
    const t = state.textfx;
    const l = state.lighting;
    const m = state.motion;

    return `import React, { useRef, useState } from 'react';

/**
 * Generated by Lumina Studio
 * Preset: ${state.presetId} | Scope: ${scope === 'module' ? activeModule : 'Full Scene'}
 * Background: ${state.background.type} | Card: ${c.cardStyle} | TextFX: ${t.effect}
 */
export function LuminaHero() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, mx: 50, my: 50 });

  const handleCardMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    setTilt({
      rx: (0.5 - py) * ${c.tiltStrength * 2},
      ry: (px - 0.5) * ${c.tiltStrength * 2},
      mx: px * 100,
      my: py * 100,
    });
  };

  return (
    <section
      className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center px-6 py-16 text-center"
      style={{ backgroundColor: '${p.bg}', color: '${p.text}' }}
    >
      {/* Atmospheric Orbs */}
      ${l.orbs ? `<div
        className="pointer-events-none absolute -top-24 left-1/4 h-[420px] w-[420px] rounded-full mix-blend-screen"
        style={{
          background: 'radial-gradient(circle, ${p.c1}, transparent 70%)',
          filter: 'blur(${l.orbBlur}px)',
          opacity: ${l.orbOpacity},
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-24 right-1/4 h-[380px] w-[380px] rounded-full mix-blend-screen"
        style={{
          background: 'radial-gradient(circle, ${p.c2}, transparent 70%)',
          filter: 'blur(${l.orbBlur}px)',
          opacity: ${l.orbOpacity},
        }}
      />` : '{/* Orbs disabled */}'}

      <div className="relative z-10 flex max-w-3xl flex-col items-center gap-5">
        {/* Luminous Pill */}
        ${c.showBadge ? `<div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium backdrop-blur-md">
          <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: '${p.c2}' }} />
          <span>${c.badgeText.replace(/'/g, "\\'")}</span>
        </div>` : ''}

        {/* Headline (${t.effect}) */}
        <h1
          className="font-bold tracking-tight text-balance"
          style={{
            fontFamily: "'${t.font}', sans-serif",
            fontSize: 'clamp(2rem, 5vw, ${t.size}px)',
            letterSpacing: '${t.tracking}em',
            ${t.effect === 'liquid' || t.effect === 'shimmer'
              ? `backgroundImage: 'linear-gradient(120deg, ${p.c1}, ${p.c2}, ${p.c3})',
            WebkitBackgroundClip: 'text',
            color: 'transparent',`
              : ''}
          }}
        >
          ${t.headline}
        </h1>

        <p className="max-w-xl text-sm leading-relaxed opacity-75">
          ${t.subtitle}
        </p>

        {/* Interactive Showcase Card (${c.cardStyle}) */}
        <div
          ref={cardRef}
          onPointerMove={handleCardMove}
          onPointerLeave={() => setTilt({ rx: 0, ry: 0, mx: 50, my: 50 })}
          className="relative mt-4 w-full max-w-md overflow-hidden p-[1.5px] transition-transform duration-200 ease-out"
          style={{
            borderRadius: '${c.cardRadius}px',
            transform: \`perspective(1000px) rotateX(\${tilt.rx}deg) rotateY(\${tilt.ry}deg)\`,
            background: 'linear-gradient(135deg, ${p.c1}66, rgba(255,255,255,0.12), ${p.c2}66)',
          }}
        >
          {/* Internal Cursor Spotlight */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: \`radial-gradient(280px circle at \${tilt.mx}% \${tilt.my}%, ${p.c1}44, transparent 70%)\`,
            }}
          />
          <div
            className="relative z-10 flex flex-col gap-2 p-6 text-left"
            style={{
              borderRadius: '${Math.max(2, c.cardRadius - 2)}px',
              backgroundColor: 'rgba(12, 14, 22, ${c.cardStyle === 'liquid' ? c.cardOpacity : 0.82})',
              backdropFilter: 'blur(${c.cardBlur}px) saturate(180%)',
            }}
          >
            <h3 className="text-base font-semibold">${c.cardTitle}</h3>
            <p className="text-xs leading-relaxed opacity-75">${c.cardDesc}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// Motion Spring Config -> { stiffness: ${m.stiffness}, damping: ${m.damping}, mass: ${m.mass} }`;
  }

  /* ---- Zero-Dependency Lightweight Syntax Highlighter ---- */
  function highlightCode(code, format) {
    const escaped = escHtml(code);
    const pattern = format === 'tokens'
      ? /(\/\*[\s\S]*?\*\/)|(--[a-zA-Z0-9-]+)|(@[a-zA-Z-]+)|(\b\d+(?:\.\d+)?(?:px|deg|ms|s|em|%|vh|vw)?\b)|('[^']*'|#[0-9a-fA-F]{3,8})/g
      : /(\/\*[\s\S]*?\*\/|&lt;!--[\s\S]*?--&gt;|\/\/[^\n]*)|(&quot;[^&]*?&quot;|'[^']*?'|`[^`]*?`)|(&lt;\/?[a-zA-Z0-9-]+)|(\b(?:const|let|var|function|return|import|export|from|if|else|new|true|false|null|async|await)\b)|(\b\d+(?:\.\d+)?(?:px|deg|ms|s|em|%)?\b)/g;

    return escaped.replace(pattern, (match, comment, g2, g3, g4, g5) => {
      if (comment) return `<span class="tok-comment">${comment}</span>`;
      if (format === 'tokens') {
        if (g2) return `<span class="tok-prop">${g2}</span>`;
        if (g3) return `<span class="tok-keyword">${g3}</span>`;
        if (g4) return `<span class="tok-number">${g4}</span>`;
        if (g5) return `<span class="tok-string">${g5}</span>`;
        return match;
      }
      if (g2) return `<span class="tok-string">${g2}</span>`;
      if (g3) return `<span class="tok-tag">${g3}</span>`;
      if (g4) return `<span class="tok-keyword">${g4}</span>`;
      if (g5) return `<span class="tok-number">${g5}</span>`;
      return match;
    });
  }

  /* ---- Export Code Entry Point ---- */
  function generateCode(state, format, scope, activeModule) {
    if (format === 'react') {
      return {
        filename: scope === 'module' ? `Lumina_${activeModule}.tsx` : 'LuminaHero.tsx',
        raw: generateReact(state, scope, activeModule)
      };
    }
    if (format === 'tokens') {
      return {
        filename: 'lumina-tokens.css',
        raw: generateTokens(state, scope, activeModule)
      };
    }
    return {
      filename: scope === 'module' ? `lumina-${activeModule}.html` : 'lumina-scene.html',
      raw: generateHTML(state, scope, activeModule)
    };
  }

  /* ---- Media Capture: PNG Snapshot & WebM Clip Recorder ---- */
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function exportJSON(state) {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `lumina-studio-${state.presetId || 'scene'}.json`);
  }

  function snapshotPNG(bgCanvas, fxCanvas, state) {
    const out = document.createElement('canvas');
    out.width = bgCanvas.width;
    out.height = bgCanvas.height;
    const ctx = out.getContext('2d');
    ctx.fillStyle = state.palette.bg;
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(bgCanvas, 0, 0);
    if (fxCanvas) ctx.drawImage(fxCanvas, 0, 0);

    // Stamp crisp headline preview onto snapshot if enabled
    if (state.textfx.enabled && state.atelier !== 'shader') {
      ctx.save();
      const dpr = out.width / Math.max(1, bgCanvas.clientWidth);
      ctx.fillStyle = state.palette.text;
      ctx.font = `700 ${Math.round(state.textfx.size * dpr * 0.85)}px "${state.textfx.font}", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 24 * dpr;
      ctx.fillText(state.textfx.headline, out.width * 0.5, out.height * 0.45, out.width * 0.84);
      ctx.restore();
    }

    out.toBlob((blob) => {
      if (blob) downloadBlob(blob, `lumina-snapshot-${Date.now()}.png`);
    }, 'image/png');
  }

  function recordWebMClip(bgCanvas, fxCanvas, durationMs, onStateChange) {
    if (typeof MediaRecorder === 'undefined') {
      onStateChange('error', 'MediaRecorder non supporté sur ce navigateur.');
      return;
    }

    const comp = document.createElement('canvas');
    comp.width = bgCanvas.width;
    comp.height = bgCanvas.height;
    const ctx = comp.getContext('2d');

    let active = true;
    function pump() {
      if (!active) return;
      ctx.clearRect(0, 0, comp.width, comp.height);
      ctx.drawImage(bgCanvas, 0, 0);
      if (fxCanvas) ctx.drawImage(fxCanvas, 0, 0);
      requestAnimationFrame(pump);
    }
    pump();

    const stream = comp.captureStream(60);
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    const chunks = [];
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6000000 });
    rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
    rec.onstop = () => {
      active = false;
      const blob = new Blob(chunks, { type: 'video/webm' });
      downloadBlob(blob, `lumina-clip-${Date.now()}.webm`);
      onStateChange('done', 'Clip WebM téléchargé !');
    };

    onStateChange('recording', 'Enregistrement du clip (4s)…');
    rec.start();
    setTimeout(() => {
      if (rec.state === 'recording') rec.stop();
    }, durationMs || 4000);
  }

  Lumina.Exporter = {
    generateCode,
    highlightCode,
    exportJSON,
    snapshotPNG,
    recordWebMClip,
    downloadBlob,
    getEasingCss
  };
})(window.Lumina);
