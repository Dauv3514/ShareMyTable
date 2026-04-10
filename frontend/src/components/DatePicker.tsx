"use client";

import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
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

export default function DatePickerField() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>();
  const [month, setMonth] = useState<Date>(new Date());

  const canGoPrevious =
    month.getFullYear() > START_MONTH.getFullYear() ||
    (month.getFullYear() === START_MONTH.getFullYear() &&
      month.getMonth() > START_MONTH.getMonth());

  const canGoNext =
    month.getFullYear() < END_MONTH.getFullYear() ||
    (month.getFullYear() === END_MONTH.getFullYear() &&
      month.getMonth() < END_MONTH.getMonth());

  const handleSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);

    if (selectedDate) {
      setMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
  };

  return (
    <div className="date-picker">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="date-picker__trigger"
            aria-label="Choisir une date"
          >
            {date ? format(date, "dd/MM/yyyy") : "Date"}
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
              onClick={() => canGoPrevious && setMonth(addMonths(month, -1))}
              disabled={!canGoPrevious}
              aria-label="Mois precedent"
            >
              <ChevronLeft />
            </button>

            <div className="date-picker__selectors">
              <label className="date-picker__select-wrap">
                <select
                  className="date-picker__select"
                  value={month.getMonth()}
                  onChange={(event) =>
                    setMonth(
                      new Date(
                        month.getFullYear(),
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
                  value={month.getFullYear()}
                  onChange={(event) =>
                    setMonth(
                      new Date(
                        Number(event.target.value),
                        month.getMonth(),
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
              onClick={() => canGoNext && setMonth(addMonths(month, 1))}
              disabled={!canGoNext}
              aria-label="Mois suivant"
            >
              <ChevronRight />
            </button>
          </div>

          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
            month={month}
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