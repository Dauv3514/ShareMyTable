"use client";

import "./search-bar.scss";
import Image from "next/image";
import DatePicker from "./DatePicker";
export default function SearchBar() {
  return (
    <div className="search-bar" role="search">
      <div className="search-bar__field">
        <input type="text" placeholder="Lieu..." aria-label="Lieu" />
      </div>
      <span className="search-bar__divider" aria-hidden="true" />
      <div className="search-bar__field search-bar__field--date">
        <DatePicker />
      </div>
      <button className="search-bar__button" aria-label="Rechercher">
        <Image src="/rechercher.svg" alt="Rechercher" width={20} height={20} />
      </button>
    </div>
  );
}