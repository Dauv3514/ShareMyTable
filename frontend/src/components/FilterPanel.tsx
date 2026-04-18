"use client";

import { X } from "lucide-react";
import { mealFilterGroups } from "@/lib/search-data";
import "./filter-panel.scss";

type FilterPanelProps = {
  open: boolean;
  selectedFilters: string[];
  onToggleFilter: (filterId: string) => void;
  onClear: () => void;
  onClose: () => void;
  onShowResults: () => void;
};

export default function FilterPanel({
  open,
  selectedFilters,
  onToggleFilter,
  onClear,
  onClose,
  onShowResults,
}: FilterPanelProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="filter-panel" role="dialog" aria-modal="true" aria-label="Filtres">
      <button
        className="filter-panel__backdrop"
        type="button"
        aria-label="Fermer les filtres"
        onClick={onClose}
      />

      <section className="filter-panel__sheet">
        <div className="filter-panel__header">
          <div>
            <p className="filter-panel__eyebrow">Filtres</p>
            <h2>Choisir mes critères</h2>
          </div>
          <button
            type="button"
            className="filter-panel__close"
            onClick={onClose}
            aria-label="Fermer les filtres"
          >
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="filter-panel__content">
          {mealFilterGroups.map((group) => (
            <section className="filter-panel__group" key={group.id}>
              <h3>{group.title}</h3>
              <div className="filter-panel__chips">
                {group.filters.map((filter) => {
                  const selected = selectedFilters.includes(filter.id);

                  return (
                    <button
                      key={filter.id}
                      type="button"
                      className={`filter-panel__chip ${
                        selected ? "filter-panel__chip--selected" : ""
                      }`}
                      aria-pressed={selected}
                      title={filter.description}
                      onClick={() => onToggleFilter(filter.id)}
                    >
                      <span>{filter.label}</span>
                      <small>{filter.description}</small>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="filter-panel__footer">
          <button type="button" className="filter-panel__result" onClick={onShowResults}>
            Voir les résultats
          </button>
          <button type="button" className="filter-panel__clear" onClick={onClear}>
            Supprimer les filtres
          </button>
        </div>
      </section>
    </div>
  );
}