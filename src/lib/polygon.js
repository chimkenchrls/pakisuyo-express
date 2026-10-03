// Ray casting; ring coordinates are GeoJSON [lng, lat]. No JSON imports, so Node scripts can use it.
function pointInRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = (yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

function pointInPolygon(lng, lat, rings) {
  if (!pointInRing(lng, lat, rings[0])) return false;
  return !rings.slice(1).some((hole) => pointInRing(lng, lat, hole));
}

export function isInside(lat, lng, geometry) {
  if (geometry.type === 'Polygon') return pointInPolygon(lng, lat, geometry.coordinates);
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.some((poly) => pointInPolygon(lng, lat, poly));
  throw new Error(`Unsupported geometry type: ${geometry.type}`);
}
