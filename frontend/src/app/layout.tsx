import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { CSSProperties } from "react";
import { ToastContainer } from "react-toastify";
import AppChrome from "../components/AppChrome";
import { PwaInstallProvider } from "../components/Pwa";
import { AuthProvider } from "./providers/AuthProvider";
import "./globals.scss";
import "leaflet/dist/leaflet.css";
import "react-toastify/dist/ReactToastify.css";

const clashGrotesk = localFont({
  src: [
    {
      path: "./fonts/ClashGrotesk_Complete/Fonts/WEB/fonts/ClashGrotesk-Extralight.woff2",
      weight: "200",
      style: "normal",
    },
    {
      path: "./fonts/ClashGrotesk_Complete/Fonts/WEB/fonts/ClashGrotesk-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/ClashGrotesk_Complete/Fonts/WEB/fonts/ClashGrotesk-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/ClashGrotesk_Complete/Fonts/WEB/fonts/ClashGrotesk-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/ClashGrotesk_Complete/Fonts/WEB/fonts/ClashGrotesk-Semibold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/ClashGrotesk_Complete/Fonts/WEB/fonts/ClashGrotesk-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-clash-grotesk",
  display: "swap",
});

const alpino = localFont({
  src: "./fonts/Alpino_Complete/Fonts/WEB/fonts/Alpino-Variable.woff2",
  variable: "--font-alpino",
  display: "swap",
  weight: "100 900",
});

const toastStyle = {
  "--toastify-color-success": "#948438",
  "--toastify-icon-color-success": "#948438",
  "--toastify-color-progress-success": "#948438",
} as CSSProperties;

export const metadata: Metadata = {
  title: "RamèneTaPoire",
  description: "Le blablacar des repas",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "RamèneTaPoire",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#7B8613",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className={`${clashGrotesk.variable} ${alpino.variable}`}>
        <AuthProvider>
          <PwaInstallProvider>
            <AppChrome>
              {children}
            </AppChrome>
            <ToastContainer position="top-right" autoClose={3000} theme="dark" style={toastStyle}/>
          </PwaInstallProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
