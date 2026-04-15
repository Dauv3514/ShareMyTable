import type { Metadata } from "next";
import { ToastContainer } from "react-toastify";
import BottomMenu from "../components/BottomMenu";
import Navbar from "../components/Navbar";
import { AuthProvider } from "./providers/AuthProvider";
import "./globals.scss";
import "react-toastify/dist/ReactToastify.css";

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
      <body>
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
