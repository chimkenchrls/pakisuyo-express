export const DIRECTORY_CATEGORIES = [
  { id: 'fast-food', label: 'Fast food', singular: 'Fast food', icon: '🍗', tile: '#FFE9E9' },
  { id: 'restaurant', label: 'Restaurants', singular: 'Restaurant', icon: '🍽️', tile: '#E8F3E8' },
  { id: 'cafe', label: 'Cafés', singular: 'Café', icon: '☕', tile: '#EAE6F7' },
  { id: 'bakery', label: 'Bakeries', singular: 'Bakery', icon: '🥖', tile: '#F3EBDD' },
  { id: 'bar', label: 'Bars', singular: 'Bar', icon: '🍺', tile: '#FFF3C4' },
];

export const categoryById = (id) => DIRECTORY_CATEGORIES.find((c) => c.id === id) ?? null;
