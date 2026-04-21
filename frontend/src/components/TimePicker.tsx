"use client";

import { useMemo, useState } from "react";
import { Clock3 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import "./time-picker.scss";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, "0"),
);
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, "0"),
);

type TimePickerFieldProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
};

function normalizeTimeValue(value?: string) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) {
    return {
      hour: "19",
      minute: "30",
      hasValue: false,
    };
  }

  const [hour, minute] = value.split(":");

  return {
    hour: hour ?? "19",
    minute: minute ?? "30",
    hasValue: true,
  };
}

export default function TimePickerField({
  value,
  onChange,
  placeholder = "Choisir une horaire",
  ariaLabel = "Choisir une heure",
}: TimePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const { hour, minute, hasValue } = useMemo(
    () => normalizeTimeValue(value),
    [value],
  );

  const applyTime = (nextHour: string, nextMinute: string) => {
    onChange?.(`${nextHour}:${nextMinute}`);
  };

  return (
    <div className="time-picker">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="time-picker__trigger"
            aria-label={ariaLabel}
          >
            <span
              className={`time-picker__trigger-label ${
                !hasValue ? "time-picker__trigger-label--placeholder" : ""
              }`}
            >
              {hasValue ? `${hour}:${minute}` : placeholder}
            </span>
            <span
              className={`time-picker__trigger-icon ${
                !hasValue ? "time-picker__trigger-icon--placeholder" : ""
              }`}
              aria-hidden="true"
            >
              <Clock3 />
            </span>
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="time-picker__popover"
          align="center"
          sideOffset={12}
        >
          <div className="time-picker__header">
            <span className="time-picker__header-label">Heure choisie</span>
            <strong className="time-picker__header-value">
              {hour}:{minute}
            </strong>
          </div>

          <div className="time-picker__columns">
            <div className="time-picker__column">
              <div className="time-picker__column-head">Heures</div>
              <div className="time-picker__list" role="listbox" aria-label="Heures">
                {HOUR_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`time-picker__option ${
                      option === hour ? "time-picker__option--selected" : ""
                    }`}
                    onClick={() => applyTime(option, minute)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="time-picker__column">
              <div className="time-picker__column-head">Minutes</div>
              <div className="time-picker__list" role="listbox" aria-label="Minutes">
                {MINUTE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`time-picker__option ${
                      option === minute ? "time-picker__option--selected" : ""
                    }`}
                    onClick={() => {
                      applyTime(hour, option);
                      setOpen(false);
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
