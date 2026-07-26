"use client";

import { useEffect } from "react";

/** Registers the service worker so the app is installable from the browser. */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
