// Tailwind runtime config for CDN build
tailwind.config = {
  theme: {
    extend: {
      colors: {
        primary: '#164e63',
        secondary: '#00bcd4',
        accent: '#00bcd4',
        muted: '#f0f4f8',
        'muted-foreground': '#6b7280',
        card: '#ecfeff',
        'card-foreground': '#164e63',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
};
