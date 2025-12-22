import { Filters } from "./recentDownloadsTypes";

const FILTER_KEY = "globalFilters";

export function getStoredFilters(): Filters | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(FILTER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Filters;
  } catch {
    return null;
  }
}

export function setStoredFilters(filters: Filters) {
  if (typeof window === "undefined") return;
  localStorage.setItem(FILTER_KEY, JSON.stringify(filters));
}
