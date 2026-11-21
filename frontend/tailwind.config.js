/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F6F5F1',
        ink: '#1A1F2B',
        line: '#DEDCD3',
        role: {
          student: '#1F7A5C',
          'student-soft': '#E7F2ED',
          academic: '#1D4ED8',
          'academic-soft': '#E8EDFC',
          finance: '#A15C07',
          'finance-soft': '#F6EBDA',
          admin: '#5B21B6',
          'admin-soft': '#EFE7FA',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
