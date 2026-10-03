export async function copyText(text, { nav = globalThis.navigator, win = globalThis } = {}) {
  if (!win?.isSecureContext || typeof nav?.clipboard?.writeText !== 'function') return false;
  try {
    await nav.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// Legacy path for the fallback dialog: works inside a user click even where the async API is blocked.
export function copyFromTextarea(textarea, doc = globalThis.document) {
  textarea.focus();
  textarea.select();
  try {
    return doc.execCommand('copy') === true;
  } catch {
    return false;
  }
}
