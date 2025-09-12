// src/app/layout.js
import localFont from 'next/font/local';
import "./globals.css";
import { ThemeProvider } from '../components/ThemeContext';

// Muat font lokal dari file yang sudah Anda tambahkan
const geist = localFont({
  src: [
    {
      path: '../fonts/Geist-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../fonts/Geist-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-geist', // Opsional: untuk digunakan dengan CSS variables
});

export const metadata = {
  title: "Rocket.Chat Clone",
  description: "A real-time chat application.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/* Terapkan class font ke body.
        ThemeProvider membungkus seluruh children (semua halaman)
        agar theme context bisa diakses di mana saja.
      */}
      <body className={geist.className}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
