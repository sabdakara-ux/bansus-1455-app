import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BANSUS 1455 - Mobile App",
  description: "Aplikasi Manajemen BANSUS 1455",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link 
          rel="stylesheet" 
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" 
        />
      </head>
      <body className="bg-gray-100 text-gray-800 antialiased">
        {children}
      </body>
    </html>
  );
}
