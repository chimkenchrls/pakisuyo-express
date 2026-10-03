import { SARIAYA_CENTER, isInsideSariaya } from '../lib/geo.js';

export function createOrderMap({ mapEl, statusEl, warningEl, onPin }) {
  let L;
  let map;
  let marker;
  let ready;

  function ensure() {
    ready ??= (async () => {
      L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');
      map = L.map(mapEl, { scrollWheelZoom: false }).setView([SARIAYA_CENTER.lat, SARIAYA_CENTER.lng], 15);
      const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      let loaded = 0;
      let failed = 0;
      tiles.on('tileload', () => { loaded += 1; });
      tiles.on('tileerror', () => {
        failed += 1;
        if (!loaded && failed >= 3) {
          mapEl.hidden = true;
          statusEl.textContent = "The map couldn't load — just type your address and landmark below.";
        }
      });
      map.on('click', (e) => setPin(e.latlng.lat, e.latlng.lng));
    })();
    return ready;
  }

  function update(lat, lng) {
    warningEl.hidden = isInsideSariaya(lat, lng);
    statusEl.textContent = 'Pin set. Drag it if it’s not exactly at your gate.';
    onPin({ lat, lng });
  }

  async function setPin(lat, lng, { pan = false } = {}) {
    await ensure();
    if (!marker) {
      marker = L.marker([lat, lng], {
        draggable: true,
        keyboard: true,
        title: 'Your delivery pin',
        icon: L.divIcon({ className: 'order-pin', html: '<span></span>', iconSize: [28, 40], iconAnchor: [14, 40] }),
      }).addTo(map);
      marker.on('dragend', () => {
        const p = marker.getLatLng();
        update(p.lat, p.lng);
      });
    } else {
      marker.setLatLng([lat, lng]);
    }
    if (pan) map.setView([lat, lng], 17);
    update(lat, lng);
  }

  function locate() {
    if (!('geolocation' in navigator)) {
      statusEl.textContent = "Your browser can't share location — tap the map to drop a pin instead.";
      return;
    }
    statusEl.textContent = 'Finding you…';
    navigator.geolocation.getCurrentPosition(
      (pos) => setPin(pos.coords.latitude, pos.coords.longitude, { pan: true }),
      () => {
        statusEl.textContent = "Couldn't get your location — tap the map to drop a pin instead.";
        ensure();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  return { ensure, setPin, locate };
}
