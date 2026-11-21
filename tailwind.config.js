/**
 * Dino Selector design tokens ("Specimen Sticker" system).
 *
 * Raw scales are hex. Semantic colours read CSS variables (RGB channel
 * triplets defined in src/style.css) so they can be re-themed per scope
 * (`.theme-jungle` = dark scope) and still support Tailwind's `/alpha` syntax.
 *
 * Legacy tokens (`earth-*`, `fossil-*`, `font-display`, `font-body`) are kept
 * so the pre-rebuild views keep rendering. Do not use them in new code.
 *
 * @type {import('tailwindcss').Config}
 */
const v = (name) => `rgb(var(--c-${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Semantic (use these first) ──────────────────────────────────
        bg: v('bg'),
        surface: {
          DEFAULT: v('surface'),
          sunken: v('surface-sunken'),
          raised: v('surface-raised'),
        },
        ink: {
          DEFAULT: v('ink'),
          muted: v('ink-muted'),
          subtle: v('ink-subtle'),
          inverse: v('ink-inverse'),
        },
        line: {
          DEFAULT: v('line'),
          strong: v('line-strong'),
        },
        primary: {
          DEFAULT: v('primary'),
          hover: v('primary-hover'),
          strong: v('primary-strong'),
          soft: v('primary-soft'),
        },
        'on-primary': v('on-primary'),
        accent: {
          DEFAULT: v('accent'),
          soft: v('accent-soft'),
        },
        'on-accent': v('on-accent'),
        focus: v('focus'),
        success: { DEFAULT: v('success'), soft: v('success-soft') },
        warning: { DEFAULT: v('warning'), soft: v('warning-soft') },
        danger: { DEFAULT: v('danger'), soft: v('danger-soft') },
        info: { DEFAULT: v('info'), soft: v('info-soft') },

        // ── Raw scales ──────────────────────────────────────────────────
        // Lichen: green-grey neutrals (paper, lines, ink)
        lichen: {
          50: '#F7F8F1',
          100: '#EEF0E5',
          200: '#E2E5D6',
          300: '#CDD2BE',
          400: '#A9B09B',
          500: '#7F8875',
          600: '#5D6657',
          700: '#434B40',
          800: '#2D342C',
          900: '#1E2420',
          950: '#141915',
        },
        // Jungle: brand deep teal-green (nav, stages, dark scopes)
        jungle: {
          50: '#E8F3EF',
          100: '#C9E3DA',
          200: '#97C8B8',
          300: '#5FA893',
          400: '#368873',
          500: '#1F6B5C',
          600: '#17574C',
          700: '#12463F',
          800: '#0F3934',
          900: '#0B2B28',
          950: '#071D1B',
        },
        // Resin: amber, the primary accent (fossilised amber)
        resin: {
          50: '#FFF7E6',
          100: '#FFEBC2',
          200: '#FFD98A',
          300: '#FBC458',
          400: '#F5AE36',
          500: '#E8951A',
          600: '#C47410',
          700: '#9A5710',
          800: '#743F12',
          900: '#4F2C0E',
        },
        // Magma: hot pink-red, delight and focus
        magma: {
          50: '#FDEEF2',
          100: '#FAD3DE',
          200: '#F4A3BA',
          300: '#EC7394',
          400: '#E34E77',
          500: '#D2335F',
          600: '#B0234D',
          700: '#8B1C3E',
          800: '#661630',
          900: '#430F20',
        },
        // Lagoon: blue, info and marine
        lagoon: {
          50: '#EAF5FA',
          100: '#CBE6F2',
          200: '#97CCE4',
          300: '#5FADD1',
          400: '#3A91BA',
          500: '#27779D',
          600: '#1F5F7E',
          700: '#1A4B63',
          800: '#153A4C',
          900: '#0F2835',
        },
        // Fern: green, herbivores and success
        fern: {
          50: '#EEF7EC',
          100: '#D4ECCF',
          200: '#A9D8A0',
          300: '#7BBF70',
          400: '#56A44C',
          500: '#3E8A37',
          600: '#316F2D',
          700: '#285826',
          800: '#1F421F',
          900: '#152D16',
        },
        // Plum: insectivores, cretaceous
        plum: {
          50: '#F2F0FA',
          100: '#DEDAF2',
          200: '#BEB6E4',
          300: '#9A8ED2',
          400: '#7A6CBE',
          500: '#6254A6',
          600: '#4E4388',
          700: '#3D356A',
          800: '#2D284E',
          900: '#1E1B33',
        },

        // ── Domain aliases ──────────────────────────────────────────────
        diet: {
          herbivore: '#3E8A37',
          carnivore: '#D2335F',
          omnivore: '#E8951A',
          piscivore: '#27779D',
          insectivore: '#6254A6',
        },
        period: {
          triassic: '#B9562A',
          jurassic: '#1F6B5C',
          cretaceous: '#6254A6',
        },

        // ── Legacy (pre-rebuild views; do not use in new code) ──────────
        earth: {
          950: '#1a1208',
          900: '#2a1e0d',
          800: '#3d2c14',
          700: '#4e3a1c',
          600: '#6b4e27',
          500: '#8a6a3d',
          400: '#a8875a',
        },
        fossil: {
          50: '#f5f0e8',
          100: '#ede5d4',
          200: '#ddd0b8',
        },
      },

      fontFamily: {
        // UI
        display: ['Caprasimo', '"Schibsted Grotesk"', 'Georgia', 'serif'],
        sans: ['"Schibsted Grotesk"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        body: ['"Schibsted Grotesk"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        // Shirt Studio extras (also usable for badges/posters)
        varsity: ['Graduate', '"Big Shoulders Display"', 'serif'],
        rounded: ['Fredoka', '"Schibsted Grotesk"', 'sans-serif'],
        condensed: ['"Big Shoulders Display"', '"Schibsted Grotesk"', 'sans-serif'],
      },

      fontSize: {
        // [size, { lineHeight, letterSpacing }]
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
        xs: ['0.75rem', { lineHeight: '1.1rem' }],
        sm: ['0.875rem', { lineHeight: '1.3rem' }],
        base: ['1rem', { lineHeight: '1.55rem' }],
        lg: ['1.125rem', { lineHeight: '1.7rem' }],
        xl: ['1.25rem', { lineHeight: '1.8rem' }],
        // Display steps: pair with font-display
        'display-xs': ['1.5rem', { lineHeight: '1.15', letterSpacing: '-0.005em' }],
        'display-sm': ['1.875rem', { lineHeight: '1.1', letterSpacing: '-0.01em' }],
        'display-md': ['2.375rem', { lineHeight: '1.05', letterSpacing: '-0.015em' }],
        'display-lg': ['3rem', { lineHeight: '1', letterSpacing: '-0.02em' }],
        'display-xl': ['3.75rem', { lineHeight: '0.98', letterSpacing: '-0.025em' }],
        'display-2xl': ['4.75rem', { lineHeight: '0.95', letterSpacing: '-0.03em' }],
      },

      borderRadius: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '18px',
        xl: '26px',
        '2xl': '34px',
        blob: '42% 58% 55% 45% / 52% 44% 56% 48%',
      },

      boxShadow: {
        // Hard offset "sticker" shadows, tinted ink, never grey blur
        'sticker-sm': '2px 2px 0 0 rgb(var(--c-shadow))',
        sticker: '3px 4px 0 0 rgb(var(--c-shadow))',
        'sticker-lg': '6px 7px 0 0 rgb(var(--c-shadow))',
        // White die-cut keyline + offset (avatars, stickers on paper)
        diecut: '0 0 0 4px rgb(var(--c-keyline)), 4px 6px 0 4px rgb(var(--c-shadow) / 0.9)',
        'diecut-sm': '0 0 0 3px rgb(var(--c-keyline)), 2px 3px 0 3px rgb(var(--c-shadow) / 0.9)',
        // Soft lift for overlays only (modal, sheet, popover)
        lift: '0 18px 40px -14px rgb(11 43 40 / 0.45), 0 2px 6px rgb(11 43 40 / 0.12)',
        inset: 'inset 0 2px 0 0 rgb(var(--c-shadow) / 0.08)',
      },

      transitionDuration: {
        instant: '80ms',
        fast: '140ms',
        base: '220ms',
        slow: '360ms',
        reveal: '700ms',
      },

      transitionTimingFunction: {
        out: 'cubic-bezier(0.25, 1, 0.5, 1)',
        'in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },

      keyframes: {
        // legacy
        'slide-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        // feedback
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.6)' },
          '60%': { opacity: '1', transform: 'scale(1.06)' },
          '100%': { transform: 'scale(1)' },
        },
        'sticker-slap': {
          '0%': { opacity: '0', transform: 'scale(1.35) rotate(var(--tilt, -4deg))' },
          '55%': { opacity: '1', transform: 'scale(0.96) rotate(var(--tilt, -4deg))' },
          '100%': { transform: 'scale(1) rotate(var(--tilt, -4deg))' },
        },
        'sheet-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(12px) scale(0.96)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'modal-in': {
          from: { opacity: '0', transform: 'translateY(10px) scale(0.97)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        shimmer: { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
        'bar-grow': { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
        wiggle: {
          '0%, 100%': { transform: 'rotate(0)' },
          '25%': { transform: 'rotate(-6deg)' },
          '75%': { transform: 'rotate(6deg)' },
        },
        bob: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        stamp: {
          '0%': { opacity: '0', transform: 'scale(2) rotate(-12deg)' },
          '70%': { opacity: '1', transform: 'scale(0.92) rotate(-8deg)' },
          '100%': { transform: 'scale(1) rotate(-8deg)' },
        },
        // Quiz reveal: egg wobbles, cracks, shell halves fly, dino pops
        'egg-wobble': {
          '0%, 100%': { transform: 'rotate(0)' },
          '15%': { transform: 'rotate(-8deg)' },
          '30%': { transform: 'rotate(7deg)' },
          '45%': { transform: 'rotate(-5deg)' },
          '60%': { transform: 'rotate(4deg)' },
          '75%': { transform: 'rotate(-2deg)' },
        },
        'shell-left': {
          to: { opacity: '0', transform: 'translate(-60px, 40px) rotate(-35deg)' },
        },
        'shell-right': {
          to: { opacity: '0', transform: 'translate(60px, 40px) rotate(35deg)' },
        },
        'hatch-pop': {
          '0%': { opacity: '0', transform: 'translateY(30px) scale(0.5)' },
          '60%': { opacity: '1', transform: 'translateY(-8px) scale(1.08)' },
          '100%': { transform: 'translateY(0) scale(1)' },
        },
        'confetti-fall': {
          '0%': { opacity: '1', transform: 'translate3d(0, -20px, 0) rotate(0)' },
          '100%': { opacity: '0', transform: 'translate3d(var(--drift, 20px), 240px, 0) rotate(540deg)' },
        },
      },

      animation: {
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 220ms cubic-bezier(0.25, 1, 0.5, 1)',
        'pop-in': 'pop-in 360ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'sticker-slap': 'sticker-slap 420ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'sheet-up': 'sheet-up 300ms cubic-bezier(0.25, 1, 0.5, 1) both',
        'toast-in': 'toast-in 260ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'modal-in': 'modal-in 220ms cubic-bezier(0.25, 1, 0.5, 1) both',
        shimmer: 'shimmer 1.6s linear infinite',
        'bar-grow': 'bar-grow 700ms cubic-bezier(0.25, 1, 0.5, 1) both',
        wiggle: 'wiggle 400ms cubic-bezier(0.65, 0, 0.35, 1)',
        bob: 'bob 3.2s cubic-bezier(0.65, 0, 0.35, 1) infinite',
        stamp: 'stamp 480ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'egg-wobble': 'egg-wobble 600ms cubic-bezier(0.65, 0, 0.35, 1) 2',
        'shell-left': 'shell-left 450ms cubic-bezier(0.25, 1, 0.5, 1) forwards',
        'shell-right': 'shell-right 450ms cubic-bezier(0.25, 1, 0.5, 1) forwards',
        'hatch-pop': 'hatch-pop 520ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'confetti-fall': 'confetti-fall 1200ms cubic-bezier(0.25, 1, 0.5, 1) forwards',
      },

      zIndex: {
        nav: '40',
        sheet: '50',
        modal: '60',
        toast: '70',
        tooltip: '80',
      },
    },
  },
  plugins: [],
}
