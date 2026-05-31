import type { Metadata } from "next";
import localFont from "next/font/local";
import { ToastContainer } from "react-toastify";
import AppChrome from "../components/AppChrome";
import { AuthProvider } from "./providers/AuthProvider";
import "./globals.scss";
import "leaflet/dist/leaflet.css";
import "react-toastify/dist/ReactToastify.css";

const clashGrotesk = localFont({
  src: "./fonts/ClashGrotesk_Complete/Fonts/WEB/fonts/ClashGrotesk-Variable.woff2",
  variable: "--font-clash-grotesk",
  display: "swap",
  weight: "200 700",
});

const alpino = localFont({
  src: "./fonts/Alpino_Complete/Fonts/WEB/fonts/Alpino-Variable.woff2",
  variable: "--font-alpino",
  display: "swap",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "RameneTaPoire",
  description: "Le blablacar des repas",
  icons: {
    icon: "/ramenetapoire.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className={`${clashGrotesk.variable} ${alpino.variable}`}>
        <AuthProvider>
          <AppChrome>
            {children}
          </AppChrome>
          <ToastContainer position="top-right" autoClose={3000} theme="dark" />
        </AuthProvider>
      </body>
    </html>
  );
}
