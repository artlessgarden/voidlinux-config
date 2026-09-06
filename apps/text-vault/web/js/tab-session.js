const REQUEST = "text-vault:session-request";
const RESPONSE = "text-vault:session-response";

export function createTabSession({
  channel = new BroadcastChannel("text-vault:session:v1"),
  timeoutMs = 500,
  requestID = () => crypto.randomUUID(),
  setTimer = setTimeout,
  clearTimer = clearTimeout,
} = {}) {
  let offeredSession = null;
  let closed = false;
  const pending = new Map();

  // Session material exists only in live same-origin tabs. BroadcastChannel
  // performs structured cloning, including CryptoKey, without storage APIs.
  const receive = event => {
    const message = event.data;
    if (!message || typeof message !== "object") return;
    if (message.type === REQUEST && offeredSession) {
      channel.postMessage({type: RESPONSE, requestID: message.requestID, session: offeredSession});
      return;
    }
    if (message.type !== RESPONSE || typeof message.requestID !== "string") return;
    const waiter = pending.get(message.requestID);
    if (!waiter || !validSession(message.session)) return;
    pending.delete(message.requestID);
    clearTimer(waiter.timer);
    waiter.resolve(message.session);
  };
  channel.addEventListener("message", receive);

  function offer(session) {
    if (!validSession(session)) throw new TypeError("invalid tab session");
    offeredSession = session;
  }

  function request() {
    if (closed) return Promise.resolve(null);
    const id = requestID();
    return new Promise(resolve => {
      const timer = setTimer(() => {
        pending.delete(id);
        resolve(null);
      }, timeoutMs);
      pending.set(id, {resolve, timer});
      channel.postMessage({type: REQUEST, requestID: id});
    });
  }

  function close() {
    if (closed) return;
    closed = true;
    offeredSession = null;
    channel.removeEventListener("message", receive);
    for (const waiter of pending.values()) {
      clearTimer(waiter.timer);
      waiter.resolve(null);
    }
    pending.clear();
    channel.close();
  }

  return {offer, request, close};
}

function validSession(value) {
  return value && typeof value === "object" && value.key && typeof value.csrfToken === "string";
}
