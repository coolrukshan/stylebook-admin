"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { SearchResult } from "./group-results";

export const MIN_QUERY = 2;
export const DEBOUNCE_MS = 250;

export function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

async function fetchSearch(q: string, signal: AbortSignal): Promise<SearchResult[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal, cache: "no-store" });
  if (!res.ok) throw new Error("search_unavailable");
  const body = (await res.json()) as { results: SearchResult[] };
  return body.results;
}

/** Debounced, abortable search. The query is never logged. */
export function useGlobalSearch(input: string) {
  const q = useDebounced(input.trim(), DEBOUNCE_MS);
  const enabled = q.length >= MIN_QUERY;
  const query = useQuery({
    queryKey: ["admin-search", q],
    queryFn: ({ signal }) => fetchSearch(q, signal),
    enabled,
    staleTime: 15_000,
    retry: false,
    placeholderData: keepPreviousData,
  });
  const settled = input.trim() === q;
  return {
    enabled: input.trim().length >= MIN_QUERY,
    results: query.data ?? [],
    isPending: input.trim().length >= MIN_QUERY && (!settled || query.isFetching),
    isError: enabled && settled && query.isError,
    refetch: query.refetch,
    debouncedQuery: q,
  };
}
