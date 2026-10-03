export const HOME_TOWN = 'Sariaya';
export const SARIAYA_DELIVERY_FEE = 50;
export const PROMO = { code: 'PAKISUYO10', discount: 10 };

// Owner to confirm (spec §2): pick-up towns and delivery area.
export const COVERAGE = {
  pickupTowns: ['Sariaya', 'Lucena', 'Tayabas', 'Candelaria'],
  deliveryArea: 'Sariaya',
};

export const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'fast-food', label: 'Fast food' },
  { id: 'drinks', label: 'Coffee & drinks' },
  { id: 'cakes', label: 'Cakes' },
  { id: 'filipino', label: 'Filipino' },
];

// Towns marked "unverified" are guesses from their Facebook posts — confirm with the owner.
// Menu prices are samples for the demo only.
export const STORES = [
  {
    id: 'jollibee-sariaya', name: 'Jollibee Sariaya', category: 'fast-food', categoryLabel: 'Fast food',
    town: 'Sariaya', eta: '20–30 min', initials: 'JB', color: '#E4002B', textColor: '#FFFFFF', emoji: '🍗',
    menu: [
      { id: 'chickenjoy-rice', name: '1-pc Chickenjoy w/ Rice', price: 99, emoji: '🍗' },
      { id: 'jolly-spaghetti', name: 'Jolly Spaghetti', price: 70, emoji: '🍝' },
      { id: 'yumburger', name: 'Yumburger', price: 45, emoji: '🍔' },
      { id: 'coke-float', name: 'Coke Float', price: 59, emoji: '🥤' },
    ],
  },
  {
    id: 'mcdonalds-sariaya', name: "McDonald's Sariaya", category: 'fast-food', categoryLabel: 'Fast food',
    town: 'Sariaya', eta: '20–30 min', initials: 'MC', color: '#DA291C', textColor: '#FFC72C', emoji: '🍟', menu: [],
  },
  {
    id: 'dunkin-sariaya', name: "Dunkin' Sariaya", category: 'drinks', categoryLabel: 'Donuts & coffee',
    town: 'Sariaya', eta: '15–25 min', initials: 'DD', color: '#FF671F', textColor: '#FFFFFF', emoji: '🍩', menu: [],
  },
  {
    id: 'max-mango', name: 'Max Mango', category: 'drinks', categoryLabel: 'Mango drinks',
    town: 'Sariaya' /* unverified */, eta: '15–25 min', initials: 'MM', color: '#FFB000', textColor: '#141414', emoji: '🥭', menu: [],
  },
  {
    id: 'bukid-amyr', name: 'Bukid AMYR Restaurant', category: 'filipino', categoryLabel: 'Filipino',
    town: 'Sariaya' /* unverified */, eta: '25–35 min', initials: 'BA', color: '#3E7B27', textColor: '#FFFFFF', emoji: '🍛', menu: [],
  },
  {
    id: 'contis', name: "Conti's Bakeshop & Restaurant", category: 'cakes', categoryLabel: 'Cakes & meals',
    town: 'Lucena' /* unverified */, eta: '35–50 min', initials: 'CB', color: '#6B3FA0', textColor: '#FFFFFF', emoji: '🎂', menu: [],
  },
  {
    id: 'kope-right', name: 'KOPE-right', category: 'drinks', categoryLabel: 'Coffee',
    town: 'Sariaya' /* unverified */, eta: '15–25 min', initials: 'KR', color: '#6F4E37', textColor: '#FFFFFF', emoji: '☕', menu: [],
  },
];

export const getStore = (id) => STORES.find((s) => s.id === id) ?? null;
