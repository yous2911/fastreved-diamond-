/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette diamant magique
        diamond: {
          50: '#fefefe',
          100: '#fdfdfd', 
          200: '#f8f9ff',
          300: '#f1f4ff',
          400: '#e1e8ff',
          500: '#c7d2ff',
          600: '#a5b4ff',
          700: '#8b9fff',
          800: '#6366f1',
          900: '#4f46e5'
        },
        
        // Cristaux magiques
        crystal: {
          violet: '#8b5cf6',
          blue: '#3b82f6', 
          green: '#10b981',
          yellow: '#f59e0b',
          pink: '#ec4899',
          orange: '#f97316'
        },
        
        // Magie environnementale  
        magic: {
          forest: '#065f46',
          castle: '#7c3aed',
          ocean: '#0ea5e9',
          sky: '#38bdf8',
          fire: '#f97316',
          ice: '#06b6d4'
        }
      },
      
      // Animations premium
      animation: {
        'crystal-float': 'crystalFloat 3s ease-in-out infinite',
        'crystal-pulse': 'crystalPulse 2s ease-in-out infinite',
        'mascot-bounce': 'mascotBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'mascot-dance': 'mascotDance 1.2s ease-in-out infinite',
        'sparkle-twinkle': 'sparkleTwinkle 1.5s ease-in-out infinite',
        'magic-shimmer': 'magicShimmer 2.5s ease-in-out infinite',
        'confetti-burst': 'confettiBurst 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'level-up-burst': 'levelUpBurst 2s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'bg-float': 'bgFloat 20s ease-in-out infinite',
        'aurora': 'aurora 10s ease-in-out infinite'
      },
      
      keyframes: {
        // Cristaux magiques
        crystalFloat: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg) scale(1)' },
          '50%': { transform: 'translateY(-10px) rotate(180deg) scale(1.05)' }
        },
        crystalPulse: {
          '0%, 100%': { transform: 'scale(1)', filter: 'brightness(1)' },
          '50%': { transform: 'scale(1.1)', filter: 'brightness(1.3)' }
        },
        
        // Mascotte premium
        mascotBounce: {
          '0%': { transform: 'translateY(0) scale(1)' },
          '40%': { transform: 'translateY(-20px) scale(1.1)' },
          '70%': { transform: 'translateY(-5px) scale(1.05)' },
          '100%': { transform: 'translateY(0) scale(1)' }
        },
        mascotDance: {
          '0%, 100%': { transform: 'rotate(-5deg) translateX(0)' },
          '25%': { transform: 'rotate(5deg) translateX(5px)' },
          '75%': { transform: 'rotate(-3deg) translateX(-3px)' }
        },
        
        // Particules magiques
        sparkleTwinkle: {
          '0%, 100%': { opacity: '0', transform: 'scale(0) rotate(0deg)' },
          '50%': { opacity: '1', transform: 'scale(1) rotate(180deg)' }
        },
        magicShimmer: {
          '0%': { transform: 'translateX(-100%) skewX(-15deg)' },
          '100%': { transform: 'translateX(200%) skewX(-15deg)' }
        },
        confettiBurst: {
          '0%': { transform: 'scale(0) rotate(0deg)', opacity: '0' },
          '50%': { transform: 'scale(1.5) rotate(180deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(360deg)', opacity: '0.8' }
        },
        levelUpBurst: {
          '0%': { transform: 'scale(0) rotate(-180deg)', opacity: '0' },
          '50%': { transform: 'scale(1.5) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' }
        },
        
        // Background magique
        bgFloat: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '33%': { transform: 'translateY(-20px) rotate(120deg)' },
          '66%': { transform: 'translateY(10px) rotate(240deg)' }
        },
        aurora: {
          '0%, 100%': { filter: 'hue-rotate(0deg) brightness(1)' },
          '50%': { filter: 'hue-rotate(180deg) brightness(1.2)' }
        }
      },
      
      // Ombres premium
      boxShadow: {
        'magical': '0 0 20px rgba(139, 92, 246, 0.3), 0 0 40px rgba(139, 92, 246, 0.1)',
        'crystal': '0 0 30px rgba(59, 130, 246, 0.4), inset 0 0 20px rgba(255, 255, 255, 0.1)',
        'diamond': '0 0 50px rgba(255, 255, 255, 0.2), 0 0 100px rgba(139, 92, 246, 0.1)',
        'glow': '0 0 15px currentColor'
      },
      
      // Gradients premium
      backgroundImage: {
        'magical-gradient': 'linear-gradient(45deg, #8b5cf6, #3b82f6, #10b981, #f59e0b)',
        'crystal-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.3))',
        'diamond-gradient': 'radial-gradient(circle, rgba(255,255,255,0.2), transparent)',
        'aurora-gradient': 'linear-gradient(90deg, #8b5cf6, #3b82f6, #10b981, #f59e0b, #ec4899)'
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography')
  ]
};

