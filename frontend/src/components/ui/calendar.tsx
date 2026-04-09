"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={["dp-root", className].filter(Boolean).join(" ")}
      classNames={{
        months: "dp-months",
        month: "dp-month",
        month_caption: "dp-month-caption",
        caption_label: "dp-caption-label",
        nav: "dp-nav",
        button_previous: "dp-nav-button dp-nav-button--previous",
        button_next: "dp-nav-button dp-nav-button--next",
        chevron: "dp-chevron",
        dropdowns: "dp-dropdowns",
        dropdown_root: "dp-dropdown-root",
        months_dropdown: "dp-select dp-select--month",
        years_dropdown: "dp-select dp-select--year",
        month_grid: "dp-month-grid",
        weekdays: "dp-weekdays",
        weekday: "dp-weekday",
        weeks: "dp-weeks",
        week: "dp-week",
        day: "dp-day-cell",
        day_button: "dp-day",
        selected: "dp-day-selected",
        today: "dp-day-today",
        outside: "dp-day-outside",
        disabled: "dp-day-disabled",
        hidden: "dp-day-hidden",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation = "right", className: chevronClassName }) =>
          orientation === "left" ? (
            <ChevronLeft className={chevronClassName} />
          ) : (
            <ChevronRight className={chevronClassName} />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };