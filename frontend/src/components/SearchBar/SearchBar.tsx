"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import "./search-bar.scss";
import axios from "axios";
import Image from "next/image";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import DatePicker from "../DatePicker";
import FilterPanel from "../FilterPanel";

type CommuneSuggestion = {
  code: string;
  nom: string;
};

type SearchBarProps = {
  initialLocation?: string;
  initialDate?: string;
  initialFilters?: string[];
};

const buildSearchUrl = (location: string, date: string, filters: string[]) => {
  const params = new URLSearchParams();
  const trimmedLocation = location.trim();

  if (trimmedLocation) {
    params.set("lieu", trimmedLocation);
  }

  if (date) {
    params.set("date", date);
  }

  if (filters.length > 0) {
    params.set("filters", filters.join(","));
  }

  const queryString = params.toString();
  return `/rechercher${queryString ? `?${queryString}` : ""}`;
};

export default function SearchBar({
  initialLocation = "",
  initialDate = "",
  initialFilters,
}: SearchBarProps) {
  const router = useRouter();
  const selectedFilterKey = (initialFilters ?? []).join(",");
  const initialFilterValues = useMemo(
    () => selectedFilterKey.split(",").filter(Boolean),
    [selectedFilterKey],
  );
  const [location, setLocation] = useState(initialLocation);
  const [date, setDate] = useState(initialDate);
  const [selectedFilters, setSelectedFilters] = useState(initialFilterValues);
  const [filterOpen, setFilterOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<CommuneSuggestion[]>([]);
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocation(initialLocation);
  }, [initialLocation]);

  useEffect(() => {
    setDate(initialDate);
  }, [initialDate]);

  useEffect(() => {
    setSelectedFilters(initialFilterValues);
  }, [initialFilterValues]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setSuggestionOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    const query = location.trim();

    if (query.length < 2) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      setSuggestionError(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setLoadingSuggestions(true);
      setSuggestionError(false);

      try {
        const response = await axios.get<CommuneSuggestion[]>(
          "https://geo.api.gouv.fr/communes",
          {
            params: {
              nom: query,
              fields: "nom,code",
              boost: "population",
              limit: "6",
            },
            signal: controller.signal,
          },
        );

        setSuggestions(response.data);
      } catch (error) {
        if (!axios.isCancel(error)) {
          setSuggestionError(true);
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingSuggestions(false);
        }
      }
    }, 220);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [location]);

  const goToResults = () => {
    router.push(buildSearchUrl(location, date, selectedFilters));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    goToResults();
  };

  const toggleFilter = (filterId: string) => {
    setSelectedFilters((currentFilters) =>
      currentFilters.includes(filterId)
        ? currentFilters.filter((currentFilter) => currentFilter !== filterId)
        : [...currentFilters, filterId],
    );
  };

  return (
    <>
      <div className="search-bar-shell" ref={wrapperRef}>
        <form className="search-bar" role="search" onSubmit={handleSubmit}>
          <div className="search-bar__field search-bar__field--location">
            <input
              type="text"
              placeholder="Lieu..."
              aria-label="Lieu"
              value={location}
              autoComplete="off"
              onChange={(event) => {
                setLocation(event.target.value);
                setSuggestionOpen(true);
              }}
              onFocus={() => setSuggestionOpen(true)}
            />

            {suggestionOpen && (location.trim().length >= 2 || suggestions.length > 0) && (
              <div className="search-bar__suggestions" role="listbox">
                {loadingSuggestions && (
                  <p className="search-bar__suggestion-status">Aucune ville trouvée</p>
                )}

                {!loadingSuggestions &&
                  suggestions.map((commune) => (
                    <button
                      type="button"
                      className="search-bar__suggestion"
                      key={commune.code}
                      onClick={() => {
                        setLocation(commune.nom);
                        setSuggestionOpen(false);
                      }}
                    >
                      <span>{commune.nom}</span>
                    </button>
                  ))}

                {!loadingSuggestions && !suggestionError && suggestions.length === 0 && (
                  <p className="search-bar__suggestion-status">Aucune ville trouvée</p>
                )}

                {!loadingSuggestions && suggestionError && (
                  <p className="search-bar__suggestion-status">
                    Les suggestions sont indisponibles
                  </p>
                )}
              </div>
            )}
          </div>

          <span className="search-bar__divider" aria-hidden="true" />
          <div className="search-bar__field search-bar__field--date">
            <DatePicker value={date} onChange={setDate} />
          </div>
          <button className="search-bar__button" type="submit" aria-label="Rechercher">
            <Image src="/rechercher.svg" alt="Rechercher" width={20} height={20} />
          </button>
        </form>

        <button
          className="search-bar-shell__filters"
          type="button"
          aria-label="Ouvrir les filtres"
          onClick={() => setFilterOpen(true)}
        >
          <Plus aria-hidden="true" />
        </button>
      </div>

      <FilterPanel
        open={filterOpen}
        selectedFilters={selectedFilters}
        onToggleFilter={toggleFilter}
        onClear={() => setSelectedFilters([])}
        onClose={() => setFilterOpen(false)}
        onShowResults={() => {
          setFilterOpen(false);
          goToResults();
        }}
      />
    </>
  );
}
