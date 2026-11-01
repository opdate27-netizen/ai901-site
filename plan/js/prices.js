/*
 * Price table notes (estimates only)
 * ---------------------------------
 * Average U.S. prices, week of Nov 2, 2026.
 * Sources / method: mid-range U.S. grocery shelf norms synthesized from
 * typical national chain / regional grocer ranges (not a live scrape, not
 * store-specific). Round-number planning estimates for staples families buy often.
 * These are NOT live shelf prices. Shelf price always wins at checkout.
 * Do not treat totals as a promise of what you will pay.
 */
window.PRICE_TABLE = {
  meta: {
    label: "Average U.S. prices, week of Nov 2, 2026. Shelf price always wins.",
    currency: "USD",
    asOf: "week of Nov 2, 2026",
    note: "Average U.S. prices, week of Nov 2, 2026. Shelf price always wins. Planning estimates only — not live shelf tags."
  },
  items: {
    "eggs_dozen": { name: "Eggs (dozen)", unit: "dozen", price: 2.89, cat: "Dairy & Eggs" },
    "milk_gallon": { name: "Milk (gallon)", unit: "gal", price: 3.49, cat: "Dairy & Eggs" },
    "butter": { name: "Butter (1 lb)", unit: "lb", price: 4.29, cat: "Dairy & Eggs" },
    "cheddar": { name: "Cheddar cheese (8 oz)", unit: "pkg", price: 2.99, cat: "Dairy & Eggs" },
    "yogurt": { name: "Yogurt (32 oz)", unit: "tub", price: 3.49, cat: "Dairy & Eggs" },
    "sour_cream": { name: "Sour cream (16 oz)", unit: "tub", price: 1.89, cat: "Dairy & Eggs" },

    "chicken_breast": { name: "Chicken breast", unit: "lb", price: 3.49, cat: "Meat & Protein" },
    "chicken_thighs": { name: "Chicken thighs", unit: "lb", price: 2.29, cat: "Meat & Protein" },
    "ground_beef": { name: "Ground beef (80/20)", unit: "lb", price: 4.49, cat: "Meat & Protein" },
    "ground_turkey": { name: "Ground turkey", unit: "lb", price: 3.99, cat: "Meat & Protein" },
    "pork_chops": { name: "Pork chops", unit: "lb", price: 3.29, cat: "Meat & Protein" },
    "bacon": { name: "Bacon (12 oz)", unit: "pkg", price: 4.99, cat: "Meat & Protein" },
    "hot_dogs": { name: "Hot dogs (8 ct)", unit: "pkg", price: 2.49, cat: "Meat & Protein" },
    "canned_tuna": { name: "Canned tuna", unit: "can", price: 1.19, cat: "Meat & Protein" },
    "canned_chicken": { name: "Canned chicken", unit: "can", price: 2.29, cat: "Meat & Protein" },
    "dry_beans": { name: "Dry beans (1 lb)", unit: "lb", price: 1.49, cat: "Meat & Protein" },
    "canned_beans": { name: "Canned beans", unit: "can", price: 1.09, cat: "Meat & Protein" },
    "lentils": { name: "Lentils (1 lb)", unit: "lb", price: 1.69, cat: "Meat & Protein" },
    "peanut_butter": { name: "Peanut butter (16 oz)", unit: "jar", price: 2.79, cat: "Meat & Protein" },
    "tofu": { name: "Tofu (14 oz)", unit: "pkg", price: 2.49, cat: "Meat & Protein" },

    "rice": { name: "Rice (2 lb)", unit: "bag", price: 2.49, cat: "Grains & Bread" },
    "pasta": { name: "Pasta (1 lb)", unit: "box", price: 1.29, cat: "Grains & Bread" },
    "bread": { name: "Bread (loaf)", unit: "loaf", price: 2.49, cat: "Grains & Bread" },
    "tortillas": { name: "Flour tortillas (10 ct)", unit: "pkg", price: 2.29, cat: "Grains & Bread" },
    "oats": { name: "Rolled oats (42 oz)", unit: "canister", price: 3.99, cat: "Grains & Bread" },
    "cereal": { name: "Cereal (box)", unit: "box", price: 3.49, cat: "Grains & Bread" },
    "flour": { name: "All-purpose flour (5 lb)", unit: "bag", price: 2.99, cat: "Grains & Bread" },
    "cornmeal": { name: "Cornmeal (2 lb)", unit: "bag", price: 1.89, cat: "Grains & Bread" },
    "crackers": { name: "Crackers", unit: "box", price: 2.49, cat: "Grains & Bread" },
    "ramen": { name: "Ramen (6 pack)", unit: "pack", price: 1.99, cat: "Grains & Bread" },

    "potatoes": { name: "Potatoes (5 lb)", unit: "bag", price: 3.49, cat: "Produce" },
    "onions": { name: "Onions (3 lb)", unit: "bag", price: 2.49, cat: "Produce" },
    "carrots": { name: "Carrots (1 lb)", unit: "bag", price: 1.29, cat: "Produce" },
    "celery": { name: "Celery (bunch)", unit: "bunch", price: 1.79, cat: "Produce" },
    "bananas": { name: "Bananas", unit: "lb", price: 0.59, cat: "Produce" },
    "apples": { name: "Apples", unit: "lb", price: 1.79, cat: "Produce" },
    "oranges": { name: "Oranges", unit: "lb", price: 1.49, cat: "Produce" },
    "lettuce": { name: "Lettuce (head)", unit: "head", price: 1.99, cat: "Produce" },
    "tomatoes": { name: "Tomatoes", unit: "lb", price: 1.99, cat: "Produce" },
    "cabbage": { name: "Cabbage (head)", unit: "head", price: 1.69, cat: "Produce" },
    "broccoli": { name: "Broccoli", unit: "lb", price: 1.89, cat: "Produce" },
    "spinach": { name: "Spinach (bag)", unit: "bag", price: 2.49, cat: "Produce" },
    "bell_pepper": { name: "Bell peppers", unit: "each", price: 1.29, cat: "Produce" },
    "garlic": { name: "Garlic (bulb)", unit: "bulb", price: 0.69, cat: "Produce" },
    "sweet_potato": { name: "Sweet potatoes", unit: "lb", price: 1.29, cat: "Produce" },
    "squash": { name: "Winter squash", unit: "lb", price: 1.19, cat: "Produce" },
    "corn_ears": { name: "Corn (ear)", unit: "ear", price: 0.50, cat: "Produce" },
    "cucumber": { name: "Cucumber", unit: "each", price: 0.89, cat: "Produce" },
    "avocado": { name: "Avocado", unit: "each", price: 1.49, cat: "Produce" },
    "lemons": { name: "Lemons", unit: "each", price: 0.69, cat: "Produce" },
    "berries": { name: "Berries (pint)", unit: "pint", price: 3.49, cat: "Produce" },

    "frozen_veg": { name: "Frozen mixed vegetables", unit: "bag", price: 1.79, cat: "Frozen" },
    "frozen_broccoli": { name: "Frozen broccoli", unit: "bag", price: 1.69, cat: "Frozen" },
    "frozen_peas": { name: "Frozen peas", unit: "bag", price: 1.49, cat: "Frozen" },
    "frozen_pizza": { name: "Frozen pizza", unit: "each", price: 4.99, cat: "Frozen" },
    "frozen_berries": { name: "Frozen berries", unit: "bag", price: 3.49, cat: "Frozen" },

    "canned_tomato": { name: "Canned tomatoes (28 oz)", unit: "can", price: 1.49, cat: "Pantry" },
    "tomato_sauce": { name: "Tomato sauce (15 oz)", unit: "can", price: 0.89, cat: "Pantry" },
    "tomato_paste": { name: "Tomato paste", unit: "can", price: 0.79, cat: "Pantry" },
    "broth": { name: "Chicken/veggie broth (32 oz)", unit: "carton", price: 1.99, cat: "Pantry" },
    "soup_can": { name: "Canned soup", unit: "can", price: 1.49, cat: "Pantry" },
    "oil": { name: "Cooking oil (48 oz)", unit: "bottle", price: 4.49, cat: "Pantry" },
    "salt": { name: "Salt", unit: "box", price: 0.99, cat: "Pantry" },
    "pepper": { name: "Black pepper", unit: "jar", price: 2.49, cat: "Pantry" },
    "spices": { name: "Basic spice (jar)", unit: "jar", price: 1.99, cat: "Pantry" },
    "sugar": { name: "Sugar (4 lb)", unit: "bag", price: 2.99, cat: "Pantry" },
    "mayo": { name: "Mayonnaise (30 oz)", unit: "jar", price: 3.99, cat: "Pantry" },
    "ketchup": { name: "Ketchup", unit: "bottle", price: 2.29, cat: "Pantry" },
    "mustard": { name: "Mustard", unit: "bottle", price: 1.49, cat: "Pantry" },
    "soy_sauce": { name: "Soy sauce", unit: "bottle", price: 2.29, cat: "Pantry" },
    "salsa": { name: "Salsa (16 oz)", unit: "jar", price: 2.49, cat: "Pantry" },
    "jam": { name: "Jam/jelly", unit: "jar", price: 2.79, cat: "Pantry" },
    "honey": { name: "Honey (12 oz)", unit: "bottle", price: 4.49, cat: "Pantry" },
    "baking_powder": { name: "Baking powder", unit: "can", price: 1.99, cat: "Pantry" },
    "canned_corn": { name: "Canned corn", unit: "can", price: 0.99, cat: "Pantry" },
    "mac_cheese": { name: "Mac & cheese (box)", unit: "box", price: 0.98, cat: "Pantry" },

    "juice": { name: "Orange juice (64 oz)", unit: "carton", price: 3.49, cat: "Drinks" },
    "coffee": { name: "Coffee (grounds 11 oz)", unit: "can", price: 5.99, cat: "Drinks" },
    "tea": { name: "Tea bags (box)", unit: "box", price: 2.99, cat: "Drinks" }
  }
};

/* Pantry chip definitions: label -> price-table id(s) excluded when tapped */
window.PANTRY_CHIPS = [
  { id: "rice", label: "Rice", keys: ["rice"] },
  { id: "beans", label: "Beans", keys: ["canned_beans", "dry_beans"] },
  { id: "pasta", label: "Pasta", keys: ["pasta", "mac_cheese"] },
  { id: "eggs", label: "Eggs", keys: ["eggs_dozen"] },
  { id: "oats", label: "Oats", keys: ["oats"] },
  { id: "bread", label: "Bread", keys: ["bread"] },
  { id: "pb", label: "Peanut butter", keys: ["peanut_butter"] },
  { id: "oil", label: "Oil", keys: ["oil"] },
  { id: "spices", label: "Spices", keys: ["spices", "salt", "pepper"] },
  { id: "milk", label: "Milk", keys: ["milk_gallon"] },
  { id: "tortillas", label: "Tortillas", keys: ["tortillas"] },
  { id: "tomatoes", label: "Canned tomato", keys: ["canned_tomato", "tomato_sauce", "tomato_paste"] },
  { id: "broth", label: "Broth", keys: ["broth"] },
  { id: "frozen_veg", label: "Frozen veg", keys: ["frozen_veg", "frozen_broccoli", "frozen_peas"] },
  { id: "potatoes", label: "Potatoes", keys: ["potatoes"] },
  { id: "onions", label: "Onions", keys: ["onions"] }
];

/* Allergy chips: exclude ingredients and meals that use them.
 * Meal ideas only. Always check labels for allergens.
 * Be conservative: tag processed foods when unsure. */
window.ALLERGY_CHIPS = [
  { id: "nuts", label: "Nuts", keys: ["peanut_butter"] },
  { id: "dairy", label: "Dairy", keys: [
    "milk_gallon", "butter", "cheddar", "yogurt", "sour_cream",
    "frozen_pizza", "mac_cheese", "hot_dogs"
  ]},
  { id: "eggs", label: "Eggs", keys: ["eggs_dozen", "mayo"] },
  { id: "gluten", label: "Gluten", keys: [
    "bread", "pasta", "flour", "tortillas", "cereal", "oats", "ramen",
    "mac_cheese", "crackers", "cornmeal", "frozen_pizza"
  ]},
  { id: "shellfish", label: "Shellfish", keys: [] },
  { id: "soy", label: "Soy", keys: ["soy_sauce", "tofu", "hot_dogs"] }
];
