"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Download, Share2, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import { fetchUnreadMessagesCount } from "@/lib/messaging";
import styles from "./pwa-install.module.scss";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

type NavigatorWithBadges = Navigator & {
  clearAppBadge?: () => Promise<void>;
  setAppBadge?: (contents?: number) => Promise<void>;
};

export type PushNotificationPreferences = {
  messages: boolean;
  reservations: boolean;
  mealReminders: boolean;
  hostStatus: boolean;
};

type PwaInstallContextValue = {
  canInstall: boolean;
  isInstalled: boolean;
  isIosInstall: boolean;
  notificationPermission: NotificationPermission | "unsupported";
  notificationPreferences: PushNotificationPreferences;
  notificationPreferencesLoading: boolean;
  pushNotificationsEnabled: boolean;
  pushNotificationsSupported: boolean;
  showProfileInstallEntry: boolean;
  disablePushNotifications: () => Promise<{
    success: boolean;
    message: string;
  }>;
  enablePushNotifications: () => Promise<{
    success: boolean;
    message: string;
  }>;
  updateNotificationPreferences: (
    preferences: Partial<PushNotificationPreferences>,
  ) => Promise<{
    success: boolean;
    message: string;
  }>;
  openInstallPrompt: () => Promise<void>;
  dismissInstallPrompt: () => void;
  showInstallNudge: () => void;
};

const PWA_DISMISS_KEY = "ramene-ta-poire:pwa-install-dismissed-at";
const PWA_MESSAGING_NUDGE_KEY = "ramene-ta-poire:pwa-install-messaging-nudge";
const PWA_RESERVATION_NUDGE_KEY = "ramene-ta-poire:pwa-install-reservation-nudge";
const PWA_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export const PWA_INSTALL_NUDGE_EVENT = "ramene-ta-poire:pwa-install-nudge";
export const PWA_BADGE_REFRESH_EVENT = "ramene-ta-poire:pwa-badge-refresh";

const DEFAULT_PUSH_NOTIFICATION_PREFERENCES: PushNotificationPreferences = {
  messages: true,
  reservations: true,
  mealReminders: true,
  hostStatus: true,
};

const PwaInstallContext = createContext<PwaInstallContextValue>({
  canInstall: false,
  isInstalled: false,
  isIosInstall: false,
  notificationPermission: "unsupported",
  notificationPreferences: DEFAULT_PUSH_NOTIFICATION_PREFERENCES,
  notificationPreferencesLoading: false,
  pushNotificationsEnabled: false,
  pushNotificationsSupported: false,
  showProfileInstallEntry: false,
  disablePushNotifications: async () => ({
    success: false,
    message: "Notifications indisponibles.",
  }),
  enablePushNotifications: async () => ({
    success: false,
    message: "Notifications indisponibles.",
  }),
  updateNotificationPreferences: async () => ({
    success: false,
    message: "Préférences indisponibles.",
  }),
  openInstallPrompt: async () => undefined,
  dismissInstallPrompt: () => undefined,
  showInstallNudge: () => undefined,
});

const isDismissedRecently = () => {
  if (typeof window === "undefined") {
    return true;
  }

  const rawDismissedAt = window.localStorage.getItem(PWA_DISMISS_KEY);
  const dismissedAt = rawDismissedAt ? Number(rawDismissedAt) : 0;

  return Boolean(dismissedAt && Date.now() - dismissedAt < PWA_COOLDOWN_MS);
};

const isStandaloneDisplay = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const navigatorWithStandalone = window.navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
};

const isIosDevice = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  const isClassicIos = /iphone|ipad|ipod/.test(userAgent);
  const isIpadDesktopMode =
    window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1;

  return isClassicIos || isIpadDesktopMode;
};

const isPushSupported = () =>
  typeof window !== "undefined" &&
  "Notification" in window &&
  "serviceWorker" in navigator &&
  "PushManager" in window;

const setApplicationBadge = async (count: number) => {
  if (typeof navigator === "undefined") {
    return;
  }

  const badgeNavigator = navigator as NavigatorWithBadges;

  try {
    if (count > 0 && badgeNavigator.setAppBadge) {
      await badgeNavigator.setAppBadge(count);
      return;
    }

    if (count <= 0 && badgeNavigator.clearAppBadge) {
      await badgeNavigator.clearAppBadge();
    }
  } catch {
    // La Badging API est progressive: si elle échoue, l'app reste utilisable.
  }
};

const normalizeNotificationPreferences = (
  payload: Partial<PushNotificationPreferences>,
): PushNotificationPreferences => ({
  messages:
    typeof payload.messages === "boolean"
      ? payload.messages
      : DEFAULT_PUSH_NOTIFICATION_PREFERENCES.messages,
  reservations:
    typeof payload.reservations === "boolean"
      ? payload.reservations
      : DEFAULT_PUSH_NOTIFICATION_PREFERENCES.reservations,
  mealReminders:
    typeof payload.mealReminders === "boolean"
      ? payload.mealReminders
      : DEFAULT_PUSH_NOTIFICATION_PREFERENCES.mealReminders,
  hostStatus:
    typeof payload.hostStatus === "boolean"
      ? payload.hostStatus
      : DEFAULT_PUSH_NOTIFICATION_PREFERENCES.hostStatus,
});

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
};

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isLoggedIn, user } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIosInstall, setIsIosInstall] = useState(false);
  const [isCoolingDown, setIsCoolingDown] = useState(true);
  const [isNudgeVisible, setIsNudgeVisible] = useState(false);
  const [pendingActionNudge, setPendingActionNudge] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");
  const [notificationPreferences, setNotificationPreferences] =
    useState<PushNotificationPreferences>(DEFAULT_PUSH_NOTIFICATION_PREFERENCES);
  const [notificationPreferencesLoading, setNotificationPreferencesLoading] =
    useState(false);
  const [pushNotificationsSupported, setPushNotificationsSupported] = useState(false);
  const [hasPushSubscription, setHasPushSubscription] = useState(false);

  const canInstall = useMemo(
    () =>
      hasMounted &&
      !isInstalled &&
      !isCoolingDown &&
      (Boolean(deferredPrompt) || isIosInstall),
    [deferredPrompt, hasMounted, isCoolingDown, isInstalled, isIosInstall],
  );
  const showProfileInstallEntry = hasMounted && !isInstalled;
  const pushNotificationsEnabled =
    pushNotificationsSupported &&
    notificationPermission === "granted" &&
    hasPushSubscription;

  const showInstallNudge = useCallback(() => {
    if (!canInstall) {
      return;
    }

    setIsNudgeVisible(true);
  }, [canInstall]);

  const refreshAppBadge = useCallback(async () => {
    if (!hasMounted) {
      return;
    }

    if (!isLoggedIn || !user) {
      await setApplicationBadge(0);
      return;
    }

    const token = window.localStorage.getItem("token");

    if (!token) {
      await setApplicationBadge(0);
      return;
    }

    try {
      const unreadCount = await fetchUnreadMessagesCount(token);
      await setApplicationBadge(unreadCount);
    } catch {
      // Le badge ne doit jamais bloquer l'app si l'API ou le réseau répond mal.
    }
  }, [hasMounted, isLoggedIn, user]);

  const dismissInstallPrompt = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PWA_DISMISS_KEY, String(Date.now()));
    }

    setIsCoolingDown(true);
    setIsNudgeVisible(false);
  }, []);

  const openInstallPrompt = useCallback(async () => {
    if (!hasMounted || isInstalled) {
      return;
    }

    if (!deferredPrompt) {
      setIsNudgeVisible(true);
      return;
    }

    setIsNudgeVisible(false);
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    setDeferredPrompt(null);

    if (choice.outcome === "accepted") {
      setIsInstalled(true);
      return;
    }

    dismissInstallPrompt();
  }, [deferredPrompt, dismissInstallPrompt, hasMounted, isInstalled]);

  const syncPushSubscription = useCallback(
    async ({ requestPermission }: { requestPermission: boolean }) => {
      if (!pushNotificationsSupported) {
        return {
          success: false,
          message: "Les notifications ne sont pas disponibles sur ce navigateur.",
        };
      }

      if (!isLoggedIn || !user) {
        return {
          success: false,
          message: "Connecte-toi pour activer les notifications.",
        };
      }

      const nextPermission = requestPermission
        ? await Notification.requestPermission()
        : Notification.permission;
      setNotificationPermission(nextPermission);

      if (nextPermission !== "granted") {
        setHasPushSubscription(false);
        return {
          success: false,
          message:
            nextPermission === "denied"
              ? "Les notifications sont bloquées dans ton navigateur."
              : "Autorise les notifications pour les recevoir sur ton appareil.",
        };
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const token = window.localStorage.getItem("token");

      if (!apiUrl || !token) {
        return {
          success: false,
          message: "Configuration API manquante pour les notifications.",
        };
      }

      const publicKeyResponse = await fetch(
        `${apiUrl}/push-notifications/public-key`,
      );

      if (!publicKeyResponse.ok) {
        return {
          success: false,
          message: "Impossible de préparer les notifications.",
        };
      }

      const publicKeyPayload = (await publicKeyResponse.json()) as {
        configured?: boolean;
        publicKey?: string | null;
      };

      if (!publicKeyPayload.configured || !publicKeyPayload.publicKey) {
        return {
          success: false,
          message:
            "Les clés Web Push ne sont pas encore configurées côté serveur.",
        };
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKeyPayload.publicKey),
        });
      }

      const subscriptionResponse = await fetch(
        `${apiUrl}/push-notifications/subscriptions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(subscription.toJSON()),
        },
      );

      if (!subscriptionResponse.ok) {
        return {
          success: false,
          message: "Impossible d'enregistrer cet appareil.",
        };
      }

      setHasPushSubscription(true);

      return {
        success: true,
        message: "Notifications activées sur cet appareil.",
      };
    },
    [isLoggedIn, pushNotificationsSupported, user],
  );

  const enablePushNotifications = useCallback(
    () => syncPushSubscription({ requestPermission: true }),
    [syncPushSubscription],
  );

  const loadNotificationPreferences = useCallback(async () => {
    if (!isLoggedIn || !user) {
      setNotificationPreferences(DEFAULT_PUSH_NOTIFICATION_PREFERENCES);
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const token = window.localStorage.getItem("token");

    if (!apiUrl || !token) {
      setNotificationPreferences(DEFAULT_PUSH_NOTIFICATION_PREFERENCES);
      return;
    }

    setNotificationPreferencesLoading(true);

    try {
      const response = await fetch(`${apiUrl}/push-notifications/preferences`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setNotificationPreferences(DEFAULT_PUSH_NOTIFICATION_PREFERENCES);
        return;
      }

      const payload = (await response.json()) as Partial<PushNotificationPreferences>;
      setNotificationPreferences(normalizeNotificationPreferences(payload));
    } finally {
      setNotificationPreferencesLoading(false);
    }
  }, [isLoggedIn, user]);

  const updateNotificationPreferences = useCallback(
    async (preferences: Partial<PushNotificationPreferences>) => {
      if (!isLoggedIn || !user) {
        return {
          success: false,
          message: "Connecte-toi pour modifier tes préférences.",
        };
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const token = window.localStorage.getItem("token");

      if (!apiUrl || !token) {
        return {
          success: false,
          message: "Configuration API manquante pour les préférences.",
        };
      }

      const previousPreferences = notificationPreferences;
      setNotificationPreferences((currentPreferences) => ({
        ...currentPreferences,
        ...preferences,
      }));

      try {
        const response = await fetch(`${apiUrl}/push-notifications/preferences`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(preferences),
        });

        if (!response.ok) {
          setNotificationPreferences(previousPreferences);
          return {
            success: false,
            message: "Impossible d'enregistrer tes préférences.",
          };
        }

        const payload = (await response.json()) as Partial<PushNotificationPreferences>;
        setNotificationPreferences(normalizeNotificationPreferences(payload));

        return {
          success: true,
          message: "Préférences enregistrées.",
        };
      } catch {
        setNotificationPreferences(previousPreferences);
        return {
          success: false,
          message: "Impossible d'enregistrer tes préférences.",
        };
      }
    },
    [isLoggedIn, notificationPreferences, user],
  );

  const disablePushNotifications = useCallback(async () => {
    if (!pushNotificationsSupported) {
      return {
        success: false,
        message: "Les notifications ne sont pas disponibles sur ce navigateur.",
      };
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const token = window.localStorage.getItem("token");
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      setHasPushSubscription(false);
      return {
        success: true,
        message: "Notifications désactivées sur cet appareil.",
      };
    }

    if (apiUrl && token) {
      await fetch(`${apiUrl}/push-notifications/subscriptions`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      }).catch(() => undefined);
    }

    await subscription.unsubscribe();
    setHasPushSubscription(false);

    return {
      success: true,
      message: "Notifications désactivées sur cet appareil.",
    };
  }, [pushNotificationsSupported]);

  useEffect(() => {
    void loadNotificationPreferences();
  }, [loadNotificationPreferences]);

  useEffect(() => {
    const initTimerId = window.setTimeout(() => {
      setHasMounted(true);
      setIsInstalled(isStandaloneDisplay());
      setIsIosInstall(isIosDevice());
      setIsCoolingDown(isDismissedRecently());
      setPushNotificationsSupported(isPushSupported());
      setNotificationPermission(
        "Notification" in window ? Notification.permission : "unsupported",
      );
    }, 0);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => registration.pushManager.getSubscription())
        .then((subscription) => setHasPushSubscription(Boolean(subscription)))
        .catch(() => undefined);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setIsCoolingDown(isDismissedRecently());
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
      setIsNudgeVisible(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.clearTimeout(initTimerId);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    const handleActionNudge = () => setPendingActionNudge(true);

    window.addEventListener(PWA_INSTALL_NUDGE_EVENT, handleActionNudge);

    return () => {
      window.removeEventListener(PWA_INSTALL_NUDGE_EVENT, handleActionNudge);
    };
  }, []);

  useEffect(() => {
    if (!hasMounted) {
      return;
    }

    void refreshAppBadge();

    const intervalId = window.setInterval(() => {
      void refreshAppBadge();
    }, 60 * 1000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshAppBadge();
      }
    };
    const handleBadgeRefresh = () => {
      void refreshAppBadge();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener(PWA_BADGE_REFRESH_EVENT, handleBadgeRefresh);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener(PWA_BADGE_REFRESH_EVENT, handleBadgeRefresh);
    };
  }, [hasMounted, refreshAppBadge]);

  useEffect(() => {
    if (
      !isLoggedIn ||
      !user ||
      !pushNotificationsSupported ||
      notificationPermission !== "granted"
    ) {
      return;
    }

    const timerId = window.setTimeout(() => {
      void syncPushSubscription({ requestPermission: false });
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [
    isLoggedIn,
    notificationPermission,
    pushNotificationsSupported,
    syncPushSubscription,
    user,
  ]);

  useEffect(() => {
    if (!pendingActionNudge || !canInstall) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setIsNudgeVisible(true);
      setPendingActionNudge(false);
    }, 700);

    return () => window.clearTimeout(timerId);
  }, [canInstall, pendingActionNudge]);

  useEffect(() => {
    if (!canInstall || typeof window === "undefined") {
      return;
    }

    const isMessagingEntry =
      pathname.startsWith("/messages") && !pathname.startsWith("/messages/conversations/");
    const isReservationConfirmation = /^\/reservation\/[^/]+\/confirmation$/.test(pathname);
    const storageKey = isMessagingEntry
      ? PWA_MESSAGING_NUDGE_KEY
      : isReservationConfirmation
        ? PWA_RESERVATION_NUDGE_KEY
        : null;

    if (!storageKey || window.localStorage.getItem(storageKey)) {
      return;
    }

    const timerId = window.setTimeout(() => {
      window.localStorage.setItem(storageKey, String(Date.now()));
      setIsNudgeVisible(true);
    }, 900);

    return () => window.clearTimeout(timerId);
  }, [canInstall, pathname]);

  const contextValue = useMemo<PwaInstallContextValue>(
    () => ({
      canInstall,
      disablePushNotifications,
      enablePushNotifications,
      isInstalled,
      isIosInstall,
      notificationPermission,
      notificationPreferences,
      notificationPreferencesLoading,
      pushNotificationsEnabled,
      pushNotificationsSupported,
      showProfileInstallEntry,
      openInstallPrompt,
      dismissInstallPrompt,
      showInstallNudge,
      updateNotificationPreferences,
    }),
    [
      canInstall,
      dismissInstallPrompt,
      disablePushNotifications,
      enablePushNotifications,
      isInstalled,
      isIosInstall,
      notificationPermission,
      notificationPreferences,
      notificationPreferencesLoading,
      openInstallPrompt,
      pushNotificationsEnabled,
      pushNotificationsSupported,
      showProfileInstallEntry,
      showInstallNudge,
      updateNotificationPreferences,
    ],
  );

  return (
    <PwaInstallContext.Provider value={contextValue}>
      {children}

      {isNudgeVisible && showProfileInstallEntry ? (
        <div className={styles.overlay} role="presentation">
          <section
            className={styles.sheet}
            role="dialog"
            aria-modal="false"
            aria-labelledby="pwa-install-title"
          >
            <button
              type="button"
              className={styles.closeButton}
              aria-label="Fermer la proposition d'installation"
              onClick={dismissInstallPrompt}
            >
              <X />
            </button>

            <span className={styles.icon} aria-hidden="true">
              {isIosInstall && !deferredPrompt ? <Share2 /> : <Download />}
            </span>

            <div className={styles.copy}>
              <h2 id="pwa-install-title">Installer l’application</h2>
              <p>
                {isIosInstall && !deferredPrompt
                  ? "Sur iPhone, utilise le bouton de partage puis choisis Ajouter à l’écran d’accueil."
                  : !deferredPrompt
                    ? "Si le bouton d'installation du navigateur n'apparaît pas encore, utilise le menu de ton navigateur pour installer l'application."
                  : "Ajoute Ramène Ta Poire à ton écran d’accueil pour retrouver tes repas et messages plus vite."}
              </p>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => {
                  if (!deferredPrompt) {
                    dismissInstallPrompt();
                    return;
                  }

                  void openInstallPrompt();
                }}
              >
                {!deferredPrompt ? "J’ai compris" : "Installer"}
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={dismissInstallPrompt}
              >
                Plus tard
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstall() {
  return useContext(PwaInstallContext);
}
