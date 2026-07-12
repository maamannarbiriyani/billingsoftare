// Minimal service worker — exists only so Chrome/Android treats this site as
// an installable PWA (home-screen icon, standalone window on the Sunmi
// terminal). Deliberately does NOT cache anything: this is a live billing
// app, and serving stale stock/price data offline would be worse than no
// offline support at all.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // No-op: let every request go straight to the network.
});
