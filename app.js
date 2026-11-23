/* ==========================================================================
   LUMINA STUDIO — Main Application Controller, Inspector UI & 60 FPS Loop
   ========================================================================== */

(function (Lumina) {
  'use strict';

  const MODULE_META = {
    background: { title: 'Fond Animé', subtitle: 'Shaders WebGL2 & Canvas 2D' },
    lighting: { title: 'Lumières & Atmosphère', subtitle: 'Spotlights, Orbs, Grain & Vignette' },
    textfx: { title: 'Typographie & Texte', subtitle: 'Split-Text, Shimmer, Glitch & Marquee' },
    components: { title: 'Composants UI & Cartes', subtitle: 'Liquid Glass, Holospot 3D & Border Beam' },
    cursor: { title: 'Curseur & Micro-FX', subtitle: 'Lerp, Traînée, Masque & Sparks' },
    motion: { title: 'Motion Lab', subtitle: 'Spring Physics, Easing & Stagger' }
  };

  const BG_LABELS = {
    mesh: 'Mesh Gradient · WebGL2',
    aurora: 'Aurora Borealis · WebGL2',
    grid: 'Grille Interactive · 2D',
    particles: 'Particules & Constellations',
    godrays: 'God Rays · WebGL2',
    liquid: 'Liquid Blobs · WebGL2',
    starfield: 'Starfield Warp · 3D',
    dither: 'Dither / Halftone / ASCII'
  };

  class LuminaApp {
    constructor() {
      this.state = Lumina.getPresetState('linear-dark');
      this.activeModule = 'background';
      this.exportFormat = 'html';
      this.exportScope = 'scene';
      this.paused = false;
      this.recording = false;

      // DOM refs
      this.stageFrame = document.getElementById('stage-frame');
      this.stage = document.getElementById('stage');
      this.bgCanvas = document.getElementById('bg-canvas');
      this.fxCanvas = document.getElementById('fx-canvas');
      this.lightingLayer = document.getElementById('lighting-layer');
      this.cursorEl = document.getElementById('custom-cursor');
      this.inspectorTitle = document.getElementById('inspector-title');
      this.inspectorSubtitle = document.getElementById('inspector-subtitle');
      this.inspectorBody = document.getElementById('inspector-body');
      this.fpsEl = document.getElementById('fps-meter');
      this.toastEl = document.getElementById('toast');

      // Sub-engines
      this.bgEngine = new Lumina.BackgroundEngine(this.bgCanvas);
      this.lightingEngine = new Lumina.LightingEngine(this.lightingLayer);
      this.textEngine = new Lumina.TextFXEngine(this.stage);
      this.compEngine = new Lumina.ComponentsEngine(this.stage, (action) => this._handleDockAction(action));
      this.cursorEngine = new Lumina.CursorEngine(this.stage, this.fxCanvas, this.cursorEl);

      // Mouse state normalized to stage
      this.mouse = { x: 420, y: 300, nx: 0.5, ny: 0.5 };

      // FPS & loop timing
      this.lastTime = performance.now();
      this.elapsedSec = 0;
      this.fpsFrames = 0;
      this.fpsLastCheck = performance.now();
      this.springCanvas = null;
      this.toastTimer = null;

      this._buildPresetsStrip();
      this._buildQuickPalettes();
      this._bindUI();
      this._initResizeObserver();
      this.syncAll(true);
      this.renderInspector();
      this._startLoop();
    }

    /* ---- Toast Feedback ---- */
    toast(msg) {
      this.toastEl.textContent = msg;
      this.toastEl.hidden = false;
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => {
        this.toastEl.hidden = true;
      }, 2400);
    }

    /* ---- Build Presets Top Strip ---- */
    _buildPresetsStrip() {
      const strip = document.getElementById('presets-strip');
      strip.innerHTML = '';
      Lumina.PRESETS.forEach((p) => {
        const btn = document.createElement('button');
        btn.className = `preset-pill${p.id === this.state.presetId ? ' active' : ''}`;
        btn.dataset.presetId = p.id;
        btn.innerHTML = `<span class="preset-dot" style="background:${p.dot};color:${p.dot}"></span><span>${p.name}</span>`;
        btn.addEventListener('click', () => this.applyPreset(p.id));
        strip.appendChild(btn);
      });
    }

    _buildQuickPalettes() {
      const grid = document.getElementById('quick-palettes');
      grid.innerHTML = '';
      Lumina.PALETTES.forEach((pal) => {
        const btn = document.createElement('button');
        btn.className = 'palette-swatch-btn';
        btn.innerHTML = `
          <span>${pal.name}</span>
          <span class="palette-dots">
            <span style="background:${pal.bg}"></span>
            <span style="background:${pal.c1}"></span>
            <span style="background:${pal.c2}"></span>
            <span style="background:${pal.c3}"></span>
          </span>`;
        btn.addEventListener('click', () => {
          this.state.theme = pal.theme;
          this.state.palette = {
            bg: pal.bg,
            c1: pal.c1,
            c2: pal.c2,
            c3: pal.c3,
            c4: pal.c4,
            text: pal.text,
            textMuted: pal.textMuted
          };
          this.syncAll();
          if (this.activeModule === 'background') this.renderInspector();
          this.toast(`Palette « ${pal.name} » appliquée`);
        });
        grid.appendChild(btn);
      });
    }

    applyPreset(presetId) {
      const keepAtelier = this.state.atelier;
      const keepViewport = this.state.viewport;
      this.state = Lumina.getPresetState(presetId);
      this.state.atelier = keepAtelier;
      this.state.viewport = keepViewport;

      document.querySelectorAll('.preset-pill').forEach((el) => {
        el.classList.toggle('active', el.dataset.presetId === presetId);
      });

      this.syncAll(true);
      this.renderInspector();
      const preset = Lumina.PRESETS.find((p) => p.id === presetId);
      if (preset) this.toast(`Preset « ${preset.name} » chargé`);
    }

    _handleDockAction(action) {
      if (action === 'randomize') {
        this._randomize();
        return;
      }
      if (MODULE_META[action]) {
        this.selectModule(action);
      }
    }

    _randomize() {
      this.state = Lumina.generateHarmoniousRandom(this.state);
      document.querySelectorAll('.preset-pill').forEach((el) => el.classList.remove('active'));
      this.syncAll(true);
      this.renderInspector();
      this.toast('Combinaison harmonieuse générée ✦');
    }

    selectModule(mod) {
      if (!MODULE_META[mod]) return;
      this.activeModule = mod;
      document.querySelectorAll('.layer-card').forEach((card) => {
        card.classList.toggle('active', card.dataset.module === mod);
      });
      this.renderInspector();
    }

    /* ---- Bind Global & Chrome Events ---- */
    _bindUI() {
      // Stage pointer tracking
      this.stage.addEventListener('pointermove', (e) => {
        const rect = this.stage.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
        this.mouse.nx = Math.max(0, Math.min(1, this.mouse.x / Math.max(1, rect.width)));
        this.mouse.ny = Math.max(0, Math.min(1, this.mouse.y / Math.max(1, rect.height)));
      });

      // Atelier Mode switcher
      document.querySelectorAll('#atelier-mode-control .seg-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const mode = btn.dataset.atelier;
          this.state.atelier = mode;
          this.stage.dataset.atelier = mode;
          document.querySelectorAll('#atelier-mode-control .seg-btn').forEach((b) => {
            const active = b === btn;
            b.classList.toggle('active', active);
            b.setAttribute('aria-selected', String(active));
          });
        });
      });

      // Viewport toggles
      const setVP = (vp) => {
        this.state.viewport = vp;
        this.stageFrame.classList.remove('mode-desktop', 'mode-mobile', 'mode-fullscreen');
        this.stageFrame.classList.add(`mode-${vp}`);
        document.getElementById('vp-desktop').classList.toggle('active', vp === 'desktop');
        document.getElementById('vp-mobile').classList.toggle('active', vp === 'mobile');
        document.getElementById('vp-fullscreen').classList.toggle('active', vp === 'fullscreen');
        document.getElementById('btn-exit-fs').hidden = vp !== 'fullscreen';
      };
      document.getElementById('vp-desktop').addEventListener('click', () => setVP('desktop'));
      document.getElementById('vp-mobile').addEventListener('click', () => setVP('mobile'));
      document.getElementById('vp-fullscreen').addEventListener('click', () => setVP(this.state.viewport === 'fullscreen' ? 'desktop' : 'fullscreen'));
      document.getElementById('btn-exit-fs').addEventListener('click', () => setVP('desktop'));

      // Randomize
      document.getElementById('btn-randomize').addEventListener('click', () => this._randomize());

      // Layer Cards Selection & Toggle Switches
      document.querySelectorAll('.layer-card').forEach((card) => {
        card.addEventListener('click', () => this.selectModule(card.dataset.module));
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.selectModule(card.dataset.module);
          }
        });
      });

      document.querySelectorAll('[data-toggle]').forEach((chk) => {
        chk.addEventListener('change', (e) => {
          const mod = chk.dataset.toggle;
          if (this.state[mod]) {
            this.state[mod].enabled = chk.checked;
            this.syncAll();
          }
        });
      });

      // Replay & Pause
      document.getElementById('btn-replay-all').addEventListener('click', () => {
        this.textEngine.replay(this.state);
        this.toast('Animation rejouée');
      });

      document.getElementById('btn-pause-engine').addEventListener('click', () => {
        this.paused = !this.paused;
        document.getElementById('icon-pause').hidden = this.paused;
        document.getElementById('icon-play').hidden = !this.paused;
        this.fpsEl.textContent = this.paused ? 'PAUSED' : '60 FPS';
        this.toast(this.paused ? 'Rendu en pause' : 'Rendu repris');
      });

      // Reset current module
      document.getElementById('btn-reset-module').addEventListener('click', () => {
        const base = Lumina.getPresetState(this.state.presetId === 'custom' ? 'linear-dark' : this.state.presetId);
        if (this.state[this.activeModule] && base[this.activeModule]) {
          this.state[this.activeModule] = Lumina.deepClone(base[this.activeModule]);
          this.syncAll(true);
          this.renderInspector();
          this.toast(`Module « ${MODULE_META[this.activeModule].title} » réinitialisé`);
        }
      });

      // Popovers (JSON & Media Capture)
      const jsonMenu = document.getElementById('json-popover');
      const capMenu = document.getElementById('capture-popover');
      document.getElementById('btn-json-menu').addEventListener('click', (e) => {
        e.stopPropagation();
        capMenu.hidden = true;
        jsonMenu.hidden = !jsonMenu.hidden;
      });
      document.getElementById('btn-capture-menu').addEventListener('click', (e) => {
        e.stopPropagation();
        jsonMenu.hidden = true;
        capMenu.hidden = !capMenu.hidden;
      });
      document.addEventListener('click', () => {
        jsonMenu.hidden = true;
        capMenu.hidden = true;
      });

      // Save / Import JSON
      document.getElementById('btn-save-json').addEventListener('click', () => {
        Lumina.Exporter.exportJSON(this.state);
        this.toast('Configuration JSON exportée');
      });
      const fileInput = document.getElementById('json-file-input');
      document.getElementById('btn-import-json').addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const parsed = JSON.parse(String(reader.result));
            this.state = Lumina.mergeDeep(Lumina.DEFAULT_STATE, parsed);
            this.syncAll(true);
            this.renderInspector();
            this.toast('Projet JSON importé avec succès');
          } catch (err) {
            this.toast('Erreur : fichier JSON invalide');
          }
          fileInput.value = '';
        };
        reader.readAsText(file);
      });

      // Media Capture: PNG & WebM
      document.getElementById('btn-snap-png').addEventListener('click', () => {
        Lumina.Exporter.snapshotPNG(this.bgCanvas, this.fxCanvas, this.state);
        this.toast('Capture PNG enregistrée');
      });
      document.getElementById('btn-record-webm').addEventListener('click', () => {
        if (this.recording) return;
        const recDot = document.getElementById('rec-dot');
        const label = document.getElementById('record-webm-label');
        this.recording = true;
        recDot.hidden = false;
        label.textContent = 'Enregistrement en cours…';
        Lumina.Exporter.recordWebMClip(this.bgCanvas, this.fxCanvas, 4000, (status, msg) => {
          this.toast(msg);
          if (status !== 'recording') {
            this.recording = false;
            recDot.hidden = true;
            label.textContent = 'Enregistrer clip 4s (.webm)';
          }
        });
      });

      // Code Export Drawer
      const backdrop = document.getElementById('export-backdrop');
      const openDrawer = () => {
        backdrop.hidden = false;
        document.getElementById('export-scope-module-btn').textContent = `Calque : ${MODULE_META[this.activeModule].title}`;
        this._refreshExportCode();
      };
      const closeDrawer = () => { backdrop.hidden = true; };

      document.getElementById('btn-open-export').addEventListener('click', openDrawer);
      document.getElementById('btn-close-export').addEventListener('click', closeDrawer);
      backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeDrawer(); });

      document.querySelectorAll('#export-format-tabs .seg-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.exportFormat = btn.dataset.format;
          document.querySelectorAll('#export-format-tabs .seg-btn').forEach((b) => {
            b.classList.toggle('active', b === btn);
            b.setAttribute('aria-selected', String(b === btn));
          });
          this._refreshExportCode();
        });
      });

      document.querySelectorAll('#export-scope-tabs .seg-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.exportScope = btn.dataset.scope;
          document.querySelectorAll('#export-scope-tabs .seg-btn').forEach((b) => {
            b.classList.toggle('active', b === btn);
            b.setAttribute('aria-selected', String(b === btn));
          });
          this._refreshExportCode();
        });
      });

      document.getElementById('btn-copy-code').addEventListener('click', async () => {
        const res = Lumina.Exporter.generateCode(this.state, this.exportFormat, this.exportScope, this.activeModule);
        const btn = document.getElementById('btn-copy-code');
        const lbl = document.getElementById('copy-btn-label');
        try {
          await navigator.clipboard.writeText(res.raw);
        } catch (_) {
          const ta = document.createElement('textarea');
          ta.value = res.raw;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
        }
        btn.classList.add('copied');
        lbl.textContent = 'Copié !';
        this.toast('Code copié dans le presse-papiers');
        setTimeout(() => {
          btn.classList.remove('copied');
          lbl.textContent = 'Copier en 1 clic';
        }, 1800);
      });

      document.getElementById('btn-download-code').addEventListener('click', () => {
        const res = Lumina.Exporter.generateCode(this.state, this.exportFormat, this.exportScope, this.activeModule);
        Lumina.Exporter.downloadBlob(new Blob([res.raw], { type: 'text/plain;charset=utf-8' }), res.filename);
        this.toast(`Téléchargé : ${res.filename}`);
      });

      // Keyboard Shortcuts
      document.addEventListener('keydown', (e) => {
        const tag = (e.target && e.target.tagName) || '';
        const editing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
        if (e.key === 'Escape') {
          if (!backdrop.hidden) closeDrawer();
          else if (this.state.viewport === 'fullscreen') setVP('desktop');
          return;
        }
        if (editing) return;
        if (e.key === ' ') {
          e.preventDefault();
          this.textEngine.replay(this.state);
        } else if (e.key.toLowerCase() === 'r') {
          this._randomize();
        } else if (e.key.toLowerCase() === 'e') {
          backdrop.hidden ? openDrawer() : closeDrawer();
        } else if (e.key.toLowerCase() === 'f') {
          setVP(this.state.viewport === 'fullscreen' ? 'desktop' : 'fullscreen');
        } else if (e.key.toLowerCase() === 'p') {
          document.getElementById('btn-pause-engine').click();
        }
      });
    }

    _refreshExportCode() {
      const res = Lumina.Exporter.generateCode(this.state, this.exportFormat, this.exportScope, this.activeModule);
      document.getElementById('code-filename').textContent = res.filename;
      document.getElementById('code-output').innerHTML = Lumina.Exporter.highlightCode(res.raw, this.exportFormat);
    }

    _initResizeObserver() {
      const doResize = () => {
        const rect = this.stage.getBoundingClientRect();
        this.bgEngine.resize(rect.width, rect.height);
        this.cursorEngine.resize(rect.width, rect.height);
      };
      const ro = new ResizeObserver(doResize);
      ro.observe(this.stage);
      doResize();
    }

    /* ---- Synchronize CSS Variables, Layer Badges & All Sub-Engines ---- */
    syncAll(forceReplay = false) {
      const s = this.state;
      const root = document.documentElement;

      // Global Palette & Theme Tokens
      root.style.setProperty('--scene-bg', s.palette.bg);
      root.style.setProperty('--scene-c1', s.palette.c1);
      root.style.setProperty('--scene-c2', s.palette.c2);
      root.style.setProperty('--scene-c3', s.palette.c3);
      root.style.setProperty('--scene-c4', s.palette.c4);
      root.style.setProperty('--scene-text', s.palette.text);
      root.style.setProperty('--scene-text-muted', s.palette.textMuted);

      this.stage.classList.toggle('theme-light', s.theme === 'light');
      this.stage.dataset.atelier = s.atelier;

      // Motion Lab Global CSS Tokens
      root.style.setProperty('--motion-speed', String(s.motion.speed));
      root.style.setProperty('--motion-ease', Lumina.Exporter.getEasingCss(s.motion));
      root.style.setProperty('--motion-duration', `${(0.75 / Math.max(0.2, s.motion.speed)).toFixed(2)}s`);
      root.style.setProperty('--motion-stagger', `${s.motion.stagger}ms`);

      // Sync sub-engines
      this.lightingEngine.applyState(s);
      this.textEngine.applyState(s, forceReplay);
      this.compEngine.applyState(s);
      this.cursorEngine.applyState(s);

      // Update left sidebar switches & subtitles
      let activeCount = 1; // Motion Lab is always active
      ['background', 'lighting', 'textfx', 'components', 'cursor'].forEach((mod) => {
        const enabled = Boolean(s[mod].enabled);
        if (enabled) activeCount++;
        const chk = document.querySelector(`[data-toggle="${mod}"]`);
        if (chk) chk.checked = enabled;
        const card = document.querySelector(`.layer-card[data-module="${mod}"]`);
        if (card) card.classList.toggle('disabled', !enabled);
      });
      document.getElementById('active-layers-count').textContent = `${activeCount} actifs`;

      document.getElementById('sub-background').textContent =
        s.background.type === 'grid'
          ? `Grille · ${s.background.gridStyle}`
          : s.background.type === 'dither'
            ? `Dither · ${s.background.ditherStyle}`
            : (BG_LABELS[s.background.type] || s.background.type);

      const lightParts = [];
      if (s.lighting.spotlights) lightParts.push('Spots');
      if (s.lighting.orbs) lightParts.push('Orbs');
      if (s.lighting.grain) lightParts.push('Grain');
      document.getElementById('sub-lighting').textContent = lightParts.join(' · ') || 'Désactivé';

      document.getElementById('sub-textfx').textContent = `${s.textfx.effect} · ${s.textfx.font}`;
      document.getElementById('sub-components').textContent = `${s.components.cardStyle} · ${s.components.buttonStyle}`;
      document.getElementById('sub-cursor').textContent = `${s.cursor.trail ? s.cursor.trailStyle : 'Clean'}${s.cursor.clickSparks ? ' · Sparks' : ''}`;
      document.getElementById('sub-motion').textContent = `${s.motion.easing} · ${s.motion.speed.toFixed(1)}x · ${s.motion.stagger}ms`;
    }

    /* ======================================================================
       DYNAMIC INSPECTOR RENDERER
       ====================================================================== */

    renderInspector() {
      const mod = this.activeModule;
      this.inspectorTitle.textContent = MODULE_META[mod].title;
      this.inspectorSubtitle.textContent = MODULE_META[mod].subtitle;
      this.inspectorBody.innerHTML = '';
      this.springCanvas = null;

      if (mod === 'background') this._renderBackgroundInspector();
      else if (mod === 'lighting') this._renderLightingInspector();
      else if (mod === 'textfx') this._renderTextInspector();
      else if (mod === 'components') this._renderComponentsInspector();
      else if (mod === 'cursor') this._renderCursorInspector();
      else if (mod === 'motion') this._renderMotionInspector();
    }

    /* ---- Inspector Helper Builders ---- */
    _group(title) {
      const g = document.createElement('div');
      g.className = 'ctrl-group';
      g.innerHTML = `<div class="ctrl-group-title">${title}</div>`;
      this.inspectorBody.appendChild(g);
      return g;
    }

    _chips(parent, options, currentVal, onSelect, cols = 2) {
      const grid = document.createElement('div');
      grid.className = `mode-grid${cols === 3 ? ' cols-3' : ''}`;
      options.forEach((opt) => {
        const btn = document.createElement('button');
        btn.className = `mode-chip${opt.id === currentVal ? ' active' : ''}`;
        btn.textContent = opt.label;
        btn.addEventListener('click', () => {
          onSelect(opt.id);
          grid.querySelectorAll('.mode-chip').forEach((c) => c.classList.remove('active'));
          btn.classList.add('active');
        });
        grid.appendChild(btn);
      });
      parent.appendChild(grid);
    }

    _slider(parent, label, value, min, max, step, unit, onChange) {
      const row = document.createElement('div');
      row.className = 'ctrl-row';
      const fmt = (v) => `${Number(v).toFixed(step < 0.1 ? 2 : step < 1 ? 1 : 0)}${unit}`;
      row.innerHTML = `
        <div class="ctrl-label-line">
          <span>${label}</span>
          <span class="ctrl-val">${fmt(value)}</span>
        </div>
        <input type="range" class="studio-range" min="${min}" max="${max}" step="${step}" value="${value}" />
      `;
      const input = row.querySelector('input');
      const valEl = row.querySelector('.ctrl-val');
      input.addEventListener('input', () => {
        const v = parseFloat(input.value);
        valEl.textContent = fmt(v);
        onChange(v);
      });
      parent.appendChild(row);
    }

    _toggle(parent, label, checked, onChange) {
      const row = document.createElement('div');
      row.className = 'toggle-row';
      row.innerHTML = `
        <span class="toggle-row-label">${label}</span>
        <label class="switch">
          <input type="checkbox" ${checked ? 'checked' : ''} />
          <span class="slider"></span>
        </label>
      `;
      const input = row.querySelector('input');
      input.addEventListener('change', () => onChange(input.checked));
      parent.appendChild(row);
    }

    _select(parent, label, options, currentVal, onChange) {
      const row = document.createElement('div');
      row.className = 'ctrl-row';
      row.innerHTML = `<div class="ctrl-label-line"><span>${label}</span></div>`;
      const sel = document.createElement('select');
      sel.className = 'studio-select';
      options.forEach((opt) => {
        const o = document.createElement('option');
        o.value = opt.id;
        o.textContent = opt.label;
        if (opt.id === currentVal) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', () => onChange(sel.value));
      row.appendChild(sel);
      parent.appendChild(row);
    }

    _textInput(parent, label, value, multiline, onChange) {
      const row = document.createElement('div');
      row.className = 'ctrl-row';
      row.innerHTML = `<div class="ctrl-label-line"><span>${label}</span></div>`;
      const el = document.createElement(multiline ? 'textarea' : 'input');
      el.className = multiline ? 'studio-textarea' : 'studio-input';
      el.value = value;
      el.addEventListener('input', () => onChange(el.value));
      row.appendChild(el);
      parent.appendChild(row);
    }

    /* ---- 1. Background Inspector ---- */
    _renderBackgroundInspector() {
      const bg = this.state.background;
      const gMode = this._group('Moteur de Fond');
      this._chips(gMode, [
        { id: 'mesh', label: 'Mesh Gradient' },
        { id: 'aurora', label: 'Aurora Borealis' },
        { id: 'grid', label: 'Grille Réactive' },
        { id: 'particles', label: 'Constellations' },
        { id: 'godrays', label: 'God Rays' },
        { id: 'liquid', label: 'Liquid Blobs' },
        { id: 'starfield', label: 'Starfield 3D' },
        { id: 'dither', label: 'Dither / ASCII' }
      ], bg.type, (id) => {
        bg.type = id;
        this.syncAll();
        this.renderInspector();
      });

      if (bg.type === 'grid') {
        const gSub = this._group('Style de Grille');
        this._chips(gSub, [
          { id: 'dots', label: 'Dots' },
          { id: 'squares', label: 'Squares' },
          { id: 'perspective', label: 'Perspective 3D' },
          { id: 'truchet', label: 'Truchet Flow' }
        ], bg.gridStyle, (id) => { bg.gridStyle = id; this.syncAll(); });
      } else if (bg.type === 'dither') {
        const gSub = this._group('Style Dither / Anti-IA');
        this._chips(gSub, [
          { id: 'bayer', label: 'Bayer 4×4' },
          { id: 'halftone', label: 'Halftone' },
          { id: 'ascii', label: 'ASCII Live' }
        ], bg.ditherStyle, (id) => { bg.ditherStyle = id; this.syncAll(); }, 3);
      }

      const gParams = this._group('Paramètres Shader & Mouvement');
      this._slider(gParams, 'Vitesse', bg.speed, 0.1, 2.5, 0.05, 'x', (v) => { bg.speed = v; });
      this._slider(gParams, 'Échelle / Zoom', bg.scale, 0.5, 2.2, 0.05, 'x', (v) => { bg.scale = v; });
      this._slider(gParams, 'Densité', bg.density, 0.5, 1.8, 0.05, 'x', (v) => { bg.density = v; });
      this._slider(gParams, 'Réactivité Souris', bg.mouseReactivity, 0, 1.5, 0.05, '', (v) => { bg.mouseReactivity = v; });
      this._slider(gParams, 'Opacité', bg.opacity, 0.1, 1.0, 0.02, '', (v) => { bg.opacity = v; });
      this._select(gParams, 'Blend Mode', [
        { id: 'normal', label: 'Normal' },
        { id: 'screen', label: 'Screen' },
        { id: 'lighten', label: 'Lighten' },
        { id: 'overlay', label: 'Overlay' }
      ], bg.blendMode, (v) => { bg.blendMode = v; });

      const gPal = this._group('Palette Chromatique');
      const grid = document.createElement('div');
      grid.className = 'colors-grid';
      const colorFields = [
        { key: 'bg', label: 'Fond' },
        { key: 'c1', label: 'Primaire' },
        { key: 'c2', label: 'Secondaire' },
        { key: 'c3', label: 'Accent' },
        { key: 'c4', label: 'Reflet' },
        { key: 'text', label: 'Texte' }
      ];
      colorFields.forEach((cf) => {
        const box = document.createElement('div');
        box.className = 'color-field';
        box.innerHTML = `
          <input type="color" value="${this.state.palette[cf.key]}" />
          <div class="color-meta">
            <span class="color-name">${cf.label}</span>
            <span class="color-hex">${this.state.palette[cf.key]}</span>
          </div>`;
        const inp = box.querySelector('input');
        const hex = box.querySelector('.color-hex');
        inp.addEventListener('input', () => {
          this.state.palette[cf.key] = inp.value;
          hex.textContent = inp.value;
          this.syncAll();
        });
        grid.appendChild(box);
      });
      gPal.appendChild(grid);
    }

    /* ---- 2. Lighting Inspector ---- */
    _renderLightingInspector() {
      const L = this.state.lighting;

      const gSpots = this._group('Spotlights & Orbs');
      this._toggle(gSpots, 'Hero Spotlights (Faisceaux)', L.spotlights, (v) => { L.spotlights = v; this.syncAll(); });
      this._slider(gSpots, 'Intensité Spotlights', L.spotIntensity, 0, 1.0, 0.02, '', (v) => { L.spotIntensity = v; this.syncAll(); });
      this._toggle(gSpots, 'Ambient Glowing Orbs', L.orbs, (v) => { L.orbs = v; this.syncAll(); });
      this._slider(gSpots, 'Flou des Orbs', L.orbBlur, 40, 180, 2, 'px', (v) => { L.orbBlur = v; this.syncAll(); });
      this._slider(gSpots, 'Opacité des Orbs', L.orbOpacity, 0, 0.9, 0.02, '', (v) => { L.orbOpacity = v; this.syncAll(); });

      const gDyn = this._group('Lumière Dynamique & Optique');
      this._toggle(gDyn, 'Spotlight Suiveur Curseur', L.cursorSpot, (v) => { L.cursorSpot = v; this.syncAll(); });
      this._slider(gDyn, 'Rayon Curseur', L.cursorRadius, 180, 720, 10, 'px', (v) => { L.cursorRadius = v; this.syncAll(); });
      this._slider(gDyn, 'Intensité Curseur', L.cursorIntensity, 0.05, 0.9, 0.02, '', (v) => { L.cursorIntensity = v; this.syncAll(); });
      this._toggle(gDyn, 'Lens Glow Anamorphique', L.lensGlow, (v) => { L.lensGlow = v; this.syncAll(); });
      this._slider(gDyn, 'Intensité Lens Glow', L.lensIntensity, 0, 0.9, 0.02, '', (v) => { L.lensIntensity = v; this.syncAll(); });

      const gPost = this._group('Grain & Post-Traitement');
      this._toggle(gPost, 'Film Grain 35mm Cinématique', L.grain, (v) => { L.grain = v; this.syncAll(); });
      this._slider(gPost, 'Opacité Grain', L.grainOpacity, 0.01, 0.22, 0.005, '', (v) => { L.grainOpacity = v; this.syncAll(); });
      this._toggle(gPost, 'Vignette & Masque Radial', L.vignette, (v) => { L.vignette = v; this.syncAll(); });
      this._slider(gPost, 'Force Vignette', L.vignetteStrength, 0, 0.95, 0.02, '', (v) => { L.vignetteStrength = v; this.syncAll(); });
      this._select(gPost, 'Mode de Fusion', [
        { id: 'screen', label: 'Screen (Recommandé)' },
        { id: 'plus-lighter', label: 'Plus-Lighter (Additive)' },
        { id: 'overlay', label: 'Overlay' },
        { id: 'color-dodge', label: 'Color Dodge' },
        { id: 'multiply', label: 'Multiply (Thème Clair)' }
      ], L.blendMode, (v) => { L.blendMode = v; this.syncAll(); });
    }

    /* ---- 3. Typography Inspector ---- */
    _renderTextInspector() {
      const T = this.state.textfx;

      const gEff = this._group('Effet d’Animation Texte');
      this._chips(gEff, [
        { id: 'split', label: 'Split-Text Reveal' },
        { id: 'shimmer', label: 'Shimmer Métal' },
        { id: 'liquid', label: 'Liquid Gradient' },
        { id: 'scramble', label: 'Scramble Decode' },
        { id: 'glitch', label: 'Glitch RGB' }
      ], T.effect, (id) => {
        T.effect = id;
        this.syncAll(true);
        this.renderInspector();
      });

      if (T.effect === 'split') {
        this._chips(gEff, [
          { id: 'chars', label: 'Par Caractère' },
          { id: 'words', label: 'Par Mot' }
        ], T.splitBy, (id) => { T.splitBy = id; this.syncAll(true); });
      }

      const replayBtn = document.createElement('button');
      replayBtn.className = 'btn-subtle';
      replayBtn.style.width = '100%';
      replayBtn.innerHTML = '↻ Rejouer l’animation texte';
      replayBtn.addEventListener('click', () => this.textEngine.replay(this.state));
      gEff.appendChild(replayBtn);

      const gCopy = this._group('Contenu Éditable en Direct');
      this._textInput(gCopy, 'Titre Principal', T.headline, false, (v) => { T.headline = v; this.syncAll(); });
      this._textInput(gCopy, 'Sous-titre', T.subtitle, true, (v) => { T.subtitle = v; this.syncAll(); });
      this._select(gCopy, 'Police Display', [
        { id: 'Inter', label: 'Inter (Linear / Apple)' },
        { id: 'Space Grotesk', label: 'Space Grotesk (Stripe / Tech)' },
        { id: 'Instrument Serif', label: 'Instrument Serif (Éditorial)' },
        { id: 'Syne', label: 'Syne (Avant-Garde / Cyber)' },
        { id: 'JetBrains Mono', label: 'JetBrains Mono (Brutalist)' }
      ], T.font, (v) => { T.font = v; this.syncAll(); });
      this._slider(gCopy, 'Taille Titre', T.size, 32, 82, 1, 'px', (v) => { T.size = v; this.syncAll(); });
      this._slider(gCopy, 'Approche (Tracking)', T.tracking, -0.06, 0.08, 0.005, 'em', (v) => { T.tracking = v; this.syncAll(); });

      const gKin = this._group('Modules Cinétiques Bonus');
      this._toggle(gKin, 'Kinetic Marquee Infini', T.showMarquee, (v) => { T.showMarquee = v; this.syncAll(); });
      this._textInput(gKin, 'Texte Marquee (séparé par •)', T.marqueeText, false, (v) => { T.marqueeText = v; this.syncAll(); });
      this._toggle(gKin, 'Texte Circulaire Rotatif', T.showCircular, (v) => { T.showCircular = v; this.syncAll(); });
      this._textInput(gKin, 'Texte Orbital', T.circularText, false, (v) => { T.circularText = v; this.syncAll(); });
    }

    /* ---- 4. UI Components Inspector ---- */
    _renderComponentsInspector() {
      const C = this.state.components;

      const gCard = this._group('Style de Carte Interactive');
      this._chips(gCard, [
        { id: 'bento', label: 'Bento Beam' },
        { id: 'liquid', label: 'Liquid Glass' },
        { id: 'holo', label: '3D Holospot' }
      ], C.cardStyle, (id) => {
        C.cardStyle = id;
        this.syncAll();
        this.renderInspector();
      }, 3);

      this._toggle(gCard, 'Afficher la Carte', C.showCard, (v) => { C.showCard = v; this.syncAll(); });
      if (C.cardStyle === 'liquid') {
        this._toggle(gCard, 'Réfraction Optique SVG', C.liquidRefract, (v) => { C.liquidRefract = v; this.syncAll(); });
      }
      if (C.cardStyle === 'holo') {
        this._slider(gCard, 'Intensité Foil Holospot', C.holoIntensity, 0.1, 1.2, 0.05, '', (v) => { C.holoIntensity = v; this.syncAll(); });
      }
      if (C.cardStyle === 'bento') {
        this._slider(gCard, 'Vitesse Border Beam', C.beamSpeed, 1.2, 8.0, 0.2, 's', (v) => { C.beamSpeed = v; this.syncAll(); });
      }
      this._slider(gCard, 'Flou Glassmorphism', C.cardBlur, 0, 42, 1, 'px', (v) => { C.cardBlur = v; this.syncAll(); });
      this._slider(gCard, 'Opacité Surface', C.cardOpacity, 0.04, 0.65, 0.02, '', (v) => { C.cardOpacity = v; this.syncAll(); });
      this._slider(gCard, 'Arrondi (Radius)', C.cardRadius, 6, 34, 1, 'px', (v) => { C.cardRadius = v; this.syncAll(); });
      this._slider(gCard, 'Force Tilt 3D', C.tiltStrength, 0, 26, 1, '°', (v) => { C.tiltStrength = v; this.syncAll(); });
      this._slider(gCard, 'Intensité Glow', C.cardGlow, 0, 1.2, 0.05, '', (v) => { C.cardGlow = v; this.syncAll(); });
      this._textInput(gCard, 'Titre de la Carte', C.cardTitle, false, (v) => { C.cardTitle = v; this.syncAll(); });
      this._textInput(gCard, 'Description', C.cardDesc, true, (v) => { C.cardDesc = v; this.syncAll(); });

      const gBtn = this._group('Bouton Principal & Accessoires');
      this._chips(gBtn, [
        { id: 'border-beam', label: 'Border Beam' },
        { id: 'magnetic', label: 'Magnétique' },
        { id: 'shimmer', label: 'Shimmer' },
        { id: 'ripple', label: 'Liquid Ripple' }
      ], C.buttonStyle, (id) => { C.buttonStyle = id; this.syncAll(); });
      this._toggle(gBtn, 'Afficher les Boutons', C.showButtons, (v) => { C.showButtons = v; this.syncAll(); });
      this._textInput(gBtn, 'Texte du Bouton', C.buttonText, false, (v) => { C.buttonText = v; this.syncAll(); });
      this._toggle(gBtn, 'Badge / Pill Lumineux', C.showBadge, (v) => { C.showBadge = v; this.syncAll(); });
      this._textInput(gBtn, 'Texte du Badge', C.badgeText, false, (v) => { C.badgeText = v; this.syncAll(); });
      this._toggle(gBtn, 'Dock macOS Interactif', C.showDock, (v) => { C.showDock = v; this.syncAll(); });
    }

    /* ---- 5. Cursor Inspector ---- */
    _renderCursorInspector() {
      const C = this.state.cursor;
      const gCur = this._group('Curseur Fluide & Micro-Interactions');
      this._toggle(gCur, 'Curseur Custom (Lerp)', C.customCursor, (v) => { C.customCursor = v; this.syncAll(); });
      this._slider(gCur, 'Fluidité (Lerp)', C.lerp, 0.05, 0.45, 0.01, '', (v) => { C.lerp = v; });
      this._toggle(gCur, 'Traînée Lumineuse', C.trail, (v) => { C.trail = v; this.syncAll(); });
      this._chips(gCur, [
        { id: 'particles', label: 'Particules' },
        { id: 'ribbon', label: 'Ruban Comète' }
      ], C.trailStyle, (id) => { C.trailStyle = id; this.syncAll(); });
      this._toggle(gCur, 'Spotlight Mask (Torche)', C.spotlightMask, (v) => { C.spotlightMask = v; this.syncAll(); });
      this._toggle(gCur, 'Click Sparks (Étincelles)', C.clickSparks, (v) => { C.clickSparks = v; this.syncAll(); });
      this._slider(gCur, 'Nombre d’Étincelles', C.sparkCount, 6, 36, 1, '', (v) => { C.sparkCount = v; });
    }

    /* ---- 6. Motion Lab Inspector (with Live Spring Physics Graph!) ---- */
    _renderMotionInspector() {
      const M = this.state.motion;
      const gViz = this._group('Courbe Spring Physics en Direct');
      const box = document.createElement('div');
      box.className = 'spring-viz-box';
      const cvs = document.createElement('canvas');
      cvs.className = 'spring-canvas';
      cvs.width = 260;
      cvs.height = 110;
      box.appendChild(cvs);
      gViz.appendChild(box);
      this.springCanvas = cvs;

      const gCurve = this._group('Timing & Physique');
      this._chips(gCurve, [
        { id: 'spring', label: 'Spring' },
        { id: 'expo', label: 'Expo Out' },
        { id: 'quart', label: 'Quart Out' },
        { id: 'back', label: 'Back Out' },
        { id: 'linear', label: 'Linear' }
      ], M.easing, (id) => { M.easing = id; this.syncAll(true); });

      this._slider(gCurve, 'Vitesse Globale', M.speed, 0.25, 2.5, 0.05, 'x', (v) => { M.speed = v; this.syncAll(); });
      this._slider(gCurve, 'Stiffness (Raideur)', M.stiffness, 60, 500, 10, '', (v) => { M.stiffness = v; this.syncAll(); });
      this._slider(gCurve, 'Damping (Amortissement)', M.damping, 5, 50, 1, '', (v) => { M.damping = v; this.syncAll(); });
      this._slider(gCurve, 'Mass (Masse)', M.mass, 0.4, 3.0, 0.1, '', (v) => { M.mass = v; this.syncAll(); });
      this._slider(gCurve, 'Stagger Delay', M.stagger, 10, 110, 2, 'ms', (v) => { M.stagger = v; this.syncAll(true); });
    }

    _renderSpringGraph(timeSec) {
      if (!this.springCanvas) return;
      const ctx = this.springCanvas.getContext('2d');
      const w = this.springCanvas.width;
      const h = this.springCanvas.height;
      const M = this.state.motion;

      ctx.clearRect(0, 0, w, h);

      // Subtle grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      const targetY = h * 0.26;
      const baseY = h * 0.84;
      ctx.beginPath();
      ctx.moveTo(0, targetY); ctx.lineTo(w, targetY);
      ctx.moveTo(0, baseY); ctx.lineTo(w, baseY);
      ctx.stroke();

      // Simulate analytical spring response x(t) from 0 -> 1 over 1.6s
      const k = M.stiffness;
      const c = M.damping;
      const m = M.mass || 1;
      const steps = 120;
      const totalT = 1.6;
      const dtSim = totalT / steps;

      let pos = 0, vel = 0;
      const pts = [];
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        let val = pos;
        if (M.easing === 'expo') val = u === 1 ? 1 : 1 - Math.pow(2, -10 * u);
        else if (M.easing === 'quart') val = 1 - Math.pow(1 - u, 4);
        else if (M.easing === 'back') {
          const s = 1.70158;
          val = 1 + (s + 1) * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2);
        } else if (M.easing === 'linear') val = u;
        else {
          const force = -k * (pos - 1) - c * vel;
          vel += (force / m) * dtSim;
          pos += vel * dtSim;
          val = pos;
        }
        pts.push({
          x: 12 + u * (w - 24),
          y: baseY - val * (baseY - targetY)
        });
      }

      // Draw curve
      ctx.strokeStyle = this.state.palette.c1;
      ctx.lineWidth = 2;
      ctx.beginPath();
      pts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();

      // Animated tracer dot moving across the curve
      const phase = (timeSec * M.speed * 0.65) % 1;
      const idx = Math.min(pts.length - 1, Math.floor(phase * pts.length));
      const cur = pts[idx];

      ctx.fillStyle = this.state.palette.c2;
      ctx.beginPath();
      ctx.arc(cur.x, cur.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    /* ======================================================================
       MASTER 60 FPS ANIMATION LOOP (Auto-pauses when tab is hidden)
       ====================================================================== */

    _startLoop() {
      const tick = (now) => {
        requestAnimationFrame(tick);
        if (document.hidden || this.paused) {
          this.lastTime = now;
          return;
        }

        const dt = Math.min(0.05, (now - this.lastTime) / 1000);
        this.lastTime = now;
        this.elapsedSec += dt;

        // Render active engines
        this.bgEngine.render(this.elapsedSec, dt, this.state, this.mouse);
        this.lightingEngine.update(now, this.state, this.mouse);
        this.cursorEngine.render(dt, this.state, this.mouse);
        if (this.activeModule === 'motion') {
          this._renderSpringGraph(this.elapsedSec);
        }

        // Update FPS badge every 500ms
        this.fpsFrames++;
        if (now - this.fpsLastCheck >= 500) {
          const fps = Math.round((this.fpsFrames * 1000) / (now - this.fpsLastCheck));
          this.fpsEl.textContent = `${Math.min(60, fps)} FPS`;
          this.fpsFrames = 0;
          this.fpsLastCheck = now;
        }
      };
      requestAnimationFrame(tick);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    window.luminaApp = new LuminaApp();
  });
})(window.Lumina);
