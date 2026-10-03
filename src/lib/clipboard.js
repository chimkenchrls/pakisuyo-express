export async function copyText(text, { nav = globalThis.navigator, win = globalThis, timeoutMs = 1500 } = {}) {
  if (!win?.isSecureContext || typeof nav?.clipboard?.writeText !== 'function') return false;
  let timer;
  // Some embedded webviews never settle the promise while a permission prompt is pending.
  const timeout = new Promise((resolve) => { timer = setTimeout(() => resolve(false), timeoutMs); });
  try {
    return await Promise.race([nav.clipboard.writeText(text).then(() => true), timeout]);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// Legacy path for the fallback dialog: works inside a user click even where the async API is blocked.
export function copyFromTextarea(textarea, doc = globalThis.document) {
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length); // iOS ignores select() on read-only fields
  try {
    return doc.execCommand('copy') === true;
  } catch {
    return false;
  }
}
