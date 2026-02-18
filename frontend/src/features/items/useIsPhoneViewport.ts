import { useEffect, useState } from "react";

const PHONE_MEDIA_QUERY = "(max-width: 639px)";

function readIsPhoneViewport(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia(PHONE_MEDIA_QUERY).matches;
}

export default function useIsPhoneViewport(): boolean {
  const [isPhoneViewport, setIsPhoneViewport] = useState(readIsPhoneViewport);

  useEffect(() => {
    const mediaQuery = window.matchMedia(PHONE_MEDIA_QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      setIsPhoneViewport(event.matches);
    };

    setIsPhoneViewport(mediaQuery.matches);
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  return isPhoneViewport;
}
