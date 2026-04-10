"use client";

import axios from "axios";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

type AuthUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  pseudo: string | null;
  country: string | null;
  city: string | null;
  bio: string | null;
  profilePhotoUrl: string | null;
  role: string | null;
  birthDate: string | null;
  isProfileComplete: boolean;
};

type AuthContextType = {
  isLoggedIn: boolean;
  loading: boolean;
  user: AuthUser | null;
  login: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

const AUTH_CHANGE_EVENT = "auth-change";

 // Règle les problèmes d'hydratation en s'assurant que le composant est monté avant de lire le token
function subscribe(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = () => callback();

  window.addEventListener("storage", handler);
  window.addEventListener(AUTH_CHANGE_EVENT, handler);

  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(AUTH_CHANGE_EVENT, handler);
  };
}

function getAuthSnapshot() {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(localStorage.getItem("token"));
}

function getHydrationSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const hydrated = useSyncExternalStore(subscribe, getHydrationSnapshot, getServerSnapshot);
  const isLoggedIn = useSyncExternalStore(subscribe, getAuthSnapshot, getServerSnapshot);
  const [user, setUser] = useState<AuthUser | null>(null);
  const loading = !hydrated;

  useEffect(() => {
    let cancelled = false;

    const syncCurrentUser = async () => {
      if (!hydrated) {
        return;
      }

      if (!isLoggedIn) {
        if (!cancelled) {
          setUser(null);
        }
        return;
      }

      const token = localStorage.getItem("token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      if (!token || !apiUrl) {
        if (!cancelled) {
          setUser(null);
        }
        return;
      }

      try {
        const response = await axios.get(`${apiUrl}/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (cancelled) {
          return;
        }

        setUser({
          id: response.data.userId,
          firstName: response.data.prenom ?? "",
          lastName: response.data.nom ?? "",
          email: response.data.email ?? "",
          phone: response.data.phone ?? null,
          pseudo: response.data.pseudo ?? null,
          country: response.data.pays ?? null,
          city: response.data.ville ?? null,
          bio: response.data.biographie ?? null,
          profilePhotoUrl: response.data.profilePhotoUrl ?? null,
          role: response.data.role ?? null,
          birthDate: response.data.birthDate ?? null,
          isProfileComplete: Boolean(response.data.isProfileComplete),
        });
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      }
    };

    void syncCurrentUser();

    return () => {
      cancelled = true;
    };
  }, [hydrated, isLoggedIn]);

  const login = (token: string) => {
    localStorage.setItem("token", token);
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  };

  const logout = () => {
    localStorage.removeItem("token");
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};