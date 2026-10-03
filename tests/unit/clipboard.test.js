import { describe, it, expect, vi } from 'vitest';
import { copyText, copyFromTextarea } from '../../src/lib/clipboard.js';

const secure = { isSecureContext: true };

describe('copyText', () => {
  it('writes to the clipboard in a secure context', async () => {
    const writeText = vi.fn(async () => {});
    await expect(copyText('hi', { nav: { clipboard: { writeText } }, win: secure })).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('hi');
  });

  it('returns false when permission is denied', async () => {
    const nav = { clipboard: { writeText: async () => { throw new Error('NotAllowedError'); } } };
    await expect(copyText('hi', { nav, win: secure })).resolves.toBe(false);
  });

  it('returns false in insecure contexts or when the API is missing (in-app browsers)', async () => {
    const nav = { clipboard: { writeText: vi.fn() } };
    await expect(copyText('hi', { nav, win: { isSecureContext: false } })).resolves.toBe(false);
    expect(nav.clipboard.writeText).not.toHaveBeenCalled();
    await expect(copyText('hi', { nav: {}, win: secure })).resolves.toBe(false);
  });

  it('gives up instead of hanging when the clipboard never answers (embedded webviews)', async () => {
    const nav = { clipboard: { writeText: () => new Promise(() => {}) } };
    await expect(copyText('hi', { nav, win: secure, timeoutMs: 20 })).resolves.toBe(false);
  });
});

describe('copyFromTextarea', () => {
  const textarea = () => ({ value: 'NEW ORDER', focus: vi.fn(), select: vi.fn(), setSelectionRange: vi.fn() });

  it('selects the text and uses execCommand', () => {
    const ta = textarea();
    expect(copyFromTextarea(ta, { execCommand: () => true })).toBe(true);
    expect(ta.select).toHaveBeenCalled();
  });

  it('selects the full range explicitly, which iOS needs for read-only fields', () => {
    const ta = textarea();
    copyFromTextarea(ta, { execCommand: () => true });
    expect(ta.setSelectionRange).toHaveBeenCalledWith(0, 'NEW ORDER'.length);
  });

  it('returns false when execCommand fails or throws', () => {
    expect(copyFromTextarea(textarea(), { execCommand: () => false })).toBe(false);
    expect(copyFromTextarea(textarea(), { execCommand: () => { throw new Error('nope'); } })).toBe(false);
  });
});
