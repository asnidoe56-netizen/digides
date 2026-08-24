"use client";

import { useEffect, useState } from "react";

// Defaults to `false` (mobile-first: assume the narrow layout) until the
// effect runs on the client, so server and first client render always
// agree — avoiding a hydration mismatch — then updates to match the real
// viewport and stays in sync if the window is resized or rotated.
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    setMatches(mediaQueryList.matches);

    function handleChange(event: MediaQueryListEvent) {
      setMatches(event.matches);
    }

    mediaQueryList.addEventListener("change", handleChange);
    return () => mediaQueryList.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}
