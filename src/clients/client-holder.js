// Shared by the Registration and Grading clients.
// A module's client is set once (a fake in tests, the real API client in production).
// Using it before it is set is a programming error, so it throws.
export function makeClientHolder(name) {
  let impl = null;
  return {
    set(client) {
      impl = client;
    },
    get() {
      if (!impl) throw new Error(`${name} client not configured`);
      return impl;
    },
  };
}
