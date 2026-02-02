import type { Config } from 'tailwindcss';

const config: Config = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                editor: {
                    bg: '#dab495', // User requested Beige
                    surface: '#FFFBF0', // Warm Cream/White from image
                    surfaceHover: '#FDF6E3',
                    border: '#000000',
                    borderLight: '#333333',
                    text: '#000000',
                    textMuted: '#525252',
                    textDim: '#737373',
                    accent: '#FF4D4D', // Pop Art Red
                    accentHover: '#E60000',
                },
            },
            boxShadow: {
                'retro': '4px 4px 0 0 #000000',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
};

export default config;
