"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import "./date-picker.scss";

const START_MONTH = new Date(2020, 0, 1);
const END_MONTH = new Date(2035, 11, 1);

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, monthIndex) => ({
  value: monthIndex,
  label: format(new Date(2026, monthIndex, 1), "MMM", { locale: fr }),
}));

const YEAR_OPTIONS = Array.from(
  { length: END_MONTH.getFullYear() - START_MONTH.getFullYear() + 1 },
  (_, index) => START_MONTH.getFullYear() + index,
);

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

type DatePickerFieldProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  variant?: "search" | "input";
  ariaLabel?: string;
};

function toFormDateValue(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function toDate(value?: string) {
  if (!value) {
    return undefined;
  }

  try {
    return parseISO(value);
  } catch {
    return undefined;
  }
}

export default function DatePickerField({
  value,
  onChange,
  placeholder = "Date",
  variant = "search",
  ariaLabel = "Choisir une date",
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const isControlled = value !== undefined && typeof onChange === "function";
  const initialDate = useMemo(() => toDate(value), [value]);
  const [internalDate, setInternalDate] = useState<Date | undefined>(initialDate);
  const selectedDate = isControlled ? initialDate : internalDate;
  const [month, setMonth] = useState<Date | undefined>(undefined);
  const visibleMonth = month ?? selectedDate ?? new Date();

  const canGoPrevious =
    visibleMonth.getFullYear() > START_MONTH.getFullYear() ||
    (visibleMonth.getFullYear() === START_MONTH.getFullYear() &&
      visibleMonth.getMonth() > START_MONTH.getMonth());

  const canGoNext =
    visibleMonth.getFullYear() < END_MONTH.getFullYear() ||
    (visibleMonth.getFullYear() === END_MONTH.getFullYear() &&
      visibleMonth.getMonth() < END_MONTH.getMonth());

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
      if (isControlled && onChange) {
        onChange(toFormDateValue(selectedDate));
      } else {
        setInternalDate(selectedDate);
      }
      setOpen(false);
      return;
    }

    if (!isControlled) {
      setInternalDate(undefined);
    } else if (onChange) {
      onChange("");
    }
  };

  return (
    <div className={`date-picker date-picker--${variant}`}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="date-picker__trigger"
            aria-label={ariaLabel}
          >
            <span className="date-picker__trigger-label">
              {selectedDate ? format(selectedDate, "dd/MM/yyyy") : placeholder}
            </span>
            {variant === "input" && (
              <span className="date-picker__trigger-icon" aria-hidden="true">
                <CalendarDays />
              </span>
            )}
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="date-picker__popover"
          align="center"
          sideOffset={12}
        >
          <div className="date-picker__controls">
            <button
              type="button"
              className="date-picker__nav-button"
              onClick={() => canGoPrevious && setMonth(addMonths(visibleMonth, -1))}
              disabled={!canGoPrevious}
              aria-label="Mois precedent"
            >
              <ChevronLeft />
            </button>

            <div className="date-picker__selectors">
              <label className="date-picker__select-wrap">
                <select
                  className="date-picker__select"
                  value={visibleMonth.getMonth()}
                  onChange={(event) =>
                    setMonth(
                      new Date(
                        visibleMonth.getFullYear(),
                        Number(event.target.value),
                        1,
                      ),
                    )
                  }
                  aria-label="Choisir un mois"
                >
                  {MONTH_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="date-picker__select-icon" />
              </label>

              <label className="date-picker__select-wrap date-picker__select-wrap--year">
                <select
                  className="date-picker__select"
                  value={visibleMonth.getFullYear()}
                  onChange={(event) =>
                    setMonth(
                      new Date(
                        Number(event.target.value),
                        visibleMonth.getMonth(),
                        1,
                      ),
                    )
                  }
                  aria-label="Choisir une annee"
                >
                  {YEAR_OPTIONS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <ChevronDown className="date-picker__select-icon" />
              </label>
            </div>

            <button
              type="button"
              className="date-picker__nav-button"
              onClick={() => canGoNext && setMonth(addMonths(visibleMonth, 1))}
              disabled={!canGoNext}
              aria-label="Mois suivant"
            >
              <ChevronRight />
            </button>
          </div>

          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            month={visibleMonth}
            onMonthChange={setMonth}
            startMonth={START_MONTH}
            endMonth={END_MONTH}
            hideNavigation
            locale={fr}
            showOutsideDays
            classNames={{
              month_caption: "dp-month-caption-hidden",
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}