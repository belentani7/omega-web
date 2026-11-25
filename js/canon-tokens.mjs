/**
 * Tokens de marca CANON — paleta del artista para sus propiedades web.
 *
 * Convive a propósito con la paleta del universo Judas Cosmos definida en
 * `css/omega.css` (`--red #ff003c`, `--gold #ffd45c`, `--cyan #65f7ff`):
 * CANON identifica al autor; la paleta de OMEGA identifica la obra.
 * Este módulo es la fuente de verdad ejecutable y está cubierto por tests.
 */

export const CANON = {
  colors: {
    black: '#050505',
    violet: {
      from: '#7A2BFF',
      to: '#9B5CFF',
      gradient: 'linear-gradient(135deg, #7A2BFF 0%, #9B5CFF 100%)'
    },
    neonRed: '#FF073A',
    gold: '#D4AF37',
    cyan: '#4de8e0',

    background: '#050505',
    surface: '#0A0A0A',
    surfaceElevated: '#121212',
    border: '#2A2A2A',
    borderFocus: '#7A2BFF',

    textPrimary: '#FFFFFF',
    textSecondary: '#B3B3B3',
    textMuted: '#666666',
    textInverse: '#050505',

    success: '#00D4AA',
    warning: '#FFB800',
    error: '#FF3B30',
    info: '#0A84FF',
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
    xxxl: '64px'
  },

  typography: {
    fontFamily: {
      sans: '"Sora", "Inter", system-ui, sans-serif',
      mono: '"JetBrains Mono", "Fira Code", monospace',
      display: '"Sora", system-ui, sans-serif'
    },
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '32px',
      '4xl': '48px',
      '5xl': '64px'
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    },
    lineHeight: {
      tight: 1.1,
      normal: 1.5,
      relaxed: 1.75
    }
  },

  borderRadius: {
    none: '0',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px'
  },

  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
    md: '0 4px 8px rgba(0, 0, 0, 0.4)',
    lg: '0 8px 16px rgba(0, 0, 0, 0.5)',
    xl: '0 16px 32px rgba(0, 0, 0, 0.6)',
    glow: '0 0 24px rgba(122, 43, 255, 0.3)',
    glowRed: '0 0 24px rgba(255, 7, 58, 0.3)',
    glowGold: '0 0 24px rgba(212, 175, 55, 0.3)'
  },

  transitions: {
    fast: '150ms ease-out',
    normal: '250ms ease-out',
    slow: '350ms ease-out'
  },

  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  },

  zIndex: {
    dropdown: 100,
    sticky: 200,
    fixed: 300,
    modalBackdrop: 400,
    modal: 500,
    popover: 600,
    tooltip: 700
  }
};
