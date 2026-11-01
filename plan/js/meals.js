/* Meal templates: qty is for ~4 people for one sitting.
 * Dinner crowd-pleasers are sized to cook once / eat twice (leftovers).
 * tags: soup | quick | cheap | kid | no-oven
 * Store-agnostic. Allergy safety uses ingredient ids only.
 */
window.MEAL_CATALOG = {
  breakfast: [
    { id: "oats_bananas", name: "Oatmeal with bananas", tier: 1, tags: ["cheap", "quick", "kid", "no-oven"], ingredients: [
      { id: "oats", qty: 0.15 }, { id: "bananas", qty: 1.5 }, { id: "milk_gallon", qty: 0.08 }, { id: "sugar", qty: 0.02 }
    ]},
    { id: "toast_eggs", name: "Toast & scrambled eggs", tier: 1, tags: ["cheap", "quick", "kid"], ingredients: [
      { id: "bread", qty: 0.4 }, { id: "eggs_dozen", qty: 0.5 }, { id: "butter", qty: 0.05 }
    ]},
    { id: "pb_toast", name: "Peanut butter toast & fruit", tier: 1, tags: ["cheap", "quick", "kid", "no-oven"], ingredients: [
      { id: "bread", qty: 0.4 }, { id: "peanut_butter", qty: 0.12 }, { id: "bananas", qty: 1.2 }
    ]},
    { id: "cereal_milk", name: "Cereal with milk", tier: 1, tags: ["cheap", "quick", "kid", "no-oven"], ingredients: [
      { id: "cereal", qty: 0.35 }, { id: "milk_gallon", qty: 0.1 }, { id: "bananas", qty: 1 }
    ]},
    { id: "yogurt_oats", name: "Yogurt parfait with oats", tier: 2, tags: ["quick", "kid", "no-oven"], ingredients: [
      { id: "yogurt", qty: 0.35 }, { id: "oats", qty: 0.08 }, { id: "bananas", qty: 1 }, { id: "frozen_berries", qty: 0.15 }
    ]},
    { id: "egg_burrito", name: "Egg & cheese breakfast burritos", tier: 2, tags: ["quick", "kid"], ingredients: [
      { id: "eggs_dozen", qty: 0.5 }, { id: "tortillas", qty: 0.4 }, { id: "cheddar", qty: 0.2 }, { id: "salsa", qty: 0.1 }
    ]},
    { id: "pancakes", name: "Pancakes with fruit", tier: 2, tags: ["kid"], ingredients: [
      { id: "flour", qty: 0.12 }, { id: "eggs_dozen", qty: 0.2 }, { id: "milk_gallon", qty: 0.08 }, { id: "butter", qty: 0.06 }, { id: "bananas", qty: 1 }
    ]},
    { id: "bacon_eggs", name: "Bacon, eggs & toast", tier: 3, tags: ["kid"], ingredients: [
      { id: "bacon", qty: 0.35 }, { id: "eggs_dozen", qty: 0.5 }, { id: "bread", qty: 0.35 }, { id: "butter", qty: 0.05 }
    ]}
  ],
  lunch: [
    { id: "bean_rice", name: "Beans & rice bowls", tier: 1, tags: ["cheap", "quick", "no-oven"], ingredients: [
      { id: "canned_beans", qty: 2 }, { id: "rice", qty: 0.25 }, { id: "onions", qty: 0.15 }, { id: "salsa", qty: 0.15 }
    ]},
    { id: "pbj", name: "PB&J sandwiches + fruit", tier: 1, tags: ["cheap", "quick", "kid", "no-oven"], ingredients: [
      { id: "bread", qty: 0.5 }, { id: "peanut_butter", qty: 0.15 }, { id: "jam", qty: 0.12 }, { id: "apples", qty: 1.2 }
    ]},
    { id: "grilled_cheese", name: "Grilled cheese & fruit", tier: 1, tags: ["cheap", "quick", "kid"], ingredients: [
      { id: "bread", qty: 0.5 }, { id: "cheddar", qty: 0.35 }, { id: "butter", qty: 0.06 }, { id: "apples", qty: 1 }
    ]},
    { id: "tuna_sand", name: "Tuna sandwiches & carrots", tier: 1, tags: ["cheap", "quick", "no-oven"], ingredients: [
      { id: "canned_tuna", qty: 2 }, { id: "bread", qty: 0.5 }, { id: "mayo", qty: 0.08 }, { id: "carrots", qty: 0.5 }
    ]},
    { id: "quesadillas", name: "Cheese quesadillas & salsa", tier: 2, tags: ["quick", "kid"], ingredients: [
      { id: "tortillas", qty: 0.5 }, { id: "cheddar", qty: 0.4 }, { id: "salsa", qty: 0.2 }, { id: "canned_beans", qty: 1 }
    ]},
    { id: "leftover_soup", name: "Leftover soup bowls", tier: 1, tags: ["cheap", "soup", "no-oven"], ingredients: [
      { id: "broth", qty: 0.5 }, { id: "frozen_veg", qty: 0.4 }, { id: "pasta", qty: 0.2 }, { id: "canned_beans", qty: 1 }
    ]},
    { id: "chicken_wraps", name: "Chicken wraps with lettuce", tier: 2, tags: ["quick", "no-oven"], ingredients: [
      { id: "chicken_thighs", qty: 0.8 }, { id: "tortillas", qty: 0.5 }, { id: "lettuce", qty: 0.5 }, { id: "mayo", qty: 0.06 }
    ]},
    { id: "sloppy_joe_sand", name: "Sloppy joe sandwiches", tier: 2, tags: ["kid", "quick"], ingredients: [
      { id: "ground_beef", qty: 0.6 }, { id: "tomato_sauce", qty: 1 }, { id: "onions", qty: 0.2 }, { id: "bread", qty: 0.5 }
    ]}
  ],
  dinner: [
    /* Cook-once / eat-twice family staples — qty ~8 servings (family of 4 × 2 meals).
     * Common one-store basket foods; familiar weeknight dinners, not photo recipes. */
    { id: "spaghetti_meat", name: "Spaghetti with meat sauce", tier: 1, tags: ["cheap", "kid", "no-oven"],
      notes: "Stir in grated carrot or zucchini. Leftovers reheat well.",
      ingredients: [
      { id: "pasta", qty: 1.5 }, { id: "ground_beef", qty: 1.5 }, { id: "tomato_sauce", qty: 3 },
      { id: "onions", qty: 0.3 }, { id: "garlic", qty: 2 }, { id: "carrots", qty: 0.4 }
    ]},
    { id: "chili", name: "Beef & bean chili", tier: 1, tags: ["cheap", "soup", "kid", "no-oven"],
      notes: "Turkey works instead of beef. Add carrots or zucchini if you like.",
      ingredients: [
      { id: "ground_beef", qty: 1.5 }, { id: "canned_beans", qty: 4 }, { id: "canned_tomato", qty: 2 },
      { id: "onions", qty: 0.35 }, { id: "spices", qty: 0.25 }, { id: "rice", qty: 0.35 }
    ]},
    { id: "chicken_potato_stew", name: "Chicken & potato stew", tier: 1, tags: ["cheap", "soup", "kid", "no-oven"],
      notes: "Swap celery for zucchini. Big pot, two meals.",
      ingredients: [
      { id: "chicken_thighs", qty: 2.5 }, { id: "potatoes", qty: 0.8 }, { id: "carrots", qty: 0.8 },
      { id: "celery", qty: 1 }, { id: "onions", qty: 0.35 }, { id: "broth", qty: 1.2 }
    ]},
    { id: "sheet_pan_chicken", name: "Sheet-pan chicken with potatoes & carrots", tier: 2, tags: ["kid"],
      notes: "Swap sweet potatoes or zucchini for carrots.",
      ingredients: [
      { id: "chicken_thighs", qty: 2.5 }, { id: "potatoes", qty: 0.8 }, { id: "carrots", qty: 1 },
      { id: "onions", qty: 0.3 }, { id: "oil", qty: 0.08 }, { id: "spices", qty: 0.2 }
    ]},
    { id: "chicken_rice_casserole", name: "Chicken & rice casserole", tier: 2, tags: ["kid"],
      notes: "Thighs or breasts. Mix in frozen veg or zucchini.",
      ingredients: [
      { id: "chicken_thighs", qty: 2 }, { id: "rice", qty: 0.55 }, { id: "broth", qty: 1 },
      { id: "frozen_veg", qty: 0.8 }, { id: "onions", qty: 0.25 }, { id: "cheddar", qty: 0.35 }
    ]},
    { id: "beef_veg_soup", name: "Beef & vegetable soup", tier: 1, tags: ["cheap", "soup", "no-oven"],
      notes: "Any frozen veg works. Cook once, lunch tomorrow.",
      ingredients: [
      { id: "ground_beef", qty: 1.2 }, { id: "broth", qty: 1.2 }, { id: "carrots", qty: 0.7 },
      { id: "celery", qty: 1 }, { id: "onions", qty: 0.3 }, { id: "potatoes", qty: 0.5 }, { id: "canned_tomato", qty: 1 }
    ]},
    { id: "chicken_noodle_soup", name: "Chicken noodle soup", tier: 1, tags: ["cheap", "soup", "kid", "no-oven"],
      notes: "Classic sick-day / leftover pot. Add frozen veg for stretch.",
      ingredients: [
      { id: "chicken_thighs", qty: 2 }, { id: "broth", qty: 1.5 }, { id: "pasta", qty: 0.7 },
      { id: "carrots", qty: 0.6 }, { id: "celery", qty: 1 }, { id: "onions", qty: 0.3 }
    ]},
    { id: "sloppy_joes", name: "Sloppy joes", tier: 1, tags: ["cheap", "kid", "quick"],
      notes: "Serve on bread or tortillas. Chopped carrot stretches the pan.",
      ingredients: [
      { id: "ground_beef", qty: 1.5 }, { id: "tomato_sauce", qty: 2 }, { id: "onions", qty: 0.35 },
      { id: "bread", qty: 0.8 }, { id: "carrots", qty: 0.3 }
    ]},
    { id: "red_beans_rice", name: "Red beans & rice", tier: 1, tags: ["cheap", "no-oven"],
      notes: "Celery and onion make the base. Freeze half if you want.",
      ingredients: [
      { id: "canned_beans", qty: 4 }, { id: "rice", qty: 0.55 }, { id: "onions", qty: 0.35 },
      { id: "celery", qty: 1 }, { id: "broth", qty: 0.6 }, { id: "spices", qty: 0.2 }
    ]},
    { id: "meatball_pasta", name: "Meatballs & pasta", tier: 2, tags: ["kid"],
      notes: "Bake a big tray of meatballs; sauce and pasta for night two.",
      ingredients: [
      { id: "ground_beef", qty: 1.5 }, { id: "pasta", qty: 1.5 }, { id: "tomato_sauce", qty: 3 },
      { id: "onions", qty: 0.25 }, { id: "bread", qty: 0.2 }, { id: "eggs_dozen", qty: 0.15 }, { id: "garlic", qty: 2 }
    ]},
    { id: "beef_potato_skillet", name: "Ground beef & potato skillet", tier: 1, tags: ["cheap", "kid", "quick", "no-oven"],
      notes: "One skillet, onion and frozen veg optional. Reheats for lunch.",
      ingredients: [
      { id: "ground_beef", qty: 1.5 }, { id: "potatoes", qty: 0.9 }, { id: "onions", qty: 0.35 },
      { id: "frozen_veg", qty: 0.6 }, { id: "cheddar", qty: 0.3 }, { id: "spices", qty: 0.15 }
    ]},
    { id: "baked_pasta", name: "Baked pasta with meat sauce", tier: 2, tags: ["kid"],
      notes: "Ziti-style bake. Extra cheese on top; leftovers pack well.",
      ingredients: [
      { id: "pasta", qty: 1.5 }, { id: "ground_beef", qty: 1.2 }, { id: "tomato_sauce", qty: 3 },
      { id: "onions", qty: 0.3 }, { id: "cheddar", qty: 0.5 }, { id: "garlic", qty: 2 }
    ]},
    { id: "breakfast_for_dinner", name: "Breakfast-for-dinner", tier: 1, tags: ["cheap", "kid", "quick"],
      notes: "Eggs, potatoes, toast — easy crowd night.",
      ingredients: [
      { id: "eggs_dozen", qty: 1 }, { id: "potatoes", qty: 0.7 }, { id: "bread", qty: 0.6 },
      { id: "butter", qty: 0.1 }, { id: "onions", qty: 0.2 }, { id: "cheddar", qty: 0.25 }
    ]},
    { id: "mac_hotdogs", name: "Mac & cheese with hot dogs", tier: 1, tags: ["cheap", "kid", "quick", "no-oven"],
      notes: "Stir in frozen peas. Kids finish the leftovers.",
      ingredients: [
      { id: "mac_cheese", qty: 4 }, { id: "hot_dogs", qty: 1.5 }, { id: "frozen_peas", qty: 0.4 }
    ]},
    { id: "soup_grilled_cheese", name: "Tomato soup & grilled cheese", tier: 2, tags: ["soup", "kid"],
      notes: "Broth + canned tomatoes. Use whatever cheese you have.",
      ingredients: [
      { id: "canned_tomato", qty: 3 }, { id: "broth", qty: 0.7 }, { id: "bread", qty: 0.8 },
      { id: "cheddar", qty: 0.6 }, { id: "butter", qty: 0.12 }
    ]},
    { id: "turkey_chili", name: "Turkey chili", tier: 2, tags: ["soup", "kid", "no-oven"],
      notes: "Same pot method as beef chili. Freeze half if you want.",
      ingredients: [
      { id: "ground_turkey", qty: 1.5 }, { id: "canned_beans", qty: 3 }, { id: "canned_tomato", qty: 2 },
      { id: "onions", qty: 0.3 }, { id: "spices", qty: 0.2 }, { id: "rice", qty: 0.3 }
    ]},
    { id: "chicken_sandwiches", name: "Shredded chicken sandwiches", tier: 2, tags: ["kid", "quick"],
      notes: "Slow-cook or simmer thighs; leftover meat for wraps tomorrow.",
      ingredients: [
      { id: "chicken_thighs", qty: 2.5 }, { id: "bread", qty: 0.8 }, { id: "onions", qty: 0.3 }, { id: "broth", qty: 0.4 }, { id: "carrots", qty: 0.4 }, { id: "mayo", qty: 0.08 }
    ]},
    { id: "taco_night", name: "Taco night", tier: 2, tags: ["kid", "quick"],
      notes: "Beef or turkey. Lettuce, cheese, salsa. Leftover meat makes lunch.",
      ingredients: [
      { id: "ground_beef", qty: 1.5 }, { id: "canned_beans", qty: 2 }, { id: "tortillas", qty: 1 },
      { id: "lettuce", qty: 0.6 }, { id: "cheddar", qty: 0.4 }, { id: "salsa", qty: 0.35 }, { id: "onions", qty: 0.2 }
    ]},
    { id: "frozen_pizza_night", name: "Pizza night with salad", tier: 2, tags: ["kid", "quick"], ingredients: [
      { id: "frozen_pizza", qty: 2 }, { id: "lettuce", qty: 0.5 }, { id: "tomatoes", qty: 0.4 }
    ]}
  ]
};

window.MEAL_TYPE_CHIPS = [
  { id: "soup", label: "Soup" },
  { id: "quick", label: "Quick" },
  { id: "cheap", label: "Cheap" },
  { id: "kid", label: "Kid-friendly" },
  { id: "no-oven", label: "No oven" }
];

window.SEASONAL = {
  winter: {
    key: "winter", months: [12, 1, 2],
    title: "Soup pot season",
    blurb: "Big pots, small prices — cook once and eat twice.",
    recipes: [
      { id: "chicken_potato_stew", name: "Chicken & potato stew", serves: 8, meals: 2, cost: 14.5, notes: "Thighs, potatoes, carrots, celery, broth. Leftovers for lunch." },
      { id: "beef_veg_soup", name: "Beef & vegetable soup", serves: 8, meals: 2, cost: 12.8, notes: "Ground beef, broth, carrots, celery, potatoes, canned tomatoes." },
      { id: "chili", name: "Beef & bean chili", serves: 8, meals: 2, cost: 13.2, notes: "Ground beef, beans, tomatoes, spices. Freeze half if you like." },
      { id: "chicken_noodle_soup", name: "Chicken noodle soup", serves: 8, meals: 2, cost: 12.0, notes: "Thighs, broth, pasta, carrots, celery, onion." }
    ]
  },
  spring: {
    key: "spring", months: [3, 4, 5],
    title: "Lighter pots, same stretch",
    blurb: "Familiar dinners with more veg — still one-store staples.",
    recipes: [
      { id: "spaghetti_meat", name: "Spaghetti with meat sauce", serves: 8, meals: 2, cost: 12.0, notes: "Pasta, ground beef, sauce, onion. Add grated carrot." },
      { id: "sheet_pan_chicken", name: "Sheet-pan chicken with potatoes & carrots", serves: 8, meals: 2, cost: 14.0, notes: "Thighs, potatoes, carrots, oil, spices." },
      { id: "red_beans_rice", name: "Red beans & rice", serves: 8, meals: 2, cost: 9.5, notes: "Canned beans, rice, onion, celery, broth." },
      { id: "chicken_rice_casserole", name: "Chicken & rice casserole", serves: 8, meals: 2, cost: 14.2, notes: "Thighs, rice, broth, frozen veg, cheese." }
    ]
  },
  summer: {
    key: "summer", months: [6, 7, 8],
    title: "Easy skillet & sandwich nights",
    blurb: "Crowd-pleasers that reheat without fuss.",
    recipes: [
      { id: "taco_night", name: "Taco night", serves: 8, meals: 2, cost: 15.0, notes: "Ground beef, beans, tortillas, lettuce, cheese, salsa." },
      { id: "sloppy_joes", name: "Sloppy joes", serves: 8, meals: 2, cost: 12.5, notes: "Ground beef, tomato sauce, onion, bread." },
      { id: "beef_potato_skillet", name: "Ground beef & potato skillet", serves: 8, meals: 2, cost: 13.0, notes: "Beef, potatoes, onion, frozen veg, cheese." },
      { id: "breakfast_for_dinner", name: "Breakfast-for-dinner", serves: 8, meals: 2, cost: 10.5, notes: "Eggs, potatoes, toast, cheese." }
    ]
  },
  fall: {
    key: "fall", months: [9, 10, 11],
    title: "Cook once, eat twice",
    blurb: "November stretch meals — big pots, small prices, leftovers for lunch.",
    recipes: [
      { id: "chili", name: "Beef & bean chili", serves: 8, meals: 2, cost: 13.2, notes: "Ground beef, canned beans, tomatoes, spices." },
      { id: "baked_pasta", name: "Baked pasta with meat sauce", serves: 8, meals: 2, cost: 13.5, notes: "Pasta, beef, sauce, cheese — leftovers pack well." },
      { id: "meatball_pasta", name: "Meatballs & pasta", serves: 8, meals: 2, cost: 14.0, notes: "Big tray of meatballs; sauce and pasta for night two." },
      { id: "soup_grilled_cheese", name: "Tomato soup & grilled cheese", serves: 8, meals: 2, cost: 11.0, notes: "Canned tomatoes, broth, bread, cheddar." }
    ]
  }
};

window.getSeasonalForMonth = function (month) {
  const m = month == null ? (new Date().getMonth() + 1) : month;
  const keys = Object.keys(window.SEASONAL);
  for (let i = 0; i < keys.length; i++) {
    const block = window.SEASONAL[keys[i]];
    if (block.months.indexOf(m) !== -1) return block;
  }
  return window.SEASONAL.fall;
};

window.findMeal = function (slot, id) {
  const list = (window.MEAL_CATALOG[slot] || []);
  for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
  return null;
};
