"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type CSSProperties, useEffect, useState } from "react";
import EventCard from "../EventCard";
import { getEventsForSection } from "../../lib/event-sections";
import { MOCK_MEAL_EVENTS } from "../../lib/data/mocks/meal-events";
import { getMealEvents, type MealEvent } from "../../lib/meal-data";
import "./splash-screen.scss";

const LOADING_DURATION_MS = 3000;
const EXIT_DURATION_MS = 420;
const CAROUSEL_START_DELAY_MS = 3800;
const CAROUSEL_INTERVAL_MS = 4600;
const DOT_COUNT = 3;
const ONBOARDING_STORAGE_KEY = "ramene-ta-poire:onboarding-seen";

function buildIntroCards(events: MealEvent[]) {
  const sourceEvents = events.length > 0 ? events : MOCK_MEAL_EVENTS;

  return getEventsForSection(sourceEvents, "prochainement")
    .toSorted(() => Math.random() - 0.5)
    .slice(0, 6);
}

type SplashPhase = "loading" | "intro";
type CarouselMode = "mobile" | "tablet" | "desktop";

export default function SplashScreen() {
  const router = useRouter();
  const [shouldRender, setShouldRender] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [phase, setPhase] = useState<SplashPhase>("loading");
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [carouselMode, setCarouselMode] = useState<CarouselMode>("mobile");
  const [introCards, setIntroCards] = useState<MealEvent[]>(() => buildIntroCards([]));
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    const storageTimer = window.setTimeout(() => {
      try {
        setShouldShowOnboarding(localStorage.getItem(ONBOARDING_STORAGE_KEY) !== "true");
      } catch {
        setShouldShowOnboarding(true);
      }
    }, 0);

    return () => {
      window.clearTimeout(storageTimer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadIntroCards = async () => {
      const events = await getMealEvents();

      if (!cancelled) {
        setIntroCards(buildIntroCards(events));
      }
    };

    void loadIntroCards();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!shouldRender || shouldShowOnboarding === null) {
      return;
    }

    let exitTimer: number | undefined;

    const loadingTimer = window.setTimeout(() => {
      if (shouldShowOnboarding) {
        setPhase("intro");

        try {
          localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
        } catch {
          // Storage can be unavailable in private or restricted browser contexts.
        }

        return;
      }

      setIsExiting(true);
      router.replace("/");

      exitTimer = window.setTimeout(() => {
        setShouldRender(false);
      }, EXIT_DURATION_MS);
    }, LOADING_DURATION_MS);

    return () => {
      window.clearTimeout(loadingTimer);

      if (exitTimer !== undefined) {
        window.clearTimeout(exitTimer);
      }
    };
  }, [router, shouldRender, shouldShowOnboarding]);

  useEffect(() => {
    const updateCarouselMode = () => {
      if (window.matchMedia("(min-width: 1024px)").matches) {
        setCarouselMode("desktop");
        return;
      }

      if (window.matchMedia("(min-width: 720px)").matches) {
        setCarouselMode("tablet");
        return;
      }

      setCarouselMode("mobile");
    };

    updateCarouselMode();
    window.addEventListener("resize", updateCarouselMode);

    return () => {
      window.removeEventListener("resize", updateCarouselMode);
    };
  }, []);

  useEffect(() => {
    if (phase !== "intro") {
      return;
    }

    if (introCards.length < 2) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      return;
    }

    const scrollToNextCard = () => {
      setActiveCardIndex((currentIndex) => (currentIndex + 1) % introCards.length);
    };

    const startTimer = window.setTimeout(scrollToNextCard, CAROUSEL_START_DELAY_MS);
    const interval = window.setInterval(scrollToNextCard, CAROUSEL_INTERVAL_MS);

    return () => {
      window.clearTimeout(startTimer);
      window.clearInterval(interval);
    };
  }, [introCards.length, phase]);

  if (!shouldRender) {
    return null;
  }

  const handleDismiss = () => {
    setIsExiting(true);
    router.push("/");

    window.setTimeout(() => {
      setShouldRender(false);
    }, EXIT_DURATION_MS);
  };

  const handleNavigation = () => {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    } catch {
      // Storage can be unavailable in private or restricted browser contexts.
    }

    setShouldRender(false);
  };

  return (
    <div
      className={`splash-screen splash-screen--${phase} ${
        isExiting ? "splash-screen--hidden" : ""
      }`}
      aria-label="Ramène ta poire"
      aria-live="polite"
    >
      <div className="splash-screen__content">
        <header className="splash-screen__header" aria-label="Navigation d'introduction">
          <Image
            src="/rtp.svg"
            alt="Ramène ta poire"
            width={58}
            height={53}
            priority
            className="splash-screen__logo"
          />
        </header>

        <h1 className="splash-screen__title">
          <span>Ramène</span>
          <span>ta poire</span>
        </h1>

        <Image
          src="/splashRTP.svg"
          alt=""
          width={283}
          height={285}
          priority
          aria-hidden="true"
          className="splash-screen__pear"
        />

        {shouldShowOnboarding ? (
          <>
            <section className="splash-screen__intro" aria-label="Meilleurs repas près de chez vous">
              <h2>
                <span className="splash-screen__intro-title-line">Les meilleurs repas près</span>
                <span className="splash-screen__intro-title-line"> de chez vous :</span>
              </h2>

              <div
                className={`splash-screen__carousel splash-screen__carousel--${carouselMode}`}
                aria-label="Repas mis en avant"
              >
                {introCards.map((card, index) => {
                  const cardOffset =
                    (index - activeCardIndex + introCards.length) % introCards.length;
                  const mobileOrder =
                    cardOffset === introCards.length - 1 ? 0 : cardOffset === 0 ? 1 : 2;
                  const isMobileVisible =
                    cardOffset === introCards.length - 1 || cardOffset === 0 || cardOffset === 1;
                  const tabletOrder = cardOffset;
                  const isTabletVisible = cardOffset < 2;
                  const desktopOrder = cardOffset;
                  const isDesktopVisible = cardOffset < 3;
                  const itemOrder =
                    carouselMode === "mobile"
                      ? mobileOrder
                      : carouselMode === "tablet"
                        ? tabletOrder
                        : desktopOrder;
                  const isVisible =
                    carouselMode === "mobile"
                      ? isMobileVisible
                      : carouselMode === "tablet"
                        ? isTabletVisible
                        : isDesktopVisible;

                  return (
                    <div
                      key={`intro-${card.id}`}
                      className={`splash-screen__carousel-item ${
                        isVisible ? "splash-screen__carousel-item--visible" : ""
                      } ${
                        carouselMode === "mobile" && cardOffset === 0
                          ? "splash-screen__carousel-item--current"
                          : ""
                      }`}
                      style={{ "--splash-card-order": itemOrder } as CSSProperties}
                    >
                      <EventCard
                        title={card.title}
                        city={card.city}
                        dateLabel={card.dateLabel}
                        host={card.host}
                        imageUrl={card.imageUrl}
                        variant={card.variant}
                        featured
                        showHost
                      />
                    </div>
                  );
                })}
              </div>

              <div className="splash-screen__dots" aria-hidden="true">
                {Array.from({ length: DOT_COUNT }, (_, index) => (
                  <span
                    key={`splash-dot-${index}`}
                    className={
                      index === activeCardIndex % DOT_COUNT ? "splash-screen__dot--active" : ""
                    }
                  />
                ))}
              </div>
            </section>

            <nav className="splash-screen__actions" aria-label="Actions d'introduction">
              <Link
                href="/connexion"
                className="splash-screen__button splash-screen__button--ghost"
                onClick={handleNavigation}
              >
                Connexion
              </Link>
              <Link
                href="/inscription"
                className="splash-screen__button splash-screen__button--primary"
                onClick={handleNavigation}
              >
                Inscription
              </Link>
              <button
                type="button"
                className="splash-screen__later"
                onClick={handleDismiss}
              >
                Plus tard
              </button>
            </nav>
          </>
        ) : null}
      </div>
    </div>
  );
}
