/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./**/*.{html,js}"],
    theme: {
        extend: {
            fontFamily: {
                'mono': ['JetBrains Mono', 'monospace'],
                'sans': ['Inter', 'sans-serif'],
            },
            colors: {
                'tech': {
                    'primary': '#000000',
                    'violet': '#E6D6FF',
                    'pink': '#FFB3E6',
                    'green': '#B3FFB3',
                    'lime': '#CCFF99',
                }
            },
            backgroundImage: {
                'futuristic': 'linear-gradient(90deg, #E6D6FF 0%, #FFB3E6 35%, #B3FFB3 70%, #CCFF99 100%)',
            },
            backdropBlur: {
                'tech': '10px',
            }
        },
    },
    plugins: [],
} 