export const BRAND = { red: '#E31B23', yellow: '#FFD23F', ink: '#141414' };

const P_PATH = 'M23 14h15a12.5 12.5 0 0 1 0 25h-6v11h-9z M32 22v9h5a4.5 4.5 0 0 0 0-9z';
const SPEED_LINES = '<rect x="8" y="21" width="10" height="5" rx="2.5"/><rect x="5" y="31" width="13" height="5" rx="2.5"/><rect x="8" y="41" width="10" height="5" rx="2.5"/>';

export function markSvg({ size = 52, tile = BRAND.red, ink = BRAND.yellow, speedLines = true, rounded = true } = {}) {
  return `<svg class="logo__mark" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">`
    + `<rect width="64" height="64" rx="${rounded ? 16 : 0}" fill="${tile}"/>`
    + `<g fill="${ink}">${speedLines ? SPEED_LINES : ''}<path d="${P_PATH}" fill-rule="evenodd"/></g>`
    + '</svg>';
}

const wordmark = '<span class="logo__text"><span class="logo__name">Pakisuyo</span><span class="logo__sub">EXPRESS</span></span>';

export function logoHorizontal({ tone = 'light', size = 40 } = {}) {
  return `<span class="logo logo--${tone}" style="--mark:${size}px">${markSvg({ size })}${wordmark}</span>`;
}

export function logoStacked({ tone = 'light', size = 72, invertMark = tone === 'red' } = {}) {
  const mark = invertMark ? markSvg({ size, tile: BRAND.yellow, ink: BRAND.red }) : markSvg({ size });
  return `<span class="logo logo--stacked logo--${tone}" style="--mark:${size}px">${mark}${wordmark}</span>`;
}
