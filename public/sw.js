/* SoFit service worker — enables installing the app from the browser.
   It intentionally does NOT cache responses, so it can never serve a stale
   page (every request goes to the network as usual). */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // no-op: let the network handle every request normally
});
