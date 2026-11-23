/* ==========================================================================
   LUMINA STUDIO — Custom Lerp Cursor, Trail, Spotlight Mask & Click Sparks
   ========================================================================== */

window.Lumina = window.Lumina || {};

(function (Lumina) {
  'use strict';

  function hexToRgba(hex, a) {
    if (!hex || typeof hex !== 'string') return `rgba(56, 189, 248, ${a})`;
    const c = hex.replace('#', '');
    const full = c.length === 3 ? c.split('').map(x => x + x).join('') : c.padEnd(6, '0').slice(0, 6);
    const n = parseInt(full, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }

  class CursorEngine {
    constructor(stageEl, fxCanvas, cursorEl) {
      this.stage = stageEl;
      this.canvas = fxCanvas;
      this.ctx = fxCanvas.getContext('2d');
      this.cursorEl = cursorEl;
      this.ringEl = cursorEl.querySelector('#cursor-ring');
      this.dotEl = cursorEl.querySelector('#cursor-dot');

      this.width = 1;
      this.height = 1;
      this.dpr = 1;

      this.rx = -100;
      this.ry = -100;
      this.lastX = -100;
      this.lastY = -100;
      this.inside = false;
      this.hoveringInteractive = false;

      this.trailPoints = [];
      this.particles = [];
      this.sparks = [];
      this.stateRef = null;

      this._bindEvents();
    }

    _bindEvents() {
      this.stage.addEventListener('pointerenter', () => {
        this.inside = true;
      });
      this.stage.addEventListener('pointerleave', () => {
        this.inside = false;
        this.cursorEl.classList.remove('visible');
      });
      this.stage.addEventListener('pointerover', (e) => {
        const hit = e.target.closest('[data-interactive="true"], button, a');
        this.hoveringInteractive = Boolean(hit);
        this.ringEl.classList.toggle('hovering', this.hoveringInteractive);
      });
      this.stage.addEventListener('pointerdown', (e) => {
        if (!this.stateRef || !this.stateRef.cursor.enabled || !this.stateRef.cursor.clickSparks) return;
        const rect = this.stage.getBoundingClientRect();
        this.spawnSparks(e.clientX - rect.left, e.clientY - rect.top, this.stateRef);
      });
    }

    resize(width, height) {
      this.width = Math.max(1, Math.floor(width));
      this.height = Math.max(1, Math.floor(height));
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.floor(this.width * this.dpr);
      this.canvas.height = Math.floor(this.height * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    spawnSparks(x, y, state) {
      const count = state.cursor.sparkCount || 16;
      const colors = [state.palette.c1, state.palette.c2, state.palette.c3, '#ffffff'];
      for (let i = 0; i < count; i++) {
        const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.35;
        const spd = 2.4 + Math.random() * 5.2;
        this.sparks.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          life: 1.0,
          decay: 0.028 + Math.random() * 0.02,
          len: 5 + Math.random() * 9,
          color: colors[i % colors.length]
        });
      }
    }

    applyState(state) {
      this.stateRef = state;
      const C = state.cursor;
      const useCustom = C.enabled && C.customCursor;
      this.stage.classList.toggle('hide-native-cursor', useCustom);
      if (!useCustom) {
        this.cursorEl.classList.remove('visible');
      }
    }

    render(dt, state, mouse) {
      this.stateRef = state;
      const C = state.cursor;
      const pal = state.palette;
      const ctx = this.ctx;

      ctx.clearRect(0, 0, this.width, this.height);

      if (!C.enabled) {
        this.cursorEl.classList.remove('visible');
        return;
      }

      // Smooth lerp ring position
      if (this.rx < -50) {
        this.rx = mouse.x;
        this.ry = mouse.y;
      } else {
        const k = Math.min(0.6, (C.lerp || 0.16) * (dt * 60));
        this.rx += (mouse.x - this.rx) * k;
        this.ry += (mouse.y - this.ry) * k;
      }

      // Custom Lerp Cursor DOM update
      if (C.customCursor && this.inside) {
        this.cursorEl.classList.add('visible');
        this.ringEl.style.transform = `translate3d(${this.rx.toFixed(1)}px, ${this.ry.toFixed(1)}px, 0)`;
        this.dotEl.style.transform = `translate3d(${mouse.x.toFixed(1)}px, ${mouse.y.toFixed(1)}px, 0)`;
      } else {
        this.cursorEl.classList.remove('visible');
      }

      // Optional Spotlight Mask (darkens stage outside cursor reveal portal)
      if (C.spotlightMask) {
        ctx.save();
        const rOuter = Math.max(this.width, this.height) * 0.65;
        const g = ctx.createRadialGradient(this.rx, this.ry, 55, this.rx, this.ry, 260);
        g.addColorStop(0, 'rgba(0, 0, 0, 0)');
        g.addColorStop(0.65, 'rgba(0, 0, 0, 0.45)');
        g.addColorStop(1, 'rgba(0, 0, 0, 0.82)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, this.width, this.height);
        // Subtle glowing ring around mask edge
        ctx.strokeStyle = hexToRgba(pal.c2, 0.25);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(this.rx, this.ry, 145, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Cursor Trail (Particles OR Luminous Comet Ribbon)
      const moved = Math.hypot(mouse.x - this.lastX, mouse.y - this.lastY);
      if (C.trail && this.inside && moved > 1.5) {
        if (C.trailStyle === 'ribbon') {
          this.trailPoints.push({ x: mouse.x, y: mouse.y, life: 1.0 });
          if (this.trailPoints.length > 28) this.trailPoints.shift();
        } else {
          const count = Math.min(3, Math.ceil(moved / 10));
          for (let i = 0; i < count; i++) {
            this.particles.push({
              x: mouse.x + (Math.random() - 0.5) * 6,
              y: mouse.y + (Math.random() - 0.5) * 6,
              vx: (Math.random() - 0.5) * 0.9,
              vy: (Math.random() - 0.5) * 0.9 - 0.25,
              r: 1.8 + Math.random() * 2.8,
              life: 1.0,
              color: Math.random() > 0.5 ? pal.c1 : pal.c2
            });
          }
        }
      }
      this.lastX = mouse.x;
      this.lastY = mouse.y;

      // Render Ribbon Trail
      if (this.trailPoints.length > 1) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (let i = 1; i < this.trailPoints.length; i++) {
          const p0 = this.trailPoints[i - 1];
          const p1 = this.trailPoints[i];
          const ratio = i / this.trailPoints.length;
          ctx.strokeStyle = hexToRgba(i % 2 === 0 ? pal.c2 : pal.c1, p1.life * ratio * 0.78);
          ctx.lineWidth = Math.max(1, ratio * 7.5 * p1.life);
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
        }
        ctx.restore();
      }
      for (let i = this.trailPoints.length - 1; i >= 0; i--) {
        this.trailPoints[i].life -= 0.055 * (dt * 60);
        if (this.trailPoints[i].life <= 0) this.trailPoints.splice(i, 1);
      }

      // Render Luminous Trail Particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx * (dt * 60);
        p.y += p.vy * (dt * 60);
        p.life -= 0.032 * (dt * 60);
        if (p.life <= 0) {
          this.particles.splice(i, 1);
          continue;
        }
        const rad = p.r * p.life * 2.4;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
        g.addColorStop(0, hexToRgba('#ffffff', p.life * 0.9));
        g.addColorStop(0.45, hexToRgba(p.color, p.life * 0.65));
        g.addColorStop(1, hexToRgba(p.color, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      // Render Click Sparks
      if (this.sparks.length > 0) {
        ctx.save();
        ctx.lineCap = 'round';
        for (let i = this.sparks.length - 1; i >= 0; i--) {
          const s = this.sparks[i];
          const prevX = s.x;
          const prevY = s.y;
          s.x += s.vx * (dt * 60);
          s.y += s.vy * (dt * 60);
          s.vx *= 0.93;
          s.vy *= 0.93;
          s.life -= s.decay * (dt * 60);
          if (s.life <= 0) {
            this.sparks.splice(i, 1);
            continue;
          }
          ctx.strokeStyle = hexToRgba(s.color, s.life);
          ctx.lineWidth = Math.max(1, s.life * 2.4);
          ctx.beginPath();
          ctx.moveTo(prevX, prevY);
          ctx.lineTo(s.x + s.vx * 1.6, s.y + s.vy * 1.6);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }

  Lumina.CursorEngine = CursorEngine;
})(window.Lumina);
