// Vitest shim for `server-only`. The real package throws if imported in client code;
// in Node test environment we simply turn it into a no-op.
export {};
