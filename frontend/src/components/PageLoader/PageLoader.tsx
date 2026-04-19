"use client";

import "./page-loader.scss";

type PageLoaderProps = {
  label?: string;
};

export default function PageLoader({ label = "Chargement..." }: PageLoaderProps) {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <span className="page-loader__spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}