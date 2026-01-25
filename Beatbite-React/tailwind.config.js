/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      colors: {
        // Shader Lab design system
        shader: {
          bg: {
            dark: '#050505',
            card: '#0a0a0a',
            hover: '#111111',
          },
          border: '#1a1a1a',
          text: {
            primary: '#ffffff',
            secondary: '#888888',
            muted: '#444444',
          },
          accent: {
            cyan: '#00ffff',
            magenta: '#ff00ff',
            yellow: '#ffff00',
          },
        },
        // Keep beatbite colors for backward compatibility
        beatbite: {
          purple: {
            50: '#f5f3ff',
            100: '#ede9fe',
            200: '#ddd6fe',
            300: '#c4b5fd',
            400: '#a78bfa',
            500: '#8b5cf6',
            600: '#7c3aed',
            700: '#6d28d9',
            800: '#5b21b6',
            900: '#4c1d95',
          },
        },
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 1.5s ease-in-out infinite alternate',
        'glow-cyan': 'glow-cyan 2s ease-in-out infinite alternate',
        'scan': 'scan 2s linear infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' },
          '100%': { boxShadow: '0 0 40px rgba(139, 92, 246, 0.6)' },
        },
        'glow-cyan': {
          '0%': { boxShadow: '0 0 20px rgba(0, 255, 255, 0.2)' },
          '100%': { boxShadow: '0 0 40px rgba(0, 255, 255, 0.4)' },
        },
        scan: {
          '0%': { left: '0' },
          '100%': { left: '100%' },
        },
      },
      borderRadius: {
        'card': '16px',
      },
      backgroundImage: {
        'gradient-shader': 'linear-gradient(135deg, #00ffff 0%, #ff00ff 100%)',
        'gradient-shader-2': 'linear-gradient(135deg, #ff00ff 0%, #ffff00 100%)',
        'gradient-shader-3': 'linear-gradient(135deg, #ffff00 0%, #00ffff 100%)',
      },
    },
  },
  plugins: [],
};
