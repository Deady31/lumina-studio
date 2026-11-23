/* ==========================================================================
   LUMINA STUDIO — Typography & Kinetic Text Effects Engine
   ========================================================================== */

window.Lumina = window.Lumina || {};

(function (Lumina) {
  'use strict';

  const SCRAMBLE_GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/\\#$%@*+=?';

  class TextFXEngine {
    constructor(stageEl) {
      this.stage = stageEl;
      this.headlineBlock = stageEl.querySelector('#headline-block');
      this.headlineEl = stageEl.querySelector('#hero-headline');
      this.subtitleEl = stageEl.querySelector('#hero-subtitle');
      this.marqueeWrap = stageEl.querySelector('#marquee-wrap');
      this.marqueeTrack = stageEl.querySelector('#marquee-track');
      this.circularWrap = stageEl.querySelector('#circular-text-wrap');
      this.circularPath = stageEl.querySelector('#circular-text-path');

      this.scrambleTimer = null;
      this.lastSignature = '';
    }

    applyState(state, forceReplay = false) {
      const T = state.textfx;
      const root = document.documentElement;

      this.headlineBlock.style.display = T.enabled ? 'flex' : 'none';
      this.marqueeWrap.hidden = !(T.enabled && T.showMarquee);
      this.circularWrap.hidden = !(T.enabled && T.showCircular);

      if (!T.enabled) {
        this._clearScramble();
        return;
      }

      // Typography tokens
      const fontMap = {
        'Inter': "'Inter', sans-serif",
        'Space Grotesk': "'Space Grotesk', sans-serif",
        'Instrument Serif': "'Instrument Serif', Georgia, serif",
        'Syne': "'Syne', sans-serif",
        'JetBrains Mono': "'JetBrains Mono', monospace"
      };
      root.style.setProperty('--scene-font-display', fontMap[T.font] || fontMap.Inter);
      root.style.setProperty('--scene-headline-size', `${T.size}px`);
      root.style.setProperty('--scene-tracking', `${T.tracking}em`);

      this.subtitleEl.textContent = T.subtitle;

      // Update Circular Text (ensure clean spacing around the loop)
      if (T.showCircular && this.circularPath) {
        const raw = (T.circularText || 'LUMINA STUDIO • DESIGN ENGINEERING •').trim();
        this.circularPath.textContent = raw.endsWith('•') ? `${raw} ` : `${raw} • `;
      }

      // Update Kinetic Marquee
      if (T.showMarquee && this.marqueeTrack) {
        this._buildMarquee(T.marqueeText);
      }

      const sig = `${T.headline}|${T.effect}|${T.splitBy}|${state.motion.stagger}`;
      if (forceReplay || sig !== this.lastSignature) {
        this.lastSignature = sig;
        this._applyHeadlineEffect(state);
      }
    }

    replay(state) {
      this.applyState(state, true);
    }

    _clearScramble() {
      if (this.scrambleTimer) {
        clearInterval(this.scrambleTimer);
        this.scrambleTimer = null;
      }
    }

    _buildMarquee(rawText) {
      const clean = (rawText || 'LUMINA STUDIO • LIQUID GLASS • HOLOSPOT FOIL •').trim();
      const parts = clean.split(/[•|]/).map(s => s.trim()).filter(Boolean);
      const list = parts.length > 0 ? parts : ['LUMINA STUDIO', 'LIQUID GLASS', 'WEBGL2 SHADERS'];
      const itemsHtml = [];
      // Duplicate twice for seamless -50% CSS loop
      for (let copy = 0; copy < 2; copy++) {
        for (let rep = 0; rep < 2; rep++) {
          list.forEach((word, i) => {
            const cls = i % 2 === 1 ? 'marquee-item outline' : 'marquee-item';
            itemsHtml.push(`<span class="${cls}">${this._esc(word)}</span><span class="marquee-sep">✦</span>`);
          });
        }
      }
      this.marqueeTrack.innerHTML = itemsHtml.join('');
    }

    _esc(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    _applyHeadlineEffect(state) {
      this._clearScramble();
      const T = state.textfx;
      const el = this.headlineEl;
      const text = T.headline || 'Craft interfaces that feel alive.';

      el.classList.remove('textfx-shimmer', 'textfx-liquid', 'textfx-glitch');
      el.setAttribute('data-text', text);

      if (T.effect === 'split') {
        el.innerHTML = '';
        const stagger = state.motion.stagger || 38;
        if (T.splitBy === 'words') {
          const words = text.split(' ');
          words.forEach((word, idx) => {
            const span = document.createElement('span');
            span.className = 'split-word anim-enter';
            span.style.setProperty('--char-delay', `${idx * stagger * 1.8}ms`);
            span.textContent = word + (idx < words.length - 1 ? '\u00A0' : '');
            el.appendChild(span);
          });
        } else {
          // Split by words first to preserve clean line wrapping, then chars inside
          let charIdx = 0;
          const words = text.split(' ');
          words.forEach((word, wIdx) => {
            const wrap = document.createElement('span');
            wrap.style.display = 'inline-block';
            wrap.style.whiteSpace = 'nowrap';
            for (const ch of word) {
              const span = document.createElement('span');
              span.className = 'split-char anim-enter';
              span.style.setProperty('--char-delay', `${charIdx * stagger}ms`);
              span.textContent = ch;
              wrap.appendChild(span);
              charIdx++;
            }
            el.appendChild(wrap);
            if (wIdx < words.length - 1) {
              el.appendChild(document.createTextNode(' '));
            }
          });
        }
        return;
      }

      if (T.effect === 'shimmer') {
        el.textContent = text;
        el.classList.add('textfx-shimmer');
        return;
      }

      if (T.effect === 'liquid') {
        el.textContent = text;
        el.classList.add('textfx-liquid');
        return;
      }

      if (T.effect === 'glitch') {
        el.textContent = text;
        el.classList.add('textfx-glitch');
        return;
      }

      if (T.effect === 'scramble') {
        let iteration = 0;
        const speedMult = Math.max(0.4, state.motion.speed || 1);
        const step = 0.45 * speedMult;
        this.scrambleTimer = setInterval(() => {
          const out = text
            .split('')
            .map((ch, idx) => {
              if (ch === ' ') return ' ';
              if (idx < iteration) return text[idx];
              return SCRAMBLE_GLYPHS[(Math.random() * SCRAMBLE_GLYPHS.length) | 0];
            })
            .join('');
          el.textContent = out;
          iteration += step;
          if (iteration >= text.length) {
            el.textContent = text;
            this._clearScramble();
          }
        }, 28);
        return;
      }

      el.textContent = text;
    }
  }

  Lumina.TextFXEngine = TextFXEngine;
})(window.Lumina);
