/* ==========================================================================
   LUMINA STUDIO — Atmospheric Lighting, Spotlights, Orbs, Grain & Vignette
   ========================================================================== */

window.Lumina = window.Lumina || {};

(function (Lumina) {
  'use strict';

  function hexToRgba(hex, a) {
    if (!hex || typeof hex !== 'string') return `rgba(129, 140, 248, ${a})`;
    const c = hex.replace('#', '');
    const full = c.length === 3 ? c.split('').map(x => x + x).join('') : c.padEnd(6, '0').slice(0, 6);
    const n = parseInt(full, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }

  class LightingEngine {
    constructor(layerEl) {
      this.layer = layerEl;
      this.spotLeft = layerEl.querySelector('.spot-left');
      this.spotRight = layerEl.querySelector('.spot-right');
      this.orbs = Array.from(layerEl.querySelectorAll('.ambient-orb'));
      this.cursorSpot = layerEl.querySelector('#cursor-spotlight');
      this.lensGlow = layerEl.querySelector('#lens-glow');
      this.grainCanvas = layerEl.querySelector('#grain-canvas');
      this.grainCtx = this.grainCanvas.getContext('2d');
      this.vignette = layerEl.querySelector('#vignette-overlay');

      // Lightweight 160x160 procedural 35mm film grain tile stretched smoothly
      this.grainCanvas.width = 180;
      this.grainCanvas.height = 180;
      this.grainImg = this.grainCtx.createImageData(180, 180);
      this.lastGrainFrame = 0;

      // Smooth cursor spot coords
      this.cx = -999;
      this.cy = -999;
    }

    applyState(state) {
      const L = state.lighting;
      const pal = state.palette;
      const blend = L.blendMode || 'screen';

      this.layer.style.display = L.enabled ? 'block' : 'none';
      if (!L.enabled) return;

      // Hero Spotlights
      const spotVis = L.spotlights ? L.spotIntensity : 0;
      this.spotLeft.style.opacity = String(spotVis);
      this.spotRight.style.opacity = String(spotVis);
      this.spotLeft.style.mixBlendMode = blend;
      this.spotRight.style.mixBlendMode = blend;

      // Ambient Orbs
      this.orbs.forEach(orb => {
        orb.style.opacity = L.orbs ? String(L.orbOpacity) : '0';
        orb.style.filter = `blur(${L.orbBlur}px)`;
        orb.style.mixBlendMode = blend;
      });

      // Cursor Spotlight
      this.cursorSpot.style.display = L.cursorSpot ? 'block' : 'none';
      this.cursorSpot.style.width = `${L.cursorRadius}px`;
      this.cursorSpot.style.height = `${L.cursorRadius}px`;
      this.cursorSpot.style.mixBlendMode = blend;
      this.cursorSpot.style.background = `radial-gradient(circle, ${hexToRgba(pal.c1, L.cursorIntensity)} 0%, ${hexToRgba(pal.c2, L.cursorIntensity * 0.32)} 40%, transparent 72%)`;

      // Lens Glow
      this.lensGlow.style.opacity = L.lensGlow ? String(L.lensIntensity) : '0';
      this.lensGlow.style.mixBlendMode = blend;

      // Film Grain
      this.grainCanvas.style.display = L.grain ? 'block' : 'none';
      this.grainCanvas.style.opacity = String(L.grainOpacity);

      // Vignette / Radial Mask
      this.vignette.style.display = L.vignette ? 'block' : 'none';
      const vigCol = state.theme === 'light'
        ? `rgba(40, 28, 12, ${L.vignetteStrength * 0.55})`
        : `rgba(0, 0, 0, ${L.vignetteStrength})`;
      this.vignette.style.background = `radial-gradient(circle at 50% 48%, transparent 36%, ${vigCol} 100%)`;
    }

    update(timeMs, state, mouse) {
      const L = state.lighting;
      if (!L.enabled) return;

      // Smooth cursor spotlight tracking
      if (L.cursorSpot) {
        if (this.cx < -500) {
          this.cx = mouse.x;
          this.cy = mouse.y;
        } else {
          this.cx += (mouse.x - this.cx) * 0.14;
          this.cy += (mouse.y - this.cy) * 0.14;
        }
        const half = L.cursorRadius * 0.5;
        this.cursorSpot.style.transform = `translate3d(${(this.cx - half).toFixed(1)}px, ${(this.cy - half).toFixed(1)}px, 0)`;
      }

      // Lens glow subtle horizontal parallax
      if (L.lensGlow) {
        const px = (mouse.nx - 0.5) * 48;
        const py = (mouse.ny - 0.5) * 20;
        this.lensGlow.style.transform = `translate3d(calc(-50% + ${px.toFixed(1)}px), ${py.toFixed(1)}px, 0)`;
      }

      // Cinematic 24 FPS animated film grain
      if (L.grain && timeMs - this.lastGrainFrame > 42) {
        this.lastGrainFrame = timeMs;
        const data = this.grainImg.data;
        for (let i = 0; i < data.length; i += 4) {
          const v = (Math.random() * 255) | 0;
          data[i] = v;
          data[i + 1] = v;
          data[i + 2] = v;
          data[i + 3] = 255;
        }
        this.grainCtx.putImageData(this.grainImg, 0, 0);
      }
    }
  }

  Lumina.LightingEngine = LightingEngine;
})(window.Lumina);
