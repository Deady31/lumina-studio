/* ==========================================================================
   LUMINA STUDIO — Dual WebGL2 GLSL + Canvas 2D Background Engine
   ========================================================================== */

window.Lumina = window.Lumina || {};

(function (Lumina) {
  'use strict';

  function hexToRgb01(hex) {
    if (!hex || typeof hex !== 'string') return [0.39, 0.4, 0.95];
    const clean = hex.replace('#', '');
    const full = clean.length === 3
      ? clean.split('').map(c => c + c).join('')
      : clean.padEnd(6, '0').slice(0, 6);
    const num = parseInt(full, 16);
    return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
  }

  function hexToRgba(hex, a) {
    const [r, g, b] = hexToRgb01(hex);
    return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
  }

  /* ---- WebGL2 Vertex & Fragment Shaders ---- */
  const VERT_SRC = `#version 300 es
    precision highp float;
    const vec2 POS[4] = vec2[4](
      vec2(-1.0, -1.0), vec2(1.0, -1.0),
      vec2(-1.0,  1.0), vec2(1.0,  1.0)
    );
    out vec2 vUv;
    void main() {
      vec2 p = POS[gl_VertexID];
      vUv = p * 0.5 + 0.5;
      gl_Position = vec4(p, 0.0, 1.0);
    }
  `;

  const COMMON_NOISE = `
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }
    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
      vec2 i = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
      m = m * m; m = m * m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
      vec3 g;
      g.x = a0.x * x0.x + h.x * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
      for (int i = 0; i < 4; i++) {
        v += a * snoise(p);
        p = rot * p * 2.02;
        a *= 0.5;
      }
      return v;
    }
    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }
  `;

  const FRAG_MESH = `#version 300 es
    precision highp float;
    in vec2 vUv;
    out vec4 fragColor;
    uniform float uTime, uScale, uMouseReact;
    uniform vec2 uRes, uMouse;
    uniform vec3 uBg, uC1, uC2, uC3, uC4;
    ${COMMON_NOISE}
    void main() {
      vec2 aspect = vec2(uRes.x / max(uRes.y, 1.0), 1.0);
      vec2 uv = (vUv - 0.5) * aspect * uScale;
      vec2 m = (uMouse - 0.5) * aspect;
      float md = length(uv - m);
      uv += normalize(uv - m + 0.0001) * exp(-md * 2.6) * 0.16 * uMouseReact;

      float t = uTime * 0.22;
      vec2 q = vec2(fbm(uv * 1.15 + vec2(t, t * 0.6)), fbm(uv * 1.15 + vec2(-t * 0.7, t * 0.9) + 4.2));
      vec2 r = vec2(fbm(uv * 1.3 + q * 1.4 + vec2(1.7, 9.2) + t * 0.5), fbm(uv * 1.3 + q * 1.4 + vec2(8.3, 2.8) - t * 0.4));
      float f = fbm(uv * 1.1 + r * 1.25);

      vec3 col = mix(uBg, uC1, smoothstep(-0.65, 0.45, q.x));
      col = mix(col, uC2, smoothstep(-0.35, 0.65, r.x) * 0.85);
      col = mix(col, uC3, smoothstep(-0.15, 0.72, f) * 0.78);
      col = mix(col, uC4, smoothstep(0.25, 0.95, r.y) * 0.62);

      // Soft silk highlight & anti-banding dither
      float silk = pow(max(0.0, 0.5 + 0.5 * sin((uv.x + r.x) * 4.5 + t * 2.0)), 4.0) * 0.12;
      col += silk * mix(uC2, vec3(1.0), 0.5);
      col += (hash12(gl_FragCoord.xy) - 0.5) * 0.015;
      fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `;

  const FRAG_AURORA = `#version 300 es
    precision highp float;
    in vec2 vUv;
    out vec4 fragColor;
    uniform float uTime, uScale, uMouseReact;
    uniform vec2 uRes, uMouse;
    uniform vec3 uBg, uC1, uC2, uC3, uC4;
    ${COMMON_NOISE}
    void main() {
      vec2 uv = vUv;
      float t = uTime * 0.28;
      float mx = (uMouse.x - 0.5) * 0.35 * uMouseReact;
      float my = (uMouse.y - 0.5) * 0.2 * uMouseReact;

      vec3 col = uBg;
      // Subtle horizon glow
      col += uC1 * 0.09 * smoothstep(0.0, 0.95, uv.y);

      for (int i = 0; i < 4; i++) {
        float fi = float(i);
        float shift = fi * 0.23;
        float x = (uv.x + mx * (0.4 + fi * 0.25)) * (2.2 + fi * 0.6) * uScale;
        float wave = sin(x + t * (0.9 + fi * 0.18) + fi * 1.9) * 0.14
                   + snoise(vec2(x * 0.85, t * 0.45 + fi * 3.1)) * 0.16;
        float centerY = 0.48 + wave + my * 0.4 + (fi - 1.5) * 0.09;
        float dist = uv.y - centerY;
        // Curtain fades sharply downward, softly upward
        float curtain = exp(-abs(dist) * (dist > 0.0 ? 4.8 : 13.5));
        float rays = 0.55 + 0.45 * sin(x * 7.5 + snoise(vec2(x * 2.0, t * 0.6)) * 3.5);
        float band = curtain * rays * (0.58 - fi * 0.08);
        vec3 tint = (i == 0) ? uC1 : (i == 1) ? uC2 : (i == 2) ? uC3 : uC4;
        col += tint * band;
      }

      col += (hash12(gl_FragCoord.xy) - 0.5) * 0.012;
      fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `;

  const FRAG_GODRAYS = `#version 300 es
    precision highp float;
    in vec2 vUv;
    out vec4 fragColor;
    uniform float uTime, uScale, uMouseReact;
    uniform vec2 uRes, uMouse;
    uniform vec3 uBg, uC1, uC2, uC3, uC4;
    ${COMMON_NOISE}
    void main() {
      vec2 aspect = vec2(uRes.x / max(uRes.y, 1.0), 1.0);
      vec2 p = vUv * aspect;
      vec2 origin = vec2((0.5 + (uMouse.x - 0.5) * 0.55 * uMouseReact) * aspect.x, 1.18 + (uMouse.y - 0.5) * 0.18 * uMouseReact);
      vec2 d = p - origin;
      float dist = length(d);
      float ang = atan(d.y, d.x);

      float t = uTime * 0.35;
      float rays1 = pow(0.5 + 0.5 * sin(ang * 14.0 * uScale + t * 1.1 + snoise(vec2(ang * 3.0, t * 0.4)) * 2.2), 2.5);
      float rays2 = pow(0.5 + 0.5 * sin(ang * 25.0 * uScale - t * 0.8 + snoise(vec2(ang * 5.0, -t * 0.3)) * 1.8), 3.2);
      float rays3 = pow(0.5 + 0.5 * cos(ang * 8.0 * uScale + t * 0.5), 2.0);

      float falloff = exp(-dist * 1.05);
      float volumetric = (rays1 * 0.55 + rays2 * 0.35 + rays3 * 0.35) * falloff;

      vec3 beamCol = mix(uC1, uC2, clamp(0.5 + 0.5 * sin(ang * 3.0 + t), 0.0, 1.0));
      beamCol = mix(beamCol, uC3, clamp(rays2, 0.0, 1.0) * 0.5);

      vec3 col = uBg;
      col += beamCol * volumetric * 1.25;
      // Bright zenith core
      col += mix(uC2, vec3(1.0), 0.65) * exp(-dist * 3.2) * 0.65;
      // Subtle atmospheric dust haze
      float haze = fbm(p * 3.0 - vec2(0.0, t * 0.25)) * 0.5 + 0.5;
      col += uC1 * haze * falloff * 0.14;
      col += (hash12(gl_FragCoord.xy) - 0.5) * 0.015;
      fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `;

  const FRAG_LIQUID = `#version 300 es
    precision highp float;
    in vec2 vUv;
    out vec4 fragColor;
    uniform float uTime, uScale, uMouseReact;
    uniform vec2 uRes, uMouse;
    uniform vec3 uBg, uC1, uC2, uC3, uC4;
    ${COMMON_NOISE}
    void main() {
      vec2 aspect = vec2(uRes.x / max(uRes.y, 1.0), 1.0);
      vec2 uv = (vUv - 0.5) * aspect * uScale;
      vec2 m = (uMouse - 0.5) * aspect;
      float t = uTime * 0.42;

      float field = 0.0;
      vec3 accum = vec3(0.0);
      for (int i = 0; i < 6; i++) {
        float fi = float(i);
        vec2 c = vec2(
          sin(t * (0.55 + fi * 0.11) + fi * 1.7) * 0.55,
          cos(t * (0.48 + fi * 0.09) + fi * 2.3) * 0.36
        );
        if (i == 5) {
          c = mix(c, m, 0.78 * uMouseReact);
        }
        float r = 0.16 + 0.04 * sin(t + fi);
        float d = length(uv - c);
        float contrib = (r * r) / (d * d + 0.018);
        field += contrib;
        vec3 bc = (i % 4 == 0) ? uC1 : (i % 4 == 1) ? uC2 : (i % 4 == 2) ? uC3 : uC4;
        accum += bc * contrib;
      }

      // Liquid interference ripples
      float wave = snoise(uv * 2.8 + vec2(t * 0.5, -t * 0.35)) * 0.35;
      field += wave * 0.4;

      vec3 blobCol = accum / max(field, 0.001);
      float body = smoothstep(0.62, 1.45, field);
      float rim = smoothstep(0.75, 1.08, field) * (1.0 - smoothstep(1.08, 1.48, field));
      float spec = pow(max(0.0, smoothstep(1.35, 2.35, field)), 2.2);

      vec3 col = mix(uBg, blobCol * 0.92, body);
      col += mix(uC2, vec3(1.0), 0.7) * rim * 0.85;
      col += vec3(1.0) * spec * 0.28;
      col += (hash12(gl_FragCoord.xy) - 0.5) * 0.012;
      fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `;

  /* ---- 4x4 Bayer Matrix for Ordered Dithering ---- */
  const BAYER_4X4 = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5]
  ];
  const ASCII_CHARS = ' .,:;i1tfLCG08@';

  class BackgroundEngine {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.width = 1;
      this.height = 1;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      // Offscreen WebGL2 renderer
      this.glCanvas = document.createElement('canvas');
      this.gl = this.glCanvas.getContext('webgl2', {
        alpha: false,
        antialias: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true
      });
      this.programs = {};
      if (this.gl) {
        this._initShaders();
      }

      // Persistent states for Canvas 2D modes
      this.particles = [];
      this.stars = [];
      this._initParticles(85);
      this._initStars(190);
    }

    _compile(type, src) {
      const gl = this.gl;
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn('Lumina shader warning:', gl.getShaderInfoLog(sh));
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    }

    _createProgram(fragSrc) {
      const gl = this.gl;
      const vs = this._compile(gl.VERTEX_SHADER, VERT_SRC);
      const fs = this._compile(gl.FRAGMENT_SHADER, fragSrc);
      if (!vs || !fs) return null;
      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.warn('Lumina link warning:', gl.getProgramInfoLog(prog));
        return null;
      }
      return {
        prog,
        uTime: gl.getUniformLocation(prog, 'uTime'),
        uScale: gl.getUniformLocation(prog, 'uScale'),
        uMouseReact: gl.getUniformLocation(prog, 'uMouseReact'),
        uRes: gl.getUniformLocation(prog, 'uRes'),
        uMouse: gl.getUniformLocation(prog, 'uMouse'),
        uBg: gl.getUniformLocation(prog, 'uBg'),
        uC1: gl.getUniformLocation(prog, 'uC1'),
        uC2: gl.getUniformLocation(prog, 'uC2'),
        uC3: gl.getUniformLocation(prog, 'uC3'),
        uC4: gl.getUniformLocation(prog, 'uC4')
      };
    }

    _initShaders() {
      this.programs.mesh = this._createProgram(FRAG_MESH);
      this.programs.aurora = this._createProgram(FRAG_AURORA);
      this.programs.godrays = this._createProgram(FRAG_GODRAYS);
      this.programs.liquid = this._createProgram(FRAG_LIQUID);
      this.vao = this.gl.createVertexArray();
    }

    _initParticles(count) {
      this.particles = [];
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: Math.random(),
          y: Math.random(),
          vx: (Math.random() - 0.5) * 0.00055,
          vy: (Math.random() - 0.5) * 0.00055,
          r: 1.2 + Math.random() * 2.2,
          ci: i % 4
        });
      }
    }

    _initStars(count) {
      this.stars = [];
      for (let i = 0; i < count; i++) {
        this.stars.push({
          x: (Math.random() - 0.5) * 2.2,
          y: (Math.random() - 0.5) * 2.2,
          z: Math.random(),
          pz: 1,
          ci: i % 4
        });
      }
    }

    resize(width, height) {
      this.width = Math.max(1, Math.floor(width));
      this.height = Math.max(1, Math.floor(height));
      this.dpr = Math.min(window.devicePixelRatio || 1, 1.75);

      this.canvas.width = Math.floor(this.width * this.dpr);
      this.canvas.height = Math.floor(this.height * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

      // Keep WebGL resolution fast & silky (cap at 0.85x-1.15x CSS pixels for guaranteed 60 FPS)
      const glScale = Math.min(this.dpr, 1.15);
      this.glCanvas.width = Math.max(1, Math.floor(this.width * glScale));
      this.glCanvas.height = Math.max(1, Math.floor(this.height * glScale));
    }

    render(timeSec, dt, state, mouse) {
      const bg = state.background;
      const pal = state.palette;
      const ctx = this.ctx;

      // Apply canvas CSS blend & opacity
      this.canvas.style.opacity = bg.enabled ? String(bg.opacity) : '0';
      this.canvas.style.mixBlendMode = bg.blendMode || 'normal';

      if (!bg.enabled) {
        ctx.fillStyle = pal.bg;
        ctx.fillRect(0, 0, this.width, this.height);
        return;
      }

      const speed = bg.speed * state.motion.speed;
      const t = timeSec * speed;

      const isShaderMode = bg.type === 'mesh' || bg.type === 'aurora' || bg.type === 'godrays' || bg.type === 'liquid';
      if (isShaderMode && this.gl && this.programs[bg.type]) {
        this._renderWebGL(bg.type, t, bg, pal, mouse);
        return;
      }

      if (isShaderMode) {
        // Fallback 2D smooth gradient if WebGL2 unavailable
        this._renderMeshFallback2D(t, pal, mouse, bg.mouseReactivity);
        return;
      }

      switch (bg.type) {
        case 'grid':
          this._renderGrid(t, bg, pal, mouse);
          break;
        case 'particles':
          this._renderParticles(t, dt * speed, bg, pal, mouse);
          break;
        case 'starfield':
          this._renderStarfield(dt * speed, bg, pal, mouse);
          break;
        case 'dither':
          this._renderDither(t, bg, pal, mouse);
          break;
        default:
          ctx.fillStyle = pal.bg;
          ctx.fillRect(0, 0, this.width, this.height);
      }
    }

    _renderWebGL(type, t, bg, pal, mouse) {
      const gl = this.gl;
      const p = this.programs[type];
      gl.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);
      gl.useProgram(p.prog);
      gl.bindVertexArray(this.vao);

      gl.uniform1f(p.uTime, t);
      gl.uniform1f(p.uScale, bg.scale);
      gl.uniform1f(p.uMouseReact, bg.mouseReactivity);
      gl.uniform2f(p.uRes, this.glCanvas.width, this.glCanvas.height);
      gl.uniform2f(p.uMouse, mouse.nx, 1.0 - mouse.ny);
      gl.uniform3fv(p.uBg, hexToRgb01(pal.bg));
      gl.uniform3fv(p.uC1, hexToRgb01(pal.c1));
      gl.uniform3fv(p.uC2, hexToRgb01(pal.c2));
      gl.uniform3fv(p.uC3, hexToRgb01(pal.c3));
      gl.uniform3fv(p.uC4, hexToRgb01(pal.c4));

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      this.ctx.drawImage(this.glCanvas, 0, 0, this.width, this.height);
    }

    _renderMeshFallback2D(t, pal, mouse, react) {
      const ctx = this.ctx;
      const w = this.width, h = this.height;
      ctx.fillStyle = pal.bg;
      ctx.fillRect(0, 0, w, h);
      const colors = [pal.c1, pal.c2, pal.c3, pal.c4];
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 4; i++) {
        const cx = w * (0.5 + 0.34 * Math.sin(t * 0.4 + i * 1.7) + (mouse.nx - 0.5) * 0.14 * react);
        const cy = h * (0.5 + 0.32 * Math.cos(t * 0.35 + i * 2.1) + (mouse.ny - 0.5) * 0.14 * react);
        const rad = Math.max(w, h) * 0.52;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0, hexToRgba(colors[i], 0.55));
        g.addColorStop(1, hexToRgba(colors[i], 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.restore();
    }

    /* ---- Interactive Grid (Dots / Squares / Perspective / Truchet Flow) ---- */
    _renderGrid(t, bg, pal, mouse) {
      const ctx = this.ctx;
      const w = this.width, h = this.height;
      ctx.fillStyle = pal.bg;
      ctx.fillRect(0, 0, w, h);

      const style = bg.gridStyle || 'dots';
      const mx = mouse.x;
      const my = mouse.y;
      const react = bg.mouseReactivity;

      if (style === 'perspective') {
        const horizon = h * (0.42 + (mouse.ny - 0.5) * 0.08 * react);
        const vanishX = w * (0.5 + (mouse.nx - 0.5) * 0.18 * react);

        // Horizon atmospheric glow
        const hg = ctx.createRadialGradient(vanishX, horizon, 10, vanishX, horizon, w * 0.6);
        hg.addColorStop(0, hexToRgba(pal.c1, 0.36));
        hg.addColorStop(0.5, hexToRgba(pal.c2, 0.12));
        hg.addColorStop(1, 'transparent');
        ctx.fillStyle = hg;
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = hexToRgba(pal.c1, 0.36);
        ctx.lineWidth = 1;

        // Vertical perspective rays
        const cols = Math.round(18 * bg.density);
        for (let i = -cols; i <= cols; i++) {
          const spread = (i / cols) * w * 1.9;
          ctx.beginPath();
          ctx.moveTo(vanishX + spread * 0.02, horizon);
          ctx.lineTo(vanishX + spread, h + 20);
          ctx.stroke();
        }

        // Animated horizontal depth lines
        const rows = Math.round(16 * bg.density);
        const offset = (t * 0.55) % 1;
        for (let r = 0; r < rows; r++) {
          const p = (r + offset) / rows;
          const y = horizon + Math.pow(p, 2.35) * (h - horizon);
          ctx.strokeStyle = hexToRgba(pal.c2, 0.08 + p * 0.42);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        return;
      }

      if (style === 'truchet') {
        // Generative Truchet Arc Tiles (inspired by Book of Shapes)
        const size = Math.max(26, Math.round(52 / bg.density * bg.scale));
        const cols = Math.ceil(w / size) + 1;
        const rows = Math.ceil(h / size) + 1;
        ctx.lineCap = 'round';

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const x = c * size;
            const y = r * size;
            const cx = x + size * 0.5;
            const cy = y + size * 0.5;
            const dist = Math.hypot(cx - mx, cy - my);
            const prox = Math.max(0, 1 - dist / (260 * (0.4 + react)));
            const hash = Math.sin(c * 12.9898 + r * 78.233) * 43758.5453;
            const flip = (hash - Math.floor(hash)) > 0.5;
            const wave = Math.sin(t * 0.9 + (c + r) * 0.35) * 0.5 + 0.5;
            const alpha = 0.14 + wave * 0.18 + prox * 0.62;

            ctx.strokeStyle = prox > 0.35 ? hexToRgba(pal.c2, alpha) : hexToRgba(pal.c1, alpha);
            ctx.lineWidth = 1.4 + prox * 2.2;

            ctx.beginPath();
            if (flip !== (prox > 0.65)) {
              ctx.arc(x, y, size * 0.5, 0, Math.PI * 0.5);
              ctx.stroke();
              ctx.beginPath();
              ctx.arc(x + size, y + size, size * 0.5, Math.PI, Math.PI * 1.5);
              ctx.stroke();
            } else {
              ctx.arc(x + size, y, size * 0.5, Math.PI * 0.5, Math.PI);
              ctx.stroke();
              ctx.beginPath();
              ctx.arc(x, y + size, size * 0.5, Math.PI * 1.5, Math.PI * 2);
              ctx.stroke();
            }
          }
        }
        return;
      }

      // Dots or Squares reactive matrix
      const gap = Math.max(18, Math.round(30 / bg.density * bg.scale));
      const radius = 210 * (0.35 + react * 0.9);
      const isDark = pal.bg.toLowerCase() !== '#f5efe4';

      for (let y = gap * 0.5; y < h; y += gap) {
        for (let x = gap * 0.5; x < w; x += gap) {
          const dx = x - mx;
          const dy = y - my;
          const dist = Math.hypot(dx, dy);
          const influence = Math.max(0, 1 - dist / radius);
          const wave = Math.sin(x * 0.015 + y * 0.015 - t * 1.8) * 0.5 + 0.5;

          const push = influence * influence * 10 * react;
          const px = x + (dist > 0.01 ? (dx / dist) * push : 0);
          const py = y + (dist > 0.01 ? (dy / dist) * push : 0);

          if (style === 'squares') {
            const s = (gap * 0.52) * (0.7 + influence * 0.55);
            ctx.strokeStyle = influence > 0.15
              ? hexToRgba(pal.c2, 0.18 + influence * 0.72)
              : hexToRgba(isDark ? pal.c1 : pal.text, 0.08 + wave * 0.09);
            ctx.lineWidth = 1 + influence * 1.2;
            ctx.strokeRect(px - s * 0.5, py - s * 0.5, s, s);
            if (influence > 0.22) {
              ctx.fillStyle = hexToRgba(pal.c1, influence * 0.22);
              ctx.fillRect(px - s * 0.5, py - s * 0.5, s, s);
            }
          } else {
            const r = 1.2 + wave * 0.65 + influence * 3.4;
            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            ctx.fillStyle = influence > 0.12
              ? hexToRgba(influence > 0.55 ? pal.c2 : pal.c1, 0.28 + influence * 0.72)
              : hexToRgba(isDark ? '#ffffff' : pal.text, 0.12 + wave * 0.12);
            ctx.fill();
          }
        }
      }
    }

    /* ---- Particles & Constellations ---- */
    _renderParticles(t, dt, bg, pal, mouse) {
      const ctx = this.ctx;
      const w = this.width, h = this.height;
      ctx.fillStyle = pal.bg;
      ctx.fillRect(0, 0, w, h);

      const targetCount = Math.round(75 * bg.density);
      if (Math.abs(this.particles.length - targetCount) > 8) {
        this._initParticles(Math.max(25, Math.min(160, targetCount)));
      }

      const colors = [pal.c1, pal.c2, pal.c3, pal.c4];
      const linkDist = Math.min(w, h) * 0.2 * bg.scale;
      const react = bg.mouseReactivity;
      const mx = mouse.x, my = mouse.y;

      const pts = this.particles;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        p.x += p.vx * (dt * 60);
        p.y += p.vy * (dt * 60);
        if (p.x < 0) p.x = 1;
        if (p.x > 1) p.x = 0;
        if (p.y < 0) p.y = 1;
        if (p.y > 1) p.y = 0;

        p.px = p.x * w;
        p.py = p.y * h;

        const dx = mx - p.px;
        const dy = my - p.py;
        const d = Math.hypot(dx, dy);
        if (d < 180 && d > 1) {
          const pull = (1 - d / 180) * 0.45 * react;
          p.px += dx * pull * 0.14;
          p.py += dy * pull * 0.14;
        }
      }

      // Constellation lines
      ctx.lineWidth = 1;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j];
          const d = Math.hypot(a.px - b.px, a.py - b.py);
          if (d < linkDist) {
            const alpha = (1 - d / linkDist) * 0.42;
            ctx.strokeStyle = hexToRgba(colors[a.ci], alpha);
            ctx.beginPath();
            ctx.moveTo(a.px, a.py);
            ctx.lineTo(b.px, b.py);
            ctx.stroke();
          }
        }
        // Cursor constellation tether
        const dm = Math.hypot(a.px - mx, a.py - my);
        if (dm < linkDist * 1.25 && react > 0.05) {
          ctx.strokeStyle = hexToRgba(pal.c2, (1 - dm / (linkDist * 1.25)) * 0.65 * react);
          ctx.beginPath();
          ctx.moveTo(a.px, a.py);
          ctx.lineTo(mx, my);
          ctx.stroke();
        }
      }

      // Luminous nodes
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const col = colors[p.ci];
        const glow = ctx.createRadialGradient(p.px, p.py, 0, p.px, p.py, p.r * 5.2);
        glow.addColorStop(0, hexToRgba(col, 0.72));
        glow.addColorStop(1, hexToRgba(col, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.px, p.py, p.r * 5.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.px, p.py, p.r * 0.72, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    /* ---- 3D Starfield Warp ---- */
    _renderStarfield(dt, bg, pal, mouse) {
      const ctx = this.ctx;
      const w = this.width, h = this.height;
      ctx.fillStyle = pal.bg;
      ctx.fillRect(0, 0, w, h);

      const cx = w * (0.5 + (mouse.nx - 0.5) * 0.25 * bg.mouseReactivity);
      const cy = h * (0.5 + (mouse.ny - 0.5) * 0.25 * bg.mouseReactivity);
      const colors = ['#ffffff', pal.c1, pal.c2, pal.c3];
      const step = dt * 0.38 * bg.scale;

      // Subtle central nebula
      const neb = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.55);
      neb.addColorStop(0, hexToRgba(pal.c1, 0.16));
      neb.addColorStop(0.5, hexToRgba(pal.c2, 0.06));
      neb.addColorStop(1, 'transparent');
      ctx.fillStyle = neb;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < this.stars.length; i++) {
        const s = this.stars[i];
        s.pz = s.z;
        s.z -= step;
        if (s.z <= 0.02) {
          s.x = (Math.random() - 0.5) * 2.2;
          s.y = (Math.random() - 0.5) * 2.2;
          s.z = 1.0;
          s.pz = 1.0;
        }
        const sx = cx + (s.x / s.z) * w * 0.48;
        const sy = cy + (s.y / s.z) * h * 0.48;
        const px = cx + (s.x / s.pz) * w * 0.48;
        const py = cy + (s.y / s.pz) * h * 0.48;
        const alpha = Math.min(1, (1 - s.z) * 1.4);

        ctx.strokeStyle = hexToRgba(colors[s.ci], alpha);
        ctx.lineWidth = Math.max(0.8, (1 - s.z) * 2.8);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      }
    }

    /* ---- Ordered Bayer Dithering / Halftone / Interactive ASCII Matrix ---- */
    _renderDither(t, bg, pal, mouse) {
      const ctx = this.ctx;
      const w = this.width, h = this.height;
      ctx.fillStyle = pal.bg;
      ctx.fillRect(0, 0, w, h);

      const style = bg.ditherStyle || 'bayer';
      const cell = style === 'ascii'
        ? Math.max(12, Math.round(16 / bg.density * bg.scale))
        : style === 'halftone'
          ? Math.max(10, Math.round(14 / bg.density * bg.scale))
          : Math.max(6, Math.round(9 / bg.density * bg.scale));

      const cols = Math.ceil(w / cell);
      const rows = Math.ceil(h / cell);
      const mx = mouse.x, my = mouse.y;
      const react = bg.mouseReactivity;

      if (style === 'ascii') {
        ctx.font = `600 ${Math.round(cell * 0.92)}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
      }

      for (let r = 0; r < rows; r++) {
        const y = r * cell + cell * 0.5;
        for (let c = 0; c < cols; c++) {
          const x = c * cell + cell * 0.5;
          // Smooth organic scalar field + radial cursor wave
          const nx = c * 0.085;
          const ny = r * 0.085;
          let v = 0.5
            + 0.28 * Math.sin(nx * 1.6 + t * 0.9 + Math.cos(ny * 1.3 - t * 0.6))
            + 0.22 * Math.cos((nx - ny) * 1.2 + t * 0.7);

          const dist = Math.hypot(x - mx, y - my);
          const glow = Math.exp(-dist * dist / (22000 * (0.3 + react)));
          v = Math.max(0, Math.min(1, v + glow * 0.55 * react));

          if (style === 'bayer') {
            const threshold = (BAYER_4X4[r & 3][c & 3] + 0.5) / 16;
            if (v > threshold) {
              ctx.fillStyle = v > 0.78 ? pal.c2 : pal.c1;
              ctx.fillRect(c * cell, r * cell, cell - 1, cell - 1);
            }
          } else if (style === 'halftone') {
            const rad = v * cell * 0.46;
            if (rad > 0.7) {
              ctx.fillStyle = v > 0.72 ? pal.c2 : pal.c1;
              ctx.beginPath();
              ctx.arc(x, y, rad, 0, Math.PI * 2);
              ctx.fill();
            }
          } else {
            // Interactive ASCII Matrix
            const idx = Math.min(ASCII_CHARS.length - 1, Math.floor(v * ASCII_CHARS.length));
            if (idx > 0) {
              ctx.fillStyle = glow > 0.35
                ? pal.c2
                : hexToRgba(pal.c1, 0.25 + v * 0.75);
              ctx.fillText(ASCII_CHARS[idx], x, y);
            }
          }
        }
      }
    }
  }

  Lumina.BackgroundEngine = BackgroundEngine;
})(window.Lumina);
