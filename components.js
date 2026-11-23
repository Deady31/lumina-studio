/* ==========================================================================
   LUMINA STUDIO — Interactive UI Components Engine
   (Apple Liquid Glass, 3D Tilt + Holospot Foil, Bento Border Beam,
    Magnetic/Shimmer/Ripple Buttons, macOS Magnification Dock, Luminous Badge)
   ========================================================================== */

window.Lumina = window.Lumina || {};

(function (Lumina) {
  'use strict';

  const CARD_LABELS = {
    bento: 'Bento Border Beam',
    liquid: 'Apple Liquid Glass',
    holo: '3D Holospot Foil'
  };

  class ComponentsEngine {
    constructor(stageEl, onDockAction) {
      this.stage = stageEl;
      this.onDockAction = onDockAction;

      this.badgeWrap = stageEl.querySelector('#lumina-badge-wrap');
      this.badgeText = stageEl.querySelector('#badge-text');
      this.ctaRow = stageEl.querySelector('#cta-row');
      this.primaryBtn = stageEl.querySelector('#primary-cta');
      this.primaryBtnText = stageEl.querySelector('#primary-cta-text');
      this.secondaryBtn = stageEl.querySelector('#secondary-cta');

      this.showcaseArea = stageEl.querySelector('#showcase-area');
      this.card = stageEl.querySelector('#showcase-card');
      this.cardStyleLabel = stageEl.querySelector('#card-style-label');
      this.cardTitle = stageEl.querySelector('#card-title');
      this.cardDesc = stageEl.querySelector('#card-desc');

      this.dockWrap = stageEl.querySelector('#macos-dock-wrap');
      this.dock = stageEl.querySelector('#macos-dock');
      this.dockItems = Array.from(stageEl.querySelectorAll('.dock-item'));

      // SVG Liquid Glass dynamic point light
      this.lgLight = document.getElementById('lg-light');

      this.stateRef = null;
      this._bindInteractions();
    }

    applyState(state) {
      this.stateRef = state;
      const C = state.components;
      const root = document.documentElement;

      const enabled = C.enabled;
      this.badgeWrap.style.display = enabled && C.showBadge ? 'block' : 'none';
      this.ctaRow.style.display = enabled && C.showButtons ? 'flex' : 'none';
      this.showcaseArea.style.display = enabled && C.showCard ? 'flex' : 'none';
      this.dockWrap.style.display = enabled && C.showDock ? 'block' : 'none';

      if (!enabled) return;

      // Badge
      this.badgeText.textContent = C.badgeText;

      // Primary Button Style
      this.primaryBtnText.textContent = C.buttonText;
      this.primaryBtn.className = `lumina-btn btn-style-${C.buttonStyle}`;
      if (C.buttonStyle !== 'magnetic') {
        this.primaryBtn.style.transform = '';
      }

      // Card Style & Tokens
      this.card.className = `showcase-card card-style-${C.cardStyle}${C.cardStyle === 'liquid' && C.liquidRefract ? ' refract-on' : ''}`;
      this.cardStyleLabel.textContent = CARD_LABELS[C.cardStyle] || 'Premium Card';
      this.cardTitle.textContent = C.cardTitle;
      this.cardDesc.textContent = C.cardDesc;

      root.style.setProperty('--card-blur', `${C.cardBlur}px`);
      root.style.setProperty('--card-opacity', String(C.cardOpacity));
      root.style.setProperty('--card-radius', `${C.cardRadius}px`);
      root.style.setProperty('--card-glow', String(C.cardGlow));
      root.style.setProperty('--beam-speed', `${C.beamSpeed}s`);
      root.style.setProperty('--holo-intensity', String(C.holoIntensity));
    }

    _bindInteractions() {
      // 1. Showcase Card: 3D Tilt + Holospot Iridescent Foil + Bento Spotlight + Liquid Glass Specular
      this.card.addEventListener('pointermove', (e) => {
        if (!this.stateRef) return;
        const rect = this.card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const px = x / rect.width;
        const py = y / rect.height;

        this.card.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
        this.card.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);

        // Holospot rainbow foil shift
        this.card.style.setProperty('--holo-x', `${(px * 100).toFixed(1)}%`);
        this.card.style.setProperty('--holo-y', `${(py * 100).toFixed(1)}%`);

        // Update SVG specular light for Apple Liquid Glass
        if (this.lgLight && this.stateRef.components.cardStyle === 'liquid') {
          this.lgLight.setAttribute('x', String(Math.round(x)));
          this.lgLight.setAttribute('y', String(Math.round(y)));
        }

        // Smooth 3D perspective tilt
        const maxTilt = this.stateRef.components.tiltStrength || 12;
        if (maxTilt > 0) {
          const rotY = (px - 0.5) * maxTilt * 2;
          const rotX = (0.5 - py) * maxTilt * 2;
          this.card.style.transform = `rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateZ(6px)`;
        }
      });

      this.card.addEventListener('pointerleave', () => {
        this.card.style.transform = 'rotateX(0deg) rotateY(0deg) translateZ(0px)';
        this.card.style.setProperty('--mx', '50%');
        this.card.style.setProperty('--my', '50%');
      });

      // 2. Primary CTA Button: Magnetic pull + Liquid Ripple
      this.primaryBtn.addEventListener('pointermove', (e) => {
        if (!this.stateRef || this.stateRef.components.buttonStyle !== 'magnetic') return;
        const rect = this.primaryBtn.getBoundingClientRect();
        const dx = (e.clientX - (rect.left + rect.width / 2)) * 0.32;
        const dy = (e.clientY - (rect.top + rect.height / 2)) * 0.38;
        this.primaryBtn.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) scale(1.03)`;
      });

      this.primaryBtn.addEventListener('pointerleave', () => {
        this.primaryBtn.style.transform = '';
      });

      this.primaryBtn.addEventListener('click', (e) => {
        this._spawnRipple(this.primaryBtn, e);
      });

      this.secondaryBtn.addEventListener('click', () => {
        if (this.onDockAction) this.onDockAction('background');
      });

      // 3. macOS Interactive Dock: Smooth Gaussian Magnification Physics
      this.dock.addEventListener('pointermove', (e) => {
        const mouseX = e.clientX;
        this.dockItems.forEach((item) => {
          const rect = item.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const dist = Math.abs(mouseX - centerX);
          const sigma = 72;
          const mag = Math.exp(-(dist * dist) / (2 * sigma * sigma));
          const scale = 1 + mag * 0.56;
          const lift = mag * -11;
          item.style.transform = `translateY(${lift.toFixed(1)}px) scale(${scale.toFixed(3)})`;
        });
      });

      this.dock.addEventListener('pointerleave', () => {
        this.dockItems.forEach((item) => {
          item.style.transform = 'translateY(0px) scale(1)';
        });
      });

      this.dockItems.forEach((item) => {
        item.addEventListener('click', () => {
          const action = item.dataset.dockAction;
          // Tactile bounce
          item.animate(
            [
              { transform: 'translateY(-10px) scale(1.38)' },
              { transform: 'translateY(-22px) scale(1.48)' },
              { transform: 'translateY(-6px) scale(1.22)' }
            ],
            { duration: 340, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
          );
          if (this.onDockAction && action) {
            this.onDockAction(action);
          }
        });
      });
    }

    _spawnRipple(btn, e) {
      const rect = btn.getBoundingClientRect();
      const wave = document.createElement('span');
      wave.className = 'ripple-wave';
      const size = Math.max(rect.width, rect.height) * 0.8;
      wave.style.width = `${size}px`;
      wave.style.height = `${size}px`;
      wave.style.left = `${e.clientX - rect.left}px`;
      wave.style.top = `${e.clientY - rect.top}px`;
      btn.appendChild(wave);
      setTimeout(() => wave.remove(), 750);
    }
  }

  Lumina.ComponentsEngine = ComponentsEngine;
})(window.Lumina);
