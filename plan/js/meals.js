/* Meal templates: qty is for 4 servings (scale by family/4).
 * tags: soup | quick | cheap | kid | no-oven
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
    { id: "ramen_veg", name: "Ramen with frozen veggies & egg", tier: 1, tags: ["cheap", "quick", "soup", "no-oven"], ingredients: [
      { id: "ramen", qty: 0.7 }, { id: "frozen_veg", qty: 0.4 }, { id: "eggs_dozen", qty: 0.35 }
    ]},
    { id: "tuna_sand", name: "Tuna sandwiches & carrots", tier: 1, tags: ["cheap", "quick", "no-oven"], ingredients: [
      { id: "canned_tuna", qty: 2 }, { id: "bread", qty: 0.5 }, { id: "mayo", qty: 0.08 }, { id: "carrots", qty: 0.5 }
    ]},
    { id: "leftover_soup", name: "Hearty leftover soup bowls", tier: 1, tags: ["cheap", "soup", "no-oven"], ingredients: [
      { id: "broth", qty: 0.5 }, { id: "frozen_veg", qty: 0.4 }, { id: "pasta", qty: 0.2 }, { id: "canned_beans", qty: 1 }
    ]},
    { id: "quesadillas", name: "Cheese quesadillas & salsa", tier: 2, tags: ["quick", "kid"], ingredients: [
      { id: "tortillas", qty: 0.5 }, { id: "cheddar", qty: 0.4 }, { id: "salsa", qty: 0.2 }, { id: "canned_beans", qty: 1 }
    ]},
    { id: "chicken_wraps", name: "Chicken wraps with lettuce", tier: 2, tags: ["quick", "no-oven"], ingredients: [
      { id: "chicken_thighs", qty: 0.8 }, { id: "tortillas", qty: 0.5 }, { id: "lettuce", qty: 0.5 }, { id: "mayo", qty: 0.06 }
    ]},
    { id: "pasta_salad", name: "Pasta salad with veggies", tier: 2, tags: ["quick", "no-oven", "cheap"], ingredients: [
      { id: "pasta", qty: 0.5 }, { id: "frozen_veg", qty: 0.4 }, { id: "oil", qty: 0.04 }, { id: "canned_beans", qty: 1 }
    ]},
    { id: "grilled_cheese", name: "Grilled cheese & fruit", tier: 1, tags: ["cheap", "quick", "kid"], ingredients: [
      { id: "bread", qty: 0.5 }, { id: "cheddar", qty: 0.35 }, { id: "butter", qty: 0.06 }, { id: "apples", qty: 1 }
    ]},
    { id: "turkey_burgers", name: "Turkey burgers on toast", tier: 3, tags: ["kid"], ingredients: [
      { id: "ground_turkey", qty: 1 }, { id: "bread", qty: 0.5 }, { id: "lettuce", qty: 0.4 }, { id: "tomatoes", qty: 0.5 }
    ]}
  ],
  dinner: [
    { id: "lentil_soup", name: "Lentil soup with bread", tier: 1, tags: ["cheap", "soup", "no-oven"], ingredients: [
      { id: "lentils", qty: 0.5 }, { id: "carrots", qty: 0.5 }, { id: "onions", qty: 0.2 }, { id: "broth", qty: 0.75 }, { id: "bread", qty: 0.35 }
    ]},
    { id: "bean_chili", name: "Three-bean chili", tier: 1, tags: ["cheap", "soup", "no-oven"], ingredients: [
      { id: "canned_beans", qty: 3 }, { id: "canned_tomato", qty: 1 }, { id: "onions", qty: 0.25 }, { id: "spices", qty: 0.15 }, { id: "rice", qty: 0.2 }
    ]},
    { id: "pasta_marinara", name: "Pasta with marinara", tier: 1, tags: ["cheap", "kid", "quick", "no-oven"], ingredients: [
      { id: "pasta", qty: 1 }, { id: "tomato_sauce", qty: 2 }, { id: "garlic", qty: 1 }, { id: "oil", qty: 0.04 }
    ]},
    { id: "potato_hash", name: "Potato hash with eggs", tier: 1, tags: ["cheap", "quick"], ingredients: [
      { id: "potatoes", qty: 0.5 }, { id: "onions", qty: 0.2 }, { id: "eggs_dozen", qty: 0.5 }, { id: "frozen_veg", qty: 0.35 }
    ]},
    { id: "rice_veg_stir", name: "Rice & veggie stir-fry", tier: 1, tags: ["cheap", "quick", "no-oven"], ingredients: [
      { id: "rice", qty: 0.3 }, { id: "frozen_veg", qty: 0.7 }, { id: "soy_sauce", qty: 0.08 }, { id: "eggs_dozen", qty: 0.35 }, { id: "oil", qty: 0.04 }
    ]},
    { id: "cabbage_stew", name: "Cabbage & potato stew", tier: 1, tags: ["cheap", "soup", "no-oven"], ingredients: [
      { id: "cabbage", qty: 0.6 }, { id: "potatoes", qty: 0.4 }, { id: "carrots", qty: 0.4 }, { id: "broth", qty: 0.5 }, { id: "onions", qty: 0.2 }
    ]},
    { id: "mac_hotdogs", name: "Mac & cheese with hot dogs", tier: 1, tags: ["cheap", "kid", "quick", "no-oven"], ingredients: [
      { id: "mac_cheese", qty: 3 }, { id: "hot_dogs", qty: 1 }, { id: "frozen_peas", qty: 0.3 }
    ]},
    { id: "soup_grilled_cheese", name: "Tomato soup & grilled cheese", tier: 2, tags: ["soup", "kid"], ingredients: [
      { id: "canned_tomato", qty: 2 }, { id: "broth", qty: 0.4 }, { id: "bread", qty: 0.5 }, { id: "cheddar", qty: 0.4 }, { id: "butter", qty: 0.08 }
    ]},
    { id: "chicken_rice", name: "Chicken & rice skillet", tier: 2, tags: ["quick", "kid", "no-oven"], ingredients: [
      { id: "chicken_thighs", qty: 1.2 }, { id: "rice", qty: 0.3 }, { id: "frozen_veg", qty: 0.5 }, { id: "broth", qty: 0.4 }, { id: "onions", qty: 0.15 }
    ]},
    { id: "taco_night", name: "Taco night (beans & beef)", tier: 2, tags: ["kid", "quick"], ingredients: [
      { id: "ground_beef", qty: 0.75 }, { id: "canned_beans", qty: 1 }, { id: "tortillas", qty: 0.6 }, { id: "lettuce", qty: 0.4 }, { id: "cheddar", qty: 0.25 }, { id: "salsa", qty: 0.25 }
    ]},
    { id: "baked_chicken", name: "Baked chicken, potatoes & carrots", tier: 2, tags: ["kid"], ingredients: [
      { id: "chicken_thighs", qty: 1.5 }, { id: "potatoes", qty: 0.45 }, { id: "carrots", qty: 0.6 }, { id: "oil", qty: 0.04 }, { id: "spices", qty: 0.1 }
    ]},
    { id: "spaghetti_meat", name: "Spaghetti with meat sauce", tier: 2, tags: ["kid", "no-oven"], ingredients: [
      { id: "pasta", qty: 1 }, { id: "ground_beef", qty: 0.75 }, { id: "tomato_sauce", qty: 2 }, { id: "onions", qty: 0.2 }, { id: "garlic", qty: 1 }
    ]},
    { id: "frozen_pizza_night", name: "Pizza night with salad", tier: 2, tags: ["kid", "quick"], ingredients: [
      { id: "frozen_pizza", qty: 2 }, { id: "lettuce", qty: 0.5 }, { id: "tomatoes", qty: 0.4 }
    ]},
    { id: "pork_sweet_potato", name: "Pork chops & sweet potatoes", tier: 3, tags: [], ingredients: [
      { id: "pork_chops", qty: 1.5 }, { id: "sweet_potato", qty: 2 }, { id: "frozen_broccoli", qty: 0.5 }, { id: "oil", qty: 0.04 }
    ]},
    { id: "beef_stirfry", name: "Beef & broccoli stir-fry", tier: 3, tags: ["quick", "no-oven"], ingredients: [
      { id: "ground_beef", qty: 1.2 }, { id: "broccoli", qty: 1.2 }, { id: "rice", qty: 0.3 }, { id: "soy_sauce", qty: 0.1 }, { id: "garlic", qty: 1 }
    ]},
    { id: "chicken_breast_dinner", name: "Chicken breast, rice & salad", tier: 3, tags: [], ingredients: [
      { id: "chicken_breast", qty: 1.5 }, { id: "rice", qty: 0.3 }, { id: "lettuce", qty: 0.6 }, { id: "tomatoes", qty: 0.5 }, { id: "oil", qty: 0.05 }
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
    months: [12, 1, 2],
    title: "Warm bowl season",
    blurb: "Cold nights call for filling, low-cost pots that stretch for days.",
    recipes: [
      { name: "Classic lentil soup", serves: 6, cost: 7.50, notes: "Lentils, carrots, onion, broth, bread on the side." },
      { name: "Potato leek-style chowder", serves: 6, cost: 8.20, notes: "Potatoes, onion, milk, frozen veg, broth." },
      { name: "White bean & cabbage stew", serves: 8, cost: 6.90, notes: "Canned beans, cabbage, carrots, spices." },
      { name: "Chicken noodle pot", serves: 6, cost: 11.40, notes: "Thighs, pasta, carrots, celery, broth." }
    ]
  },
  spring: {
    months: [3, 4, 5],
    title: "Fresh & light season",
    blurb: "Lean into eggs, greens, and simple skillet meals as produce gets cheaper.",
    recipes: [
      { name: "Egg fried rice with peas", serves: 4, cost: 5.80, notes: "Rice, eggs, frozen peas, soy sauce." },
      { name: "Spinach & bean quesadillas", serves: 4, cost: 7.10, notes: "Tortillas, cheese, spinach, canned beans." },
      { name: "Lemon garlic pasta", serves: 4, cost: 6.40, notes: "Pasta, garlic, oil, lemon, frozen broccoli." },
      { name: "Chicken & veggie sheet pan", serves: 5, cost: 12.00, notes: "Thighs, carrots, potatoes, spices." }
    ]
  },
  summer: {
    months: [6, 7, 8],
    title: "Grill & no-cook season",
    blurb: "Keep the kitchen cool with salads, wraps, and quick skillet dinners.",
    recipes: [
      { name: "Bean & corn salad bowls", serves: 4, cost: 6.20, notes: "Canned beans, corn, salsa, rice or tortillas." },
      { name: "Tuna cucumber wraps", serves: 4, cost: 7.00, notes: "Tuna, tortillas, cucumber, mayo." },
      { name: "Pasta primavera (frozen veg)", serves: 5, cost: 7.80, notes: "Pasta, frozen mixed veg, oil, garlic." },
      { name: "Turkey burger night", serves: 4, cost: 11.50, notes: "Ground turkey, bread, lettuce, tomato." }
    ]
  },
  fall: {
    months: [9, 10, 11],
    title: "Soup season: cheap soups",
    blurb: "November stretch meals — big pots, small prices, leftovers for lunch.",
    recipes: [
      { name: "Tomato soup & grilled cheese", serves: 4, cost: 8.40, notes: "Canned tomatoes, broth, bread, cheddar." },
      { name: "Squash & bean chili", serves: 6, cost: 9.10, notes: "Winter squash, canned beans, tomatoes, spices." },
      { name: "Chicken tortilla soup", serves: 6, cost: 10.80, notes: "Thighs, broth, salsa, tortillas, beans." },
      { name: "Hearty vegetable barley-style stew", serves: 8, cost: 7.60, notes: "Potatoes, carrots, cabbage, lentils, broth." }
    ]
  }
};

window.getSeasonalForMonth = function (month) {
  const m = month || (new Date().getMonth() + 1);
  for (const key of Object.keys(window.SEASONAL)) {
    if (window.SEASONAL[key].months.includes(m)) return { key, ...window.SEASONAL[key] };
  }
  return { key: "fall", ...window.SEASONAL.fall };
};

window.findMeal = function (slot, id) {
  return (window.MEAL_CATALOG[slot] || []).find((m) => m.id === id) || null;
};
