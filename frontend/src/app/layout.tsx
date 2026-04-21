import type { Metadata } from "next";
import { Merriweather_Sans, Open_Sans } from "next/font/google";
import { ToastContainer } from "react-toastify";
import BottomMenu from "../components/BottomMenu";
import Navbar from "../components/Navbar";
import { AuthProvider } from "./providers/AuthProvider";
import "./globals.scss";
import "leaflet/dist/leaflet.css";
import "react-toastify/dist/ReactToastify.css";

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
});

const merriweatherSans = Merriweather_Sans({
  subsets: ["latin"],
  variable: "--font-merriweather-sans",
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
      <body className={`${openSans.variable} ${merriweatherSans.variable}`}>
        <AuthProvider>
          <div className="app-shell">
            <Navbar />

            <div className="app-shell__content">
              <main className="page-container">{children}</main>
            </div>

            <BottomMenu />

            <ToastContainer position="top-right" autoClose={3000} theme="dark" />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
