// Wraps an async function so only the most recent call's result is "fresh".
export function latestOnly(fn) {
  let latest = 0;
  return async (...args) => {
    const id = ++latest;
    const value = await fn(...args);
    return id === latest ? { stale: false, value } : { stale: true };
  };
}
