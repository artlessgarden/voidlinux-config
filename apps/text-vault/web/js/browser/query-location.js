// This adapter is the sole owner of browser URL query state. Application
// queries remain plain data and can work without location or history globals.
export function createQueryLocation({location, history, addEventListener, removeEventListener}) {
  const subscribers = new Set();
  const changed = () => {
    const value = read();
    for (const subscriber of subscribers) subscriber(value);
  };
  addEventListener("hashchange", changed);

  function read() {
    return new URLSearchParams(location.hash.slice(1)).get("q") ?? "";
  }

  function write(query) {
    const url = new URL(location.href);
    url.hash = query ? new URLSearchParams({q: String(query)}).toString() : "";
    history.replaceState(history.state, "", url);
  }

  function subscribe(callback) {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
  }

  function destroy() {
    removeEventListener("hashchange", changed);
    subscribers.clear();
  }

  return {read, write, subscribe, destroy};
}
