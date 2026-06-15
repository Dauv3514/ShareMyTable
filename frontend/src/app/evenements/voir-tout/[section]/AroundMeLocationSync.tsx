"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type AroundMeLocationSyncProps = {
  enabled: boolean;
};

export default function AroundMeLocationSync({
  enabled,
}: AroundMeLocationSyncProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !("geolocation" in navigator)) {
      return;
    }

    if (searchParams.get("lat") && searchParams.get("lng")) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const nextSearchParams = new URLSearchParams(searchParams.toString());
        nextSearchParams.set("lat", String(coords.latitude));
        nextSearchParams.set("lng", String(coords.longitude));
        nextSearchParams.delete("page");

        router.replace(`${pathname}?${nextSearchParams.toString()}`);
      },
      () => undefined,
      {
        enableHighAccuracy: false,
        timeout: 6000,
        maximumAge: 300000,
      },
    );
  }, [enabled, pathname, router, searchParams]);

  return null;
}
