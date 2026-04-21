import { Suspense } from "react";
import PageLoader from "@/components/PageLoader";
import SearchResultsPage from "./SearchResultsPage";

export default function RechercherPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <SearchResultsPage />
    </Suspense>
  );
}