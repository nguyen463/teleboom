// src/app/layout.js
import "tailwindcss/tailwind.css";
import localFont from 'next/font/local';
import "./globals.css";

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
      {/* Terapkan class font ke body */}
      <body className={geist.className}>
        {children}
      </body>
    </html>
  );
}
