export type ThemeType = 'luxury' | 'premium' | 'classic'

export const themes = {
  luxury: {
    name: 'Luxury',
    bg: 'bg-black',
    surface: 'bg-zinc-900',
    card: 'bg-zinc-800',
    text: 'text-gold-400',
    textMuted: 'text-zinc-400',
    textBody: 'text-zinc-100',
    border: 'border-gold-500/30',
    btn: 'bg-gold-500 hover:bg-gold-400 text-black',
    btnSecondary: 'bg-zinc-800 hover:bg-zinc-700 text-gold-400 border border-gold-500/30',
    font: 'font-playfair',
    accent: '#C9A84C',
    cssVars: {
      '--color-primary': '#C9A84C',
      '--color-bg': '#000000',
      '--color-surface': '#18181b',
      '--color-card': '#27272a',
      '--color-text': '#C9A84C',
      '--color-text-body': '#f4f4f5',
    }
  },
  premium: {
    name: 'Premium',
    bg: 'bg-gray-50',
    surface: 'bg-white',
    card: 'bg-gray-100',
    text: 'text-gold-600',
    textMuted: 'text-gray-500',
    textBody: 'text-gray-800',
    border: 'border-gold-400/40',
    btn: 'bg-gold-500 hover:bg-gold-600 text-white',
    btnSecondary: 'bg-white hover:bg-gray-50 text-gold-600 border border-gold-400',
    font: 'font-cormorant',
    accent: '#A07830',
    cssVars: {
      '--color-primary': '#A07830',
      '--color-bg': '#f9fafb',
      '--color-surface': '#ffffff',
      '--color-card': '#f3f4f6',
      '--color-text': '#A07830',
      '--color-text-body': '#1f2937',
    }
  },
  classic: {
    name: 'Classic',
    bg: 'bg-amber-50',
    surface: 'bg-orange-50',
    card: 'bg-white',
    text: 'text-orange-800',
    textMuted: 'text-orange-600',
    textBody: 'text-gray-700',
    border: 'border-orange-300',
    btn: 'bg-orange-600 hover:bg-orange-700 text-white',
    btnSecondary: 'bg-white hover:bg-orange-50 text-orange-700 border border-orange-300',
    font: 'font-lato',
    accent: '#C2410C',
    cssVars: {
      '--color-primary': '#C2410C',
      '--color-bg': '#fffbeb',
      '--color-surface': '#fff7ed',
      '--color-card': '#ffffff',
      '--color-text': '#9a3412',
      '--color-text-body': '#374151',
    }
  }
}

export function getTheme(type: ThemeType) {
  return themes[type] || themes.luxury
}
