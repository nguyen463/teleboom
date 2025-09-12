/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},  // Plugin khusus v4—ganti yang lama kalau ada 'tailwindcss'
    autoprefixer: {},
  },
};

module.exports = config;
