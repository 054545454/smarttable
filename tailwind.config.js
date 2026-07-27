/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          100: '#FFF8E7',
          200: '#FFE9A0',
          300: '#F5D060',
          400: '#D4AF37',
          500: '#C9A84C',
          600: '#A07830',
          700: '#7A5C1E',
        },
      },
      fontFamily: {
        playfair: ['Playfair Display', 'serif'],
        cormorant: ['Cormorant Garamond', 'serif'],
        lato: ['Lato', 'sans-serif'],
      },
      animation: {
        'scratch-reveal': 'scratchReveal 0.8s ease-out forwards',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-urgent': 'pulseUrgent 1.5s infinite',
      },
      keyframes: {
        scratchReveal: {
          '0%': { opacity: 0, transform: 'scale(0.8)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        slideUp: {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        pulseUrgent: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.7)' },
          '50%': { boxShadow: '0 0 0 10px rgba(239, 68, 68, 0)' },
        },
      },
    },
  },
  plugins: [],
}
