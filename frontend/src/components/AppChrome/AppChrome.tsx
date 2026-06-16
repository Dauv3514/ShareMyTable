"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import BottomMenu from "../BottomMenu";
import Navbar from "../Navbar";
import SplashScreen from "../SplashScreen";

type AppChromeProps = {
  children: ReactNode;
};

export default function AppChrome({ children }: AppChromeProps) {
  const pathname = usePathname();
  const isMessagingConversationRoute = pathname.startsWith("/messages/conversations/");
  const shouldShowSplash = pathname === "/";

  return (
    <div
      className={`app-shell ${
        isMessagingConversationRoute ? "app-shell--messaging" : ""
      }`}
    >
      {shouldShowSplash ? <SplashScreen /> : null}

      {!isMessagingConversationRoute ? <Navbar /> : null}

      <div className="app-shell__content">
        <main
          className={`page-container ${
            isMessagingConversationRoute ? "page-container--flush" : ""
          }`}
        >
          {children}
        </main>
      </div>

      {!isMessagingConversationRoute ? <BottomMenu /> : null}
    </div>
  );
}
