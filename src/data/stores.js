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

// The 5 featured stores, in display order (stores that agreed to be featured, with their own logos).
export const STORES = [
  {
    id: "labarrida-sariaya",
    name: "La Barrida Sariaya",
    aliases: ["La Barrida Pizza Haus"], // its name on OpenStreetMap, so it isn't listed twice
    category: "fast-food",
    categoryLabel: "Pizza",
    town: "Sariaya",
    eta: "25–35 min",
    initials: "LB",
    color: "#D7262E",
    textColor: "#FFFFFF",
    menu: [],
  },
  {
    id: "bukid-amyr",
    name: "Bukid Amyr Restaurant",
    category: "restaurant",
    categoryLabel: "Filipino",
    town: "Sariaya",
    eta: "25–35 min",
    initials: "BA",
    color: "#3E7B27",
    textColor: "#FFFFFF",
    menu: [],
  },
  {
    id: "kope-right",
    name: "KOPE-RIGHT",
    category: "cafe",
    categoryLabel: "Coffee",
    town: "Sariaya",
    eta: "15–25 min",
    initials: "KR",
    color: "#141414",
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


// The app demo also shows Jollibee with its real menu (pitch preview of the future app; not featured).
// Jollibee's names and prices are from jollibee.com.ph, checked 3 October 2026; the Sariaya branch may differ.
export const DEMO_ONLY_STORES = [
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
];

export const DEMO_STORES = [...DEMO_ONLY_STORES, ...STORES];

export const getStore = (id) => DEMO_STORES.find((s) => s.id === id) ?? null;
