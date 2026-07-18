(() => {
  const ACTIVE_TRIP_KEY = "less-visited-active-trip-v1";
  const LEGACY_KEYS = new Set([
    "less-visited-companion-state-v2",
    "less-visited-trip-override-v2"
  ]);
  const validTrip = /^[A-Za-z0-9_-]+$/;
  const url = new URL(window.location.href);
  let tripId = url.searchParams.get("trip");

  if (!tripId) {
    const remembered = window.localStorage.getItem(ACTIVE_TRIP_KEY);
    if (remembered && validTrip.test(remembered)) {
      tripId = remembered;
      url.searchParams.set("trip", remembered);
      history.replaceState(null, "", `${url.pathname}?${url.searchParams.toString()}${url.hash}`);
    }
  }

  if (tripId && validTrip.test(tripId)) {
    window.localStorage.setItem(ACTIVE_TRIP_KEY, tripId);
  } else {
    tripId = "default";
  }

  const originalGet = Storage.prototype.getItem;
  const originalSet = Storage.prototype.setItem;
  const originalRemove = Storage.prototype.removeItem;
  const scopedKey = (key) => `${key}:${tripId}`;

  Storage.prototype.getItem = function getItem(key) {
    if (this === window.localStorage && LEGACY_KEYS.has(key)) {
      const scoped = originalGet.call(this, scopedKey(key));
      if (scoped !== null) return scoped;
      const legacy = originalGet.call(this, key);
      if (legacy !== null) {
        originalSet.call(this, scopedKey(key), legacy);
        return legacy;
      }
      return null;
    }
    return originalGet.call(this, key);
  };

  Storage.prototype.setItem = function setItem(key, value) {
    if (this === window.localStorage && LEGACY_KEYS.has(key)) {
      return originalSet.call(this, scopedKey(key), value);
    }
    return originalSet.call(this, key, value);
  };

  Storage.prototype.removeItem = function removeItem(key) {
    if (this === window.localStorage && LEGACY_KEYS.has(key)) {
      return originalRemove.call(this, scopedKey(key));
    }
    return originalRemove.call(this, key);
  };

  window.LESS_VISITED_BOOTSTRAP = { tripId };
})();
