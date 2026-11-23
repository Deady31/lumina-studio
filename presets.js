/* ==========================================================================
   LUMINA STUDIO — Presets, Curated Palettes & State Schema
   ========================================================================== */

window.Lumina = window.Lumina || {};

(function (Lumina) {
  'use strict';

  const DEFAULT_STATE = {
    presetId: 'linear-dark',
    atelier: 'hero', // 'hero' | 'component' | 'type' | 'shader'
    viewport: 'desktop', // 'desktop' | 'mobile' | 'fullscreen'
    theme: 'dark', // 'dark' | 'light'

    palette: {
      bg: '#05060b',
      c1: '#6366f1',
      c2: '#38bdf8',
      c3: '#c084fc',
      c4: '#ec4899',
      text: '#f8fafc',
      textMuted: 'rgba(226, 232, 240, 0.72)'
    },

    background: {
      enabled: true,
      type: 'mesh', // 'mesh' | 'aurora' | 'grid' | 'particles' | 'godrays' | 'liquid' | 'starfield' | 'dither'
      gridStyle: 'dots', // 'dots' | 'squares' | 'perspective' | 'truchet'
      ditherStyle: 'bayer', // 'bayer' | 'halftone' | 'ascii'
      speed: 1.0,
      scale: 1.0,
      density: 1.0,
      mouseReactivity: 0.75,
      opacity: 1.0,
      blendMode: 'normal'
    },

    lighting: {
      enabled: true,
      spotlights: true,
      spotIntensity: 0.62,
      orbs: true,
      orbBlur: 95,
      orbOpacity: 0.36,
      cursorSpot: true,
      cursorRadius: 440,
      cursorIntensity: 0.45,
      lensGlow: true,
      lensIntensity: 0.34,
      grain: true,
      grainOpacity: 0.065,
      vignette: true,
      vignetteStrength: 0.68,
      blendMode: 'screen'
    },

    textfx: {
      enabled: true,
      headline: 'Craft interfaces that feel alive.',
      subtitle: 'Shaders WebGL2 temps réel, verre liquide optique, lumières volumétriques et micro-interactions calibrées au pixel près.',
      effect: 'split', // 'split' | 'shimmer' | 'liquid' | 'scramble' | 'glitch'
      splitBy: 'chars', // 'chars' | 'words'
      font: 'Inter', // 'Inter' | 'Space Grotesk' | 'Instrument Serif' | 'Syne' | 'JetBrains Mono'
      size: 56,
      tracking: -0.035,
      showMarquee: false,
      marqueeText: 'LUMINA STUDIO • LIQUID GLASS • HOLOSPOT FOIL • WEBGL2 SHADERS •',
      showCircular: false,
      circularText: 'LUMINA STUDIO • DESIGN ENGINEERING • 60 FPS SHADERS •'
    },

    components: {
      enabled: true,
      showBadge: true,
      badgeText: 'Design Engineering · 60 FPS WebGL2',
      showButtons: true,
      buttonStyle: 'border-beam', // 'magnetic' | 'border-beam' | 'shimmer' | 'ripple'
      buttonText: 'Lancer l\'expérience',
      showCard: true,
      cardStyle: 'bento', // 'liquid' | 'holo' | 'bento'
      cardTitle: 'Lumina Optical Engine',
      cardDesc: 'Réfraction optique, réflexion holographique temps réel et bordure lumineuse GPU accélérée.',
      cardBlur: 20,
      cardOpacity: 0.16,
      cardRadius: 20,
      cardGlow: 0.88,
      tiltStrength: 14,
      holoIntensity: 0.85,
      liquidRefract: true,
      beamSpeed: 4.0,
      showDock: true
    },

    cursor: {
      enabled: true,
      customCursor: true,
      lerp: 0.16,
      trail: true,
      trailStyle: 'particles', // 'particles' | 'ribbon'
      spotlightMask: false,
      clickSparks: true,
      sparkCount: 16
    },

    motion: {
      speed: 1.0,
      easing: 'spring', // 'spring' | 'expo' | 'quart' | 'back' | 'linear'
      stiffness: 220,
      damping: 20,
      mass: 1.0,
      stagger: 38
    }
  };

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function mergeDeep(base, override) {
    const out = deepClone(base);
    if (!override) return out;
    for (const k of Object.keys(override)) {
      if (
        override[k] &&
        typeof override[k] === 'object' &&
        !Array.isArray(override[k]) &&
        out[k] &&
        typeof out[k] === 'object'
      ) {
        out[k] = mergeDeep(out[k], override[k]);
      } else {
        out[k] = override[k];
      }
    }
    return out;
  }

  const PRESETS = [
    {
      id: 'linear-dark',
      name: 'Linear Dark',
      dot: '#818cf8',
      patch: {
        theme: 'dark',
        palette: {
          bg: '#05060a',
          c1: '#6366f1',
          c2: '#38bdf8',
          c3: '#8b5cf6',
          c4: '#4f46e5',
          text: '#f8fafc',
          textMuted: 'rgba(203, 213, 225, 0.72)'
        },
        background: { enabled: true, type: 'grid', gridStyle: 'dots', speed: 0.9, scale: 1.0, density: 1.0, mouseReactivity: 0.85, opacity: 0.95 },
        lighting: { enabled: true, spotlights: true, spotIntensity: 0.68, orbs: true, orbBlur: 110, orbOpacity: 0.3, cursorSpot: true, cursorIntensity: 0.48, lensGlow: true, lensIntensity: 0.38, grain: true, grainOpacity: 0.055, vignette: true, vignetteStrength: 0.75 },
        textfx: { enabled: true, headline: 'Purpose-built for modern craft.', subtitle: 'Précision chirurgicale, grilles réactives, faisceaux lumineux et composants bento conçus pour le web haut de gamme.', effect: 'shimmer', font: 'Inter', size: 56, tracking: -0.04, showMarquee: false, showCircular: false },
        components: { enabled: true, showBadge: true, badgeText: 'Linear Craft · Border Beam GPU', buttonStyle: 'border-beam', buttonText: 'Ouvrir le studio', cardStyle: 'bento', cardTitle: 'Spatial Bento Engine', cardDesc: 'Bordure lumineuse tournante @property et spotlight interne calibré sur le curseur.', cardBlur: 18, cardOpacity: 0.14, cardGlow: 0.95, tiltStrength: 10, showDock: true },
        cursor: { enabled: true, customCursor: true, lerp: 0.16, trail: true, trailStyle: 'particles', spotlightMask: false, clickSparks: true },
        motion: { speed: 1.0, easing: 'spring', stiffness: 240, damping: 22, stagger: 35 }
      }
    },
    {
      id: 'stripe-mesh',
      name: 'Stripe Mesh',
      dot: '#38bdf8',
      patch: {
        theme: 'dark',
        palette: {
          bg: '#090b16',
          c1: '#635bff',
          c2: '#00d4ff',
          c3: '#ff4d8d',
          c4: '#ff9a3c',
          text: '#ffffff',
          textMuted: 'rgba(241, 245, 249, 0.82)'
        },
        background: { enabled: true, type: 'mesh', speed: 1.15, scale: 1.05, density: 1.0, mouseReactivity: 0.85, opacity: 1.0 },
        lighting: { enabled: true, spotlights: false, orbs: true, orbBlur: 120, orbOpacity: 0.25, cursorSpot: true, cursorIntensity: 0.35, lensGlow: true, lensIntensity: 0.42, grain: true, grainOpacity: 0.045, vignette: true, vignetteStrength: 0.45 },
        textfx: { enabled: true, headline: 'Financial infrastructure in motion.', subtitle: 'Dégradés WebGL2 fluides à déformation de domaine simplex, typographie liquide et boutons shimmer haute vélocité.', effect: 'liquid', font: 'Space Grotesk', size: 58, tracking: -0.035, showMarquee: false, showCircular: false },
        components: { enabled: true, showBadge: true, badgeText: 'WebGL2 Domain-Warped Mesh · 60 FPS', buttonStyle: 'shimmer', buttonText: 'Démarrer le shader', cardStyle: 'liquid', cardTitle: 'Fluid Checkout Surface', cardDesc: 'Surface translucide saturée captant le flux chromatique du mesh WebGL2 en arrière-plan.', cardBlur: 24, cardOpacity: 0.16, cardGlow: 0.85, tiltStrength: 12, liquidRefract: false, showDock: true },
        cursor: { enabled: true, customCursor: true, lerp: 0.18, trail: true, trailStyle: 'ribbon', spotlightMask: false, clickSparks: true },
        motion: { speed: 1.1, easing: 'expo', stiffness: 200, damping: 20, stagger: 32 }
      }
    },
    {
      id: 'apple-liquid',
      name: 'Apple Liquid Glass',
      dot: '#7dd3fc',
      patch: {
        theme: 'dark',
        palette: {
          bg: '#07111e',
          c1: '#38bdf8',
          c2: '#818cf8',
          c3: '#2dd4bf',
          c4: '#f472b6',
          text: '#f8fafc',
          textMuted: 'rgba(226, 232, 240, 0.8)'
        },
        background: { enabled: true, type: 'liquid', speed: 0.9, scale: 1.0, density: 1.0, mouseReactivity: 0.95, opacity: 1.0 },
        lighting: { enabled: true, spotlights: true, spotIntensity: 0.42, orbs: true, orbBlur: 100, orbOpacity: 0.42, cursorSpot: true, cursorIntensity: 0.5, lensGlow: true, lensIntensity: 0.45, grain: false, grainOpacity: 0.03, vignette: true, vignetteStrength: 0.4 },
        textfx: { enabled: true, headline: 'Liquid Glass. Pure Refraction.', subtitle: 'Verre optique inspiré de Glasswork & visionOS : réfraction SVG, bordures spéculaires chromatiques et Dock macOS.', effect: 'split', splitBy: 'words', font: 'Inter', size: 54, tracking: -0.04, showMarquee: false, showCircular: false },
        components: { enabled: true, showBadge: true, badgeText: 'Optical SVG Refraction · Liquid Glass', buttonStyle: 'ripple', buttonText: 'Tester la réfraction', cardStyle: 'liquid', cardTitle: 'Liquid Glass Material', cardDesc: 'Filtre feDisplacementMap temps réel, saturation 185% et rebord lumineux spéculaire.', cardBlur: 26, cardOpacity: 0.2, cardRadius: 26, cardGlow: 0.9, tiltStrength: 14, liquidRefract: true, showDock: true },
        cursor: { enabled: true, customCursor: true, lerp: 0.14, trail: true, trailStyle: 'particles', spotlightMask: false, clickSparks: true },
        motion: { speed: 1.0, easing: 'spring', stiffness: 180, damping: 16, stagger: 55 }
      }
    },
    {
      id: 'cyber-neon',
      name: 'Cyber Neon',
      dot: '#f43f5e',
      patch: {
        theme: 'dark',
        palette: {
          bg: '#04030c',
          c1: '#ff2e97',
          c2: '#00f0ff',
          c3: '#a855f7',
          c4: '#facc15',
          text: '#ffffff',
          textMuted: 'rgba(216, 226, 255, 0.76)'
        },
        background: { enabled: true, type: 'godrays', speed: 1.2, scale: 1.1, density: 1.1, mouseReactivity: 0.9, opacity: 1.0 },
        lighting: { enabled: true, spotlights: true, spotIntensity: 0.72, orbs: true, orbBlur: 90, orbOpacity: 0.44, cursorSpot: true, cursorIntensity: 0.62, lensGlow: true, lensIntensity: 0.52, grain: true, grainOpacity: 0.075, vignette: true, vignetteStrength: 0.72 },
        textfx: { enabled: true, headline: 'SYNTHETIC LIGHT OVERDRIVE', subtitle: 'Rayons volumétriques crépusculaires, aberration chromatique RGB Glitch et carte holographique Holospot.', effect: 'glitch', font: 'Syne', size: 52, tracking: -0.02, showMarquee: true, showCircular: false },
        components: { enabled: true, showBadge: true, badgeText: 'HOLOSPOT FOIL · GOD RAYS GLSL', buttonStyle: 'magnetic', buttonText: 'Activer Hyperdrive', cardStyle: 'holo', cardTitle: 'Holospot Foil Deck', cardDesc: 'Inclinaison 3D perspective, feuille irisée spectrale color-dodge et reflet spéculaire.', cardBlur: 16, cardOpacity: 0.18, cardRadius: 18, tiltStrength: 20, holoIntensity: 0.95, showDock: true },
        cursor: { enabled: true, customCursor: true, lerp: 0.2, trail: true, trailStyle: 'ribbon', spotlightMask: false, clickSparks: true, sparkCount: 22 },
        motion: { speed: 1.25, easing: 'back', stiffness: 320, damping: 18, stagger: 28 }
      }
    },
    {
      id: 'warm-editorial',
      name: 'Warm Editorial',
      dot: '#f59e0b',
      patch: {
        theme: 'light',
        palette: {
          bg: '#f5efe4',
          c1: '#d97706',
          c2: '#e11d48',
          c3: '#92400e',
          c4: '#f59e0b',
          text: '#1a1612',
          textMuted: 'rgba(42, 34, 26, 0.72)'
        },
        background: { enabled: true, type: 'dither', ditherStyle: 'halftone', speed: 0.65, scale: 1.15, density: 0.85, mouseReactivity: 0.7, opacity: 0.32 },
        lighting: { enabled: true, spotlights: false, orbs: true, orbBlur: 140, orbOpacity: 0.34, cursorSpot: false, lensGlow: false, grain: true, grainOpacity: 0.09, vignette: true, vignetteStrength: 0.22, blendMode: 'multiply' },
        textfx: { enabled: true, headline: 'Timeless digital typography.', subtitle: 'Direction artistique éditoriale inspirée du risograph et de l’imprimerie suisse : serif expressif, grain 35mm et trame halftone.', effect: 'split', splitBy: 'chars', font: 'Instrument Serif', size: 68, tracking: -0.015, showMarquee: false, showCircular: true, circularText: 'ATELIER LUMINA • RISOGRAPH EDITION • PRINT TO WEB •' },
        components: { enabled: true, showBadge: true, badgeText: 'Issue N°04 · Editorial & Risograph', buttonStyle: 'magnetic', buttonText: 'Lire le manifeste', cardStyle: 'liquid', cardTitle: 'Atelier Specimen Card', cardDesc: 'Contraste organique, grain photographique subtil et micro-typographie calibrée.', cardBlur: 16, cardOpacity: 0.45, cardRadius: 16, tiltStrength: 8, liquidRefract: false, showDock: false },
        cursor: { enabled: true, customCursor: true, lerp: 0.14, trail: false, spotlightMask: false, clickSparks: true, sparkCount: 10 },
        motion: { speed: 0.85, easing: 'quart', stiffness: 140, damping: 24, stagger: 30 }
      }
    },
    {
      id: 'brutalist-dither',
      name: 'Brutalist Dither',
      dot: '#c6ff00',
      patch: {
        theme: 'dark',
        palette: {
          bg: '#060705',
          c1: '#c6ff00',
          c2: '#ffffff',
          c3: '#4ade80',
          c4: '#a3e635',
          text: '#f7fee7',
          textMuted: 'rgba(217, 249, 157, 0.75)'
        },
        background: { enabled: true, type: 'dither', ditherStyle: 'ascii', speed: 1.0, scale: 1.0, density: 1.05, mouseReactivity: 1.0, opacity: 0.92 },
        lighting: { enabled: true, spotlights: false, orbs: false, cursorSpot: true, cursorRadius: 340, cursorIntensity: 0.32, lensGlow: false, grain: true, grainOpacity: 0.085, vignette: true, vignetteStrength: 0.78 },
        textfx: { enabled: true, headline: 'ANTI-SLOP ASCII ENGINE', subtitle: 'Rendu Bayer Dithering & matrice ASCII interactive en direct : brutalisme acide, décodage terminal et zéro générique.', effect: 'scramble', font: 'JetBrains Mono', size: 46, tracking: -0.02, showMarquee: true, marqueeText: 'BAYER 4X4 DITHER • LIVE ASCII MATRIX • ANTI-SLOP CRAFT • 60 FPS •', showCircular: false },
        components: { enabled: true, showBadge: true, badgeText: 'SYS.LIVE // INTERACTIVE ASCII DITHER', buttonStyle: 'border-beam', buttonText: 'EXEC_EXPORT()', cardStyle: 'bento', cardTitle: 'RAW_SHADER_NODE_01', cardDesc: 'Champ de densité ASCII réactif au curseur avec décodage typographique temps réel.', cardBlur: 10, cardOpacity: 0.25, cardRadius: 8, cardGlow: 1.0, tiltStrength: 6, beamSpeed: 2.8, showDock: true },
        cursor: { enabled: true, customCursor: true, lerp: 0.25, trail: true, trailStyle: 'particles', spotlightMask: false, clickSparks: true, sparkCount: 18 },
        motion: { speed: 1.15, easing: 'expo', stiffness: 360, damping: 28, stagger: 24 }
      }
    },
    {
      id: 'holospot-prism',
      name: 'Holospot Prism',
      dot: '#e879f9',
      patch: {
        theme: 'dark',
        palette: {
          bg: '#07060f',
          c1: '#a855f7',
          c2: '#38bdf8',
          c3: '#f472b6',
          c4: '#34d399',
          text: '#faf5ff',
          textMuted: 'rgba(233, 213, 255, 0.74)'
        },
        background: { enabled: true, type: 'grid', gridStyle: 'truchet', speed: 0.85, scale: 1.0, density: 1.0, mouseReactivity: 0.9, opacity: 0.85 },
        lighting: { enabled: true, spotlights: true, spotIntensity: 0.55, orbs: true, orbBlur: 105, orbOpacity: 0.35, cursorSpot: true, cursorIntensity: 0.45, lensGlow: true, lensIntensity: 0.3, grain: true, grainOpacity: 0.05, vignette: true, vignetteStrength: 0.65 },
        textfx: { enabled: true, headline: 'Prismatic Foil & Generative Curves.', subtitle: 'Motifs Truchet inspirés de Book of Shapes couplés au moteur de feuille holographique 3D Holospot.', effect: 'shimmer', font: 'Space Grotesk', size: 52, tracking: -0.03, showMarquee: false, showCircular: true, circularText: 'HOLOSPOT ENGINE • TRUCHET FLOW • PRISMATIC CRAFT •' },
        components: { enabled: true, showBadge: true, badgeText: 'Book of Shapes × Holospot Engine', buttonStyle: 'shimmer', buttonText: 'Incliner le prisme', cardStyle: 'holo', cardTitle: 'Iridescent Collector Card', cardDesc: 'Déplacez la souris sur la carte pour animer la diffraction prismatique et le tilt 3D.', cardBlur: 18, cardOpacity: 0.16, cardRadius: 22, tiltStrength: 22, holoIntensity: 1.0, showDock: true },
        cursor: { enabled: true, customCursor: true, lerp: 0.15, trail: true, trailStyle: 'particles', spotlightMask: false, clickSparks: true, sparkCount: 16 },
        motion: { speed: 1.0, easing: 'spring', stiffness: 210, damping: 18, stagger: 40 }
      }
    }
  ];

  const PALETTES = [
    { name: 'Linear', theme: 'dark', bg: '#05060a', c1: '#6366f1', c2: '#38bdf8', c3: '#a855f7', c4: '#ec4899', text: '#f8fafc', textMuted: 'rgba(226,232,240,0.72)' },
    { name: 'Stripe', theme: 'dark', bg: '#090b16', c1: '#635bff', c2: '#00d4ff', c3: '#ff4d8d', c4: '#ff9a3c', text: '#ffffff', textMuted: 'rgba(241,245,249,0.8)' },
    { name: 'Acid', theme: 'dark', bg: '#060705', c1: '#c6ff00', c2: '#ffffff', c3: '#4ade80', c4: '#22d3ee', text: '#f7fee7', textMuted: 'rgba(217,249,157,0.75)' },
    { name: 'Sunset', theme: 'dark', bg: '#10070c', c1: '#f97316', c2: '#ec4899', c3: '#eab308', c4: '#8b5cf6', text: '#fff7ed', textMuted: 'rgba(255,237,213,0.75)' },
    { name: 'Aurora', theme: 'dark', bg: '#030d12', c1: '#10b981', c2: '#38bdf8', c3: '#6366f1', c4: '#2dd4bf', text: '#ecfdf5', textMuted: 'rgba(209,250,229,0.75)' },
    { name: 'Paper', theme: 'light', bg: '#f5efe4', c1: '#d97706', c2: '#e11d48', c3: '#92400e', c4: '#0f766e', text: '#1a1612', textMuted: 'rgba(42,34,26,0.72)' }
  ];

  function getPresetState(presetId) {
    const preset = PRESETS.find(p => p.id === presetId) || PRESETS[0];
    const st = mergeDeep(DEFAULT_STATE, preset.patch);
    st.presetId = preset.id;
    return st;
  }

  function generateHarmoniousRandom(currentState) {
    const pal = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    const bgTypes = ['mesh', 'aurora', 'grid', 'particles', 'godrays', 'liquid', 'starfield', 'dither'];
    const gridStyles = ['dots', 'squares', 'perspective', 'truchet'];
    const ditherStyles = ['bayer', 'halftone', 'ascii'];
    const textEffects = ['split', 'shimmer', 'liquid', 'scramble', 'glitch'];
    const fonts = ['Inter', 'Space Grotesk', 'Instrument Serif', 'Syne', 'JetBrains Mono'];
    const cardStyles = ['bento', 'liquid', 'holo'];
    const btnStyles = ['magnetic', 'border-beam', 'shimmer', 'ripple'];

    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const bgType = pick(bgTypes);
    const cardStyle = pick(cardStyles);

    return mergeDeep(currentState, {
      presetId: 'custom',
      theme: pal.theme,
      palette: {
        bg: pal.bg,
        c1: pal.c1,
        c2: pal.c2,
        c3: pal.c3,
        c4: pal.c4,
        text: pal.text,
        textMuted: pal.textMuted
      },
      background: {
        enabled: true,
        type: bgType,
        gridStyle: pick(gridStyles),
        ditherStyle: pick(ditherStyles),
        speed: Number((0.7 + Math.random() * 0.8).toFixed(2)),
        scale: Number((0.85 + Math.random() * 0.45).toFixed(2)),
        mouseReactivity: Number((0.6 + Math.random() * 0.4).toFixed(2)),
        opacity: pal.theme === 'light' ? 0.45 : 0.95
      },
      lighting: {
        enabled: true,
        spotlights: pal.theme === 'dark' && Math.random() > 0.35,
        orbs: Math.random() > 0.25,
        cursorSpot: pal.theme === 'dark',
        lensGlow: pal.theme === 'dark' && Math.random() > 0.45,
        grain: Math.random() > 0.25,
        vignette: true,
        vignetteStrength: pal.theme === 'light' ? 0.22 : 0.65
      },
      textfx: {
        enabled: true,
        effect: pick(textEffects),
        font: pick(fonts),
        showMarquee: Math.random() > 0.68,
        showCircular: Math.random() > 0.72
      },
      components: {
        enabled: true,
        cardStyle,
        buttonStyle: pick(btnStyles),
        liquidRefract: cardStyle === 'liquid' && Math.random() > 0.35,
        holoIntensity: Number((0.7 + Math.random() * 0.3).toFixed(2))
      },
      cursor: {
        enabled: true,
        trail: Math.random() > 0.25,
        trailStyle: Math.random() > 0.5 ? 'particles' : 'ribbon',
        clickSparks: true
      }
    });
  }

  Lumina.DEFAULT_STATE = DEFAULT_STATE;
  Lumina.PRESETS = PRESETS;
  Lumina.PALETTES = PALETTES;
  Lumina.deepClone = deepClone;
  Lumina.mergeDeep = mergeDeep;
  Lumina.getPresetState = getPresetState;
  Lumina.generateHarmoniousRandom = generateHarmoniousRandom;
})(window.Lumina);
