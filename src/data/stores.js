import { DIRECTORY_CATEGORIES } from "./categories.js";

export const HOME_TOWN = "Sariaya";
export const SARIAYA_DELIVERY_FEE = 50;
export const PROMO = { code: "PAKISUYO10", discount: 10 };

// Owner to confirm (spec §2): pick-up towns and delivery area.
export const COVERAGE = {
  pickupTowns: ["Sariaya", "Lucena", "Tayabas", "Candelaria"],
  deliveryArea: "Sariaya",
};

export const CATEGORIES = [
  { id: "all", label: "All" },
  ...DIRECTORY_CATEGORIES.map(({ id, label }) => ({ id, label })),
];

// The 5 featured stores, in display order. Jollibee's demo menu uses its official names and prices
// (jollibee.com.ph, checked 3 October 2026); the Sariaya branch may charge differently.
export const STORES = [
  {
    id: "jollibee-sariaya",
    name: "Jollibee Sariaya",
    category: "fast-food",
    categoryLabel: "Fast food",
    town: "Sariaya",
    eta: "20–30 min",
    initials: "JB",
    color: "#E4002B",
    textColor: "#FFFFFF",
    menu: [
      {
        id: "chickenjoy-rice",
        name: "1-pc Chickenjoy Solo",
        price: 98,
        icon: "bowl-food",
      },
      {
        id: "jolly-spaghetti",
        name: "Jolly Spaghetti Solo",
        price: 76,
        icon: "bowl-steam",
      },
      { id: "yumburger", name: "Yumburger Solo", price: 51, icon: "hamburger" },
      { id: "coke-float", name: "Coke Float", price: 80, icon: "pint-glass" },
    ],
  },
  {
    id: "mcdonalds-sariaya",
    name: "McDonald's Sariaya",
    category: "fast-food",
    categoryLabel: "Fast food",
    town: "Sariaya",
    eta: "20–30 min",
    initials: "MC",
    color: "#DA291C",
    textColor: "#FFC72C",
    menu: [],
  },
  {
    id: "dunkin-sariaya",
    name: "Dunkin' Sariaya",
    category: "cafe",
    categoryLabel: "Donuts & coffee",
    town: "Sariaya",
    eta: "15–25 min",
    initials: "DD",
    color: "#FF671F",
    textColor: "#FFFFFF",
    menu: [],
  },
  {
    id: "wings-dims-sariaya",
    name: "Wings & Dims Corner",
    category: "fast-food",
    categoryLabel: "Wings & Dims",
    town: "Sariaya",
    eta: "20–30 min",
    initials: "WD",
    color: "#E31B23",
    textColor: "#FFFFFF",
    menu: [],
  },
  {
    id: "dash-espresso-sariaya",
    name: "Dash Espresso",
    category: "cafe",
    categoryLabel: "Coffee",
    town: "Sariaya",
    eta: "15–25 min",
    initials: "DE",
    color: "#141414",
    textColor: "#FFFFFF",
    menu: [],
  },
];

export const getStore = (id) => STORES.find((s) => s.id === id) ?? null;
