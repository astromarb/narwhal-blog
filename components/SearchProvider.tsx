"use client";
import { createContext, useContext, useState } from "react";

type Ctx = { query: string; setQuery: (q: string) => void };
const SearchCtx = createContext<Ctx>({ query: "", setQuery: () => {} });

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState("");
  return <SearchCtx.Provider value={{ query, setQuery }}>{children}</SearchCtx.Provider>;
}

export function useSearch() { return useContext(SearchCtx); }
