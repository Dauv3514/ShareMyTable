import type { Metadata } from "next";
import "./globals.scss";
import Navbar from "../components/Navbar";
import BottomMenu from "../components/BottomMenu";
import { Open_Sans, Merriweather_Sans } from "next/font/google";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider } from "./providers/AuthProvider";

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-open-sans",
  display: "swap",
});

const merriweatherSans = Merriweather_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-merriweather-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RamèneTaPoire",
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
              {/* Contenu spécifique à chaque page */}
              <main className="page-container">{children}</main>
            </div>

            <BottomMenu />

            {/* Notifications globales */}
            <ToastContainer position="top-right" autoClose={3000} theme="dark" />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}