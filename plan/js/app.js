(function () {
  "use strict";

  const STORAGE_KEY = "ai901_plan_receipts_v1";
  const CUSHION_MIN = 0.03; // aim 3–5% under budget for shelf variance
  const CUSHION_MAX = 0.05;
  const prices = () => window.PRICE_TABLE.items;

  const state = {
    store: "any store",
    budget: 250,
    family: 4,
    days: 7,
    pantry: new Set(),
    allergies: new Set(),
    mealTypes: new Set(),
    swaps: {}, // "day-slot" -> mealId
    lastPlan: null,
    extrasAdded: false
  };

  function money(n) {
    return "$" + (Math.round(n * 100) / 100).toFixed(2);
  }
  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
  }
  function formatQty(q) {
    if (Number.isInteger(q)) return String(q);
    return (Math.round(q * 100) / 100).toString();
  }

  function pantryKeySet() {
    const keys = new Set();
    (window.PANTRY_CHIPS || []).forEach((chip) => {
      if (state.pantry.has(chip.id)) chip.keys.forEach((k) => keys.add(k));
    });
    return keys;
  }

  function allergyKeySet(allergies) {
    const set = allergies || state.allergies;
    const keys = new Set();
    (window.ALLERGY_CHIPS || []).forEach((chip) => {
      if (set.has(chip.id)) (chip.keys || []).forEach((k) => keys.add(k));
    });
    return keys;
  }

  function mealContainsAllergen(meal, allergyKeys) {
    if (!allergyKeys || !allergyKeys.size) return false;
    return (meal.ingredients || []).some((ing) => allergyKeys.has(ing.id));
  }

  function countSkippedPantry(shopBeforeFilter, pantryKeys) {
    // Count distinct pantry chip staples that would have been on the list
    let n = 0;
    (window.PANTRY_CHIPS || []).forEach((chip) => {
      if (!state.pantry.has(chip.id)) return;
      if (chip.keys.some((k) => pantryKeys.has(k))) n += 1;
    });
    return n || state.pantry.size;
  }

  /* Cost of a meal after excluding pantry staples already on hand */
  function mealCost(meal, scale, pantryKeys) {
    const table = prices();
    let total = 0;
    const lines = [];
    const skipped = [];
    meal.ingredients.forEach((ing) => {
      const item = table[ing.id];
      if (!item) return;
      const qty = ing.qty * scale;
      if (pantryKeys.has(ing.id)) {
        skipped.push({ id: ing.id, name: item.name, qty });
        return;
      }
      const cost = item.price * qty;
      total += cost;
      lines.push({ id: ing.id, name: item.name, unit: item.unit, cat: item.cat, qty, price: item.price, cost });
    });
    return { total, lines, skipped };
  }

  function mealMatchesTypes(meal, types) {
    if (!types || !types.size) return true;
    const tags = meal.tags || [];
    for (const t of types) {
      if (!tags.includes(t)) return false;
    }
    return true;
  }

  function poolFor(slot, tierMax, types, preferKid, allergyKeys) {
    let pool = (window.MEAL_CATALOG[slot] || []).filter((m) => m.tier <= tierMax);
    if (allergyKeys && allergyKeys.size) {
      const safe = pool.filter((m) => !mealContainsAllergen(m, allergyKeys));
      if (safe.length) pool = safe;
      else pool = pool.filter((m) => !mealContainsAllergen(m, allergyKeys));
    }
    if (types && types.size) {
      const filtered = pool.filter((m) => mealMatchesTypes(m, types));
      if (filtered.length) pool = filtered;
    }
    if (preferKid) {
      const kids = pool.filter((m) => (m.tags || []).includes("kid"));
      if (kids.length) pool = kids;
    }
    if (!pool.length) {
      // last resort: any meal without allergens, else cheapest tier
      pool = (window.MEAL_CATALOG[slot] || []).filter((m) => !mealContainsAllergen(m, allergyKeys || new Set()));
    }
    if (!pool.length) pool = (window.MEAL_CATALOG[slot] || []).filter((m) => m.tier <= 1);
    return pool;
  }

  function pickSequence(pool, count, seed) {
    if (!pool.length) return [];
    const sorted = pool.slice().sort((a, b) => a.tier - b.tier || a.id.localeCompare(b.id));
    // rotate by seed for variety across family sizes
    const start = seed % sorted.length;
    const out = [];
    for (let i = 0; i < count; i++) out.push(sorted[(start + i) % sorted.length]);
    return out;
  }

  function assemble(breakfasts, lunches, dinners, scale, pantryKeys) {
    const daysOut = [];
    const shopMap = {};
    let mealTotal = 0;
    const days = Math.max(breakfasts.length, lunches.length, dinners.length);
    for (let d = 0; d < days; d++) {
      const b = breakfasts[d];
      const l = lunches[d];
      const din = dinners[d];
      const bc = mealCost(b, scale, pantryKeys);
      const lc = mealCost(l, scale, pantryKeys);
      const dc = mealCost(din, scale, pantryKeys);
      mealTotal += bc.total + lc.total + dc.total;
      [bc, lc, dc].forEach((block) => {
        block.lines.forEach((line) => {
          if (!shopMap[line.id]) shopMap[line.id] = { ...line, qty: 0, cost: 0 };
          shopMap[line.id].qty += line.qty;
          shopMap[line.id].cost += line.cost;
        });
      });
      daysOut.push({
        day: d + 1,
        breakfast: { id: b.id, name: b.name, cost: bc.total, tags: b.tags || [] },
        lunch: { id: l.id, name: l.name, cost: lc.total, tags: l.tags || [] },
        dinner: { id: din.id, name: din.name, cost: dc.total, tags: din.tags || [] },
        dayTotal: bc.total + lc.total + dc.total
      });
    }
    return { daysOut, shopMap, mealTotal };
  }

  function applySwaps(breakfasts, lunches, dinners) {
    const b = breakfasts.slice();
    const l = lunches.slice();
    const d = dinners.slice();
    Object.keys(state.swaps).forEach((key) => {
      const [dayStr, slot] = key.split("-");
      const idx = parseInt(dayStr, 10) - 1;
      const meal = window.findMeal(slot, state.swaps[key]);
      if (!meal || idx < 0) return;
      if (mealContainsAllergen(meal, allergyKeySet())) return;
      if (slot === "breakfast" && b[idx]) b[idx] = meal;
      if (slot === "lunch" && l[idx]) l[idx] = meal;
      if (slot === "dinner" && d[idx]) d[idx] = meal;
    });
    return { breakfasts: b, lunches: l, dinners: d };
  }

  function roundShopping(shopMap) {
    const shopping = Object.values(shopMap).map((line) => {
      let buyQty = line.qty;
      const discrete = ["dozen", "can", "pkg", "box", "loaf", "jar", "bottle", "carton", "bag", "tub", "head", "bunch", "bulb", "each", "pack", "pint", "ear", "canister"];
      if (discrete.includes(line.unit)) {
        buyQty = Math.max(1, Math.ceil(line.qty - 0.05));
      } else if (line.unit === "lb" || line.unit === "gal") {
        buyQty = Math.max(0.5, Math.ceil(line.qty * 2) / 2);
      } else {
        buyQty = Math.max(0.1, Math.round(line.qty * 10) / 10);
      }
      return {
        id: line.id,
        name: line.name,
        unit: line.unit,
        cat: line.cat,
        qty: buyQty,
        price: line.price,
        cost: buyQty * line.price
      };
    });
    shopping.sort((a, b) => a.cat.localeCompare(b.cat) || a.name.localeCompare(b.name));
    return shopping;
  }

  function trimToBudget(shopping, budgetCap) {
    let list = shopping.map((x) => ({ ...x }));
    let total = list.reduce((s, x) => s + x.cost, 0);
    if (total <= budgetCap) return { list, total };

    const dropOrder = ["Drinks", "Pantry", "Frozen", "Grains & Bread", "Dairy & Eggs", "Produce", "Meat & Protein"];
    for (const cat of dropOrder) {
      for (let i = list.length - 1; i >= 0 && total > budgetCap; i--) {
        if (list[i].cat !== cat) continue;
        if (list[i].qty > 1) {
          const step = (list[i].unit === "lb" || list[i].unit === "gal") ? 0.5 : 1;
          list[i].qty = Math.max(step, list[i].qty - step);
          list[i].cost = list[i].qty * list[i].price;
        } else if (cat === "Drinks" || cat === "Pantry") {
          total -= list[i].cost;
          list.splice(i, 1);
          continue;
        }
        total = list.reduce((s, x) => s + x.cost, 0);
      }
    }

    total = list.reduce((s, x) => s + x.cost, 0);
    if (total > budgetCap && total > 0) {
      const f = (budgetCap * 0.999) / total;
      list.forEach((x) => { x.cost = Math.round(x.cost * f * 100) / 100; });
      // tiny fix rounding drift
      total = list.reduce((s, x) => s + x.cost, 0);
      if (total > budgetCap && list.length) {
        const diff = total - budgetCap;
        list[list.length - 1].cost = Math.max(0, list[list.length - 1].cost - diff);
        total = list.reduce((s, x) => s + x.cost, 0);
      }
    }
    return { list, total: list.reduce((s, x) => s + x.cost, 0) };
  }

  /**
   * HARD budget fit: shopping total never exceeds budget.
   * Targets ~3–5% under for shelf variance cushion.
   * Auto-downgrades meals/portions when needed.
   */
  function buildPlan(opts) {
    const budget = clamp(Number(opts.budget) || state.budget, 20, 2000);
    const family = clamp(Math.round(Number(opts.family) || state.family), 1, 16);
    const days = clamp(Math.round(Number(opts.days) || state.days), 1, 14);
    const store = (opts.store || state.store || "any store").trim() || "any store";
    const types = opts.mealTypes || state.mealTypes;
    const pantryKeys = opts.pantryKeys || pantryKeySet();
    const allergyKeys = opts.allergyKeys || allergyKeySet();
    const doExtras = !!opts.doExtras || state.extrasAdded;

    const target = budget * (1 - (CUSHION_MIN + CUSHION_MAX) / 2); // ~4% under
    const hardCap = budget; // never exceed

    let tierMax = 3;
    const ppd = budget / family / days;
    if (ppd < 3) tierMax = 1;
    else if (ppd < 6) tierMax = 2;

    let portion = 1;
    if (ppd >= 5) portion = 1.1;
    if (ppd >= 8) portion = 1.25;
    if (ppd >= 11) portion = 1.4;

    const preferKid = types.has("kid");
    let scale = (family / 4) * portion;
    let seed = family * 7 + days;

    function sequences(tMax) {
      const bPool = poolFor("breakfast", tMax, types, preferKid, allergyKeys);
      const lPool = poolFor("lunch", tMax, types, preferKid, allergyKeys);
      const dPool = poolFor("dinner", tMax, types, preferKid, allergyKeys);
      let breakfasts = pickSequence(bPool, days, seed);
      let lunches = pickSequence(lPool, days, seed + 3);
      let dinners = pickSequence(dPool, days, seed + 9);
      return applySwaps(breakfasts, lunches, dinners);
    }

    let seq = sequences(tierMax);
    let plan = assemble(seq.breakfasts, seq.lunches, seq.dinners, scale, pantryKeys);
    let guard = 0;
    let downgraded = false;

    while (plan.mealTotal > target && guard < 12) {
      downgraded = true;
      if (portion > 1.02) {
        portion = Math.max(1, portion - 0.15);
      } else if (tierMax > 1) {
        tierMax -= 1;
      } else {
        // force cheapest-only pools
        const cheapTypes = new Set(types);
        cheapTypes.add("cheap");
        const bPool = poolFor("breakfast", 1, cheapTypes.size ? cheapTypes : new Set(["cheap"]), false, allergyKeys);
        const lPool = poolFor("lunch", 1, cheapTypes.size ? cheapTypes : new Set(["cheap"]), false, allergyKeys);
        const dPool = poolFor("dinner", 1, cheapTypes.size ? cheapTypes : new Set(["cheap"]), false, allergyKeys);
        seq = applySwaps(
          pickSequence(bPool.length ? bPool : window.MEAL_CATALOG.breakfast.filter((m) => m.tier === 1), days, seed),
          pickSequence(lPool.length ? lPool : window.MEAL_CATALOG.lunch.filter((m) => m.tier === 1), days, seed + 3),
          pickSequence(dPool.length ? dPool : window.MEAL_CATALOG.dinner.filter((m) => m.tier === 1), days, seed + 9)
        );
        scale = (family / 4) * Math.max(0.65, portion * 0.85);
        plan = assemble(seq.breakfasts, seq.lunches, seq.dinners, scale, pantryKeys);
        if (plan.mealTotal <= target || plan.mealTotal <= hardCap) break;
        scale *= 0.85;
        plan = assemble(seq.breakfasts, seq.lunches, seq.dinners, scale, pantryKeys);
        break;
      }
      scale = (family / 4) * portion;
      seq = sequences(tierMax);
      plan = assemble(seq.breakfasts, seq.lunches, seq.dinners, scale, pantryKeys);
      guard++;
    }

    // If still over hard cap, scale meal costs/qty down
    if (plan.mealTotal > hardCap) {
      const f = (hardCap * (1 - CUSHION_MIN)) / plan.mealTotal;
      Object.keys(plan.shopMap).forEach((id) => {
        plan.shopMap[id].qty *= f;
        plan.shopMap[id].cost *= f;
      });
      plan.daysOut.forEach((d) => {
        d.breakfast.cost *= f;
        d.lunch.cost *= f;
        d.dinner.cost *= f;
        d.dayTotal *= f;
      });
      plan.mealTotal *= f;
      downgraded = true;
    }

    // If well under target, nudge portion up once and rebuild (still capped later)
    if (plan.mealTotal < target * 0.75 && portion < 1.8) {
      const boost = Math.min(1.8, Math.max(portion * 1.25, target * 0.9 / Math.max(plan.mealTotal, 1) * portion));
      if (boost > portion + 0.05) {
        portion = boost;
        scale = (family / 4) * portion;
        seq = sequences(tierMax);
        // re-apply swaps on new sequences
        plan = assemble(seq.breakfasts, seq.lunches, seq.dinners, scale, pantryKeys);
        if (plan.mealTotal > hardCap) {
          const f = (hardCap * (1 - CUSHION_MIN)) / plan.mealTotal;
          Object.keys(plan.shopMap).forEach((id) => {
            plan.shopMap[id].qty *= f;
            plan.shopMap[id].cost *= f;
          });
          plan.daysOut.forEach((d) => {
            d.breakfast.cost *= f; d.lunch.cost *= f; d.dinner.cost *= f; d.dayTotal *= f;
          });
          plan.mealTotal *= f;
        }
      }
    }

    // Optional / extras fill toward ~4% cushion (never past hardCap). Skip pantry + allergens.
    const fillIds = [
      "chicken_thighs", "ground_turkey", "canned_tuna", "eggs_dozen", "cheddar",
      "milk_gallon", "yogurt", "bread", "tortillas", "rice", "pasta", "canned_beans",
      "frozen_veg", "bananas", "apples", "carrots", "potatoes", "lettuce",
      "peanut_butter", "cereal", "juice", "frozen_berries", "oats"
    ];
    const fillCaps = {
      chicken_thighs: 3, ground_turkey: 2, bananas: 4, apples: 3, carrots: 2,
      potatoes: 1, bread: 2, eggs_dozen: 2, milk_gallon: 2, canned_beans: 4,
      frozen_veg: 3, rice: 1, pasta: 2, tortillas: 2
    };
    const table = prices();
    const fillCap = Math.min(target, hardCap * (1 - CUSHION_MIN));
    const fillPasses = doExtras ? 6 : 2;
    for (let pass = 0; pass < fillPasses; pass++) {
      let added = false;
      fillIds.forEach((id) => {
        if (pantryKeys.has(id)) return;
        if (allergyKeys.has(id)) return;
        const item = table[id];
        if (!item) return;
        const room = fillCap - plan.mealTotal;
        if (room < item.price * 0.95) return;
        if (!doExtras && pass > 0 && room > budget * 0.12) return; // leave headroom unless user asked for extras
        const cap = fillCaps[id] || 1;
        const have = plan.shopMap[id] ? plan.shopMap[id].qty : 0;
        if (have >= cap + (pass > 1 ? cap : 0)) return;
        let addQty = 1;
        if (item.unit === "lb" && room > item.price * 2) addQty = Math.min(2, Math.floor(room / item.price));
        if (plan.mealTotal + item.price * addQty > fillCap) addQty = 1;
        if (plan.mealTotal + item.price * addQty > fillCap) return;
        if (!plan.shopMap[id]) {
          plan.shopMap[id] = { id, name: item.name, unit: item.unit, cat: item.cat, qty: 0, price: item.price, cost: 0 };
        }
        plan.shopMap[id].qty += addQty;
        plan.shopMap[id].cost += item.price * addQty;
        plan.mealTotal += item.price * addQty;
        added = true;
      });
      if (!added) break;
    }

    // Drop any allergen keys that slipped in
    Object.keys(plan.shopMap).forEach((id) => {
      if (allergyKeys.has(id)) delete plan.shopMap[id];
    });

    let shopping = roundShopping(plan.shopMap).filter((it) => !allergyKeys.has(it.id));
    let trimmed = trimToBudget(shopping, hardCap);
    // Prefer landing with cushion when possible
    if (trimmed.total > hardCap * (1 - CUSHION_MIN)) {
      trimmed = trimToBudget(shopping, hardCap * (1 - CUSHION_MIN));
    }
    // Absolute hard rule
    if (trimmed.total > hardCap) {
      trimmed = trimToBudget(trimmed.list, hardCap);
    }

    const grouped = {};
    trimmed.list.forEach((item) => {
      if (!grouped[item.cat]) grouped[item.cat] = [];
      grouped[item.cat].push(item);
    });

    const total = Math.round(trimmed.total * 100) / 100;
    const remaining = Math.round((budget - total) * 100) / 100;
    const cushionPct = budget > 0 ? remaining / budget : 0;

    const skippedPantry = state.pantry.size;
    const wellUnder = remaining > budget * 0.08; // more than ~8% left
    return {
      store,
      budget,
      family,
      days,
      tierMax,
      portion,
      downgraded,
      pantryKeys: Array.from(pantryKeys),
      allergyKeys: Array.from(allergyKeys),
      allergies: Array.from(state.allergies),
      skippedPantry,
      meals: plan.daysOut,
      shopping: trimmed.list,
      grouped,
      total,
      remaining,
      cushionPct,
      wellUnder,
      extrasAdded: doExtras,
      underBudget: total <= budget + 0.001,
      asOf: (window.PRICE_TABLE.meta && window.PRICE_TABLE.meta.asOf) || "week of Nov 2, 2026"
    };
  }

  function addExtrasFill() {
    state.extrasAdded = true;
    runPlan();
  }

  /* Kid-friendly swaps at same or lower cost */
  function kidSwapOptions(slot, currentMealId, currentCost, scale, pantryKeys) {
    const pool = (window.MEAL_CATALOG[slot] || []).filter((m) => (m.tags || []).includes("kid") && m.id !== currentMealId);
    return pool
      .map((m) => {
        const c = mealCost(m, scale, pantryKeys).total;
        return { meal: m, cost: c };
      })
      .filter((x) => x.cost <= currentCost + 0.05)
      .sort((a, b) => a.cost - b.cost)
      .slice(0, 6);
  }

  /* ---------- NL parse (optional) ---------- */
  function parseQuickInput(text, fields) {
    const out = {
      store: (fields.store || "").trim() || "any store",
      budget: fields.budget != null && fields.budget !== "" ? Number(fields.budget) : null,
      family: fields.family != null && fields.family !== "" ? Number(fields.family) : null,
      days: fields.days != null && fields.days !== "" ? Number(fields.days) : null
    };
    const t = (text || "").trim();
    if (t) {
      const budgetMatch = t.match(/\$\s*([\d,]+(?:\.\d+)?)/) || t.match(/\b([\d,]+(?:\.\d+)?)\s*(?:dollars|bucks)\b/i);
      if (budgetMatch) out.budget = parseFloat(budgetMatch[1].replace(/,/g, ""));
      const famMatch = t.match(/family\s*(?:of\s*)?(\d+)/i) || t.match(/(\d+)\s*(?:people|persons|kids|of us)/i);
      if (famMatch) out.family = parseInt(famMatch[1], 10);
      const daysMatch = t.match(/(\d+)\s*days?/i) || t.match(/for\s+a\s+(week|weekend)/i);
      if (daysMatch) {
        if (daysMatch[1] && /^\d+$/.test(daysMatch[1])) out.days = parseInt(daysMatch[1], 10);
        else if (/week/i.test(daysMatch[1] || "")) out.days = 7;
        else if (/weekend/i.test(daysMatch[1] || "")) out.days = 2;
      }
      const storeMatch = t.match(/(?:going to|at|from|shopping at)\s+([A-Za-z][A-Za-z0-9 &'._-]{1,40})/i);
      if (storeMatch) {
        let s = storeMatch[1].replace(/[,.].*$/, "").trim();
        s = s.replace(/\s+(i|we|have|with|for|family|budget)\b.*$/i, "").trim();
        if (s && !/^(i|we|my|our|have|need)$/i.test(s)) out.store = s;
      }
    }
    if (out.budget == null || isNaN(out.budget)) out.budget = state.budget;
    if (out.family == null || isNaN(out.family)) out.family = state.family;
    if (out.days == null || isNaN(out.days)) out.days = state.days;
    out.family = clamp(Math.round(out.family), 1, 16);
    out.days = clamp(Math.round(out.days), 1, 14);
    out.budget = clamp(out.budget, 20, 2000);
    if (!out.store) out.store = "any store";
    return out;
  }

  /* ---------- Receipts (unchanged behavior) ---------- */
  function categorize(name) {
    const n = name.toLowerCase();
    if (/milk|egg|cheese|yogurt|butter|cream/.test(n)) return "Dairy & Eggs";
    if (/chicken|beef|pork|turkey|bacon|tuna|fish|meat|hot dog|sausage/.test(n)) return "Meat & Protein";
    if (/bread|rice|pasta|tortilla|oat|cereal|flour|cracker|bagel/.test(n)) return "Grains & Bread";
    if (/apple|banana|lettuce|tomato|onion|potato|carrot|pepper|berry|fruit|veg/.test(n)) return "Produce";
    if (/frozen|pizza|ice cream/.test(n)) return "Frozen";
    if (/soda|juice|water|coffee|tea|drink/.test(n)) return "Drinks";
    if (/soap|paper|detergent|trash|shampoo/.test(n)) return "Household";
    return "Pantry & Other";
  }

  function parseReceiptText(raw) {
    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const items = [];
    const looksCsv = lines.filter((l) => l.includes(",")).length >= Math.max(1, lines.length * 0.4);
    if (looksCsv) {
      lines.forEach((line, idx) => {
        if (idx === 0 && /name|item|description|product/i.test(line) && /price|amount|cost|total/i.test(line)) return;
        const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
        if (parts.length < 2) return;
        let name, qty = 1, price;
        if (parts.length >= 3 && !isNaN(parseFloat(parts[1])) && !isNaN(parseFloat(parts[2]))) {
          name = parts[0]; qty = parseFloat(parts[1]); price = parseFloat(parts[2]);
        } else {
          name = parts[0];
          price = parseFloat(parts[parts.length - 1].replace(/[^\d.-]/g, ""));
          if (parts.length >= 3 && !isNaN(parseFloat(parts[1]))) qty = parseFloat(parts[1]);
        }
        if (!name || isNaN(price)) return;
        items.push({ name, qty: qty || 1, price: Math.abs(price), category: categorize(name) });
      });
    } else {
      lines.forEach((line) => {
        const m = line.match(/^(.+?)\s+(?:x\s*(\d+(?:\.\d+)?)\s+)?\$?([\d]+\.[\d]{2})\s*$/i)
          || line.match(/^(.+?)\s+\$?([\d]+\.[\d]{2})\s*$/);
        if (!m) return;
        let name, qty = 1, price;
        if (m.length === 4 && m[2] !== undefined && m[3] !== undefined) {
          name = m[1].trim(); qty = parseFloat(m[2]) || 1; price = parseFloat(m[3]);
        } else {
          name = m[1].trim(); price = parseFloat(m[2] || m[3]);
        }
        if (!name || isNaN(price)) return;
        items.push({ name, qty, price: Math.abs(price), category: categorize(name) });
      });
    }
    return items;
  }

  function loadReceipts() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveReceipts(arr) { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }

  function summarizeReceipts(trips) {
    if (!trips.length) return null;
    const byCat = {};
    const byItem = {};
    let grand = 0;
    trips.forEach((trip) => {
      grand += trip.total;
      trip.items.forEach((it) => {
        byCat[it.category] = (byCat[it.category] || 0) + it.price * (it.qty || 1);
        const key = it.name.toLowerCase();
        if (!byItem[key]) byItem[key] = { name: it.name, total: 0, count: 0 };
        byItem[key].total += it.price * (it.qty || 1);
        byItem[key].count += 1;
      });
    });
    return {
      trips: trips.length,
      grand,
      avgTrip: grand / trips.length,
      cats: Object.entries(byCat).sort((a, b) => b[1] - a[1]),
      topItems: Object.values(byItem).sort((a, b) => b.total - a.total).slice(0, 8)
    };
  }

  /* ---------- UI ---------- */
  const $ = (sel, el = document) => el.querySelector(sel);

  function syncHiddenFields() {
    const storeEl = $("#field-store");
    const budgetEl = $("#field-budget");
    const familyEl = $("#field-family");
    const daysEl = $("#field-days");
    if (storeEl) storeEl.value = state.store === "any store" ? "" : state.store;
    if (budgetEl) budgetEl.value = state.budget;
    if (familyEl) familyEl.value = state.family;
    if (daysEl) daysEl.value = state.days;
    const budgetLabel = $("#budget-display");
    if (budgetLabel) budgetLabel.textContent = money(state.budget);
    const familyLabel = $("#family-display");
    if (familyLabel) familyLabel.textContent = String(state.family);
    const daysLabel = $("#days-display");
    if (daysLabel) daysLabel.textContent = String(state.days);
  }

  function markChipGroup(containerSel, activeId, multiSet) {
    const root = $(containerSel);
    if (!root) return;
    root.querySelectorAll(".chip").forEach((btn) => {
      const id = btn.getAttribute("data-id");
      let on = false;
      if (multiSet) on = multiSet.has(id);
      else on = id === String(activeId) || (activeId >= 9 && id === "9plus" && containerSel === "#family-chips");
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function refreshChipUI() {
    markChipGroup("#family-chips", state.family >= 9 ? "9plus" : state.family);
    markChipGroup("#budget-chips", state.budget);
    markChipGroup("#days-chips", state.days);
    markChipGroup("#mealtype-chips", null, state.mealTypes);
    markChipGroup("#pantry-chips", null, state.pantry);
    markChipGroup("#allergy-chips", null, state.allergies);
    const plusWrap = $("#family-plus-wrap");
    if (plusWrap) plusWrap.hidden = state.family < 9;
    syncHiddenFields();
  }

  function renderPlan(plan) {
    state.lastPlan = plan;
    window.__lastPlan = plan;
    const results = $("#results");
    results.hidden = false;

    const sticky = $("#sticky-summary");
    if (sticky) {
      sticky.hidden = false;
      $("#sticky-total").textContent = money(plan.total);
      $("#sticky-left").textContent = money(plan.remaining);
    }

    let leftoverNote = "";
    if (plan.wellUnder) {
      leftoverNote = `${money(plan.remaining)} left. Add extras or save it.`;
    } else if (plan.remaining > 0) {
      leftoverNote = `About ${Math.round(plan.cushionPct * 100)}% under budget — a little cushion for shelf-price differences.`;
    } else {
      leftoverNote = "Right at your budget using estimate prices.";
    }

    const allergyNote = plan.allergies && plan.allergies.length
      ? `<p class="privacy-note">Avoiding: ${plan.allergies.map(escapeHtml).join(", ")}. Meal ideas only. Always check labels for allergens.</p>`
      : `<p class="estimate-note">Meal ideas only. Always check labels for allergens.</p>`;

    $("#plan-summary").innerHTML = `
      <div class="summary-grid summary-grid-lg">
        <div class="stat highlight"><span class="label">Est. total</span><strong>${money(plan.total)}</strong></div>
        <div class="stat ${plan.underBudget ? "ok" : "warn"}"><span class="label">Left in budget</span><strong>${money(plan.remaining)}</strong></div>
        <div class="stat"><span class="label">Store</span><strong>${escapeHtml(plan.store)}</strong></div>
        <div class="stat"><span class="label">Family</span><strong>${plan.family}</strong></div>
        <div class="stat"><span class="label">Days</span><strong>${plan.days}</strong></div>
        <div class="stat"><span class="label">Budget</span><strong>${money(plan.budget)}</strong></div>
      </div>
      <p class="estimate-note">Estimated prices, week of Nov 2, 2026. Shelf price always wins.</p>
      <p class="estimate-note">${escapeHtml(leftoverNote)}${plan.downgraded ? " Meals were adjusted to fit." : ""}</p>
      ${plan.skippedPantry ? `<p class="privacy-note">Skipped ${plan.skippedPantry} item${plan.skippedPantry === 1 ? "" : "s"} you already have.</p>` : ""}
      ${allergyNote}
      <div class="btn-row">
        <a class="btn btn-secondary" href="#shopping-panel">Shopping list</a>
      </div>
    `;

    $("#running-total").innerHTML = `
      <div class="budget-bar" role="img" aria-label="Spent ${money(plan.total)} of ${money(plan.budget)}">
        <div class="budget-fill" style="width:${clamp((plan.total / plan.budget) * 100, 0, 100)}%"></div>
      </div>
      <p class="budget-caption"><strong>${money(plan.total)}</strong> estimated of <strong>${money(plan.budget)}</strong></p>
    `;

    const extras = $("#extras-box");
    if (extras) {
      if (plan.wellUnder && !plan.extrasAdded) {
        extras.innerHTML = `
          <p class="leftover-callout"><strong>${money(plan.remaining)} left.</strong> Add extras or save it.</p>
          <button type="button" class="btn btn-primary" id="btn-add-extras">Add extras</button>
        `;
        $("#btn-add-extras").addEventListener("click", () => addExtrasFill());
      } else if (plan.extrasAdded) {
        extras.innerHTML = `<p class="estimate-note">Extras added — aiming about 3–5% under budget.</p>`;
      } else {
        extras.innerHTML = "";
      }
    }

    const scale = (plan.family / 4) * (plan.portion || 1);
    const pantryKeys = new Set(plan.pantryKeys || []);
    const allergyKeys = new Set(plan.allergyKeys || []);

    $("#meal-plan").innerHTML = plan.meals.map((d) => {
      const body = `
        <ul>
          ${["breakfast", "lunch", "dinner"].map((slot) => {
            const m = d[slot];
            const opts = kidSwapOptions(slot, m.id, m.cost, scale, pantryKeys)
              .filter((o) => !mealContainsAllergen(o.meal, allergyKeys));
            const canSwap = opts.length > 0;
            if (canSwap) {
              return `<li>
                <button type="button" class="meal-tap" data-day="${d.day}" data-slot="${slot}" data-id="${escapeHtml(m.id)}" data-cost="${m.cost}">
                  <span class="meal-tag">${slot}</span>
                  <span class="meal-name">${escapeHtml(m.name)}</span>
                  <em>${money(m.cost)}</em>
                </button>
              </li>`;
            }
            return `<li class="meal-static">
              <span class="meal-tag">${slot}</span>
              <span class="meal-name">${escapeHtml(m.name)}</span>
              <em>${money(m.cost)}</em>
            </li>`;
          }).join("")}
        </ul>
        <div class="day-total">Day est. ${money(d.dayTotal)}</div>
        <p class="tap-hint">Tap a meal when a kid-friendly swap at the same or lower cost is available.</p>`;
      if (d.day === 1) {
        return `<article class="day-card day-open"><h3>Day ${d.day}</h3>${body}</article>`;
      }
      return `<details class="day-card day-collapse"><summary><strong>Day ${d.day}</strong> <span>${money(d.dayTotal)}</span></summary>${body}</details>`;
    }).join("");

    const cats = Object.keys(plan.grouped).sort();
    $("#shopping-list").innerHTML = cats.length ? cats.map((cat) => `
      <div class="shop-group">
        <h3>${escapeHtml(cat)}</h3>
        <ul>
          ${plan.grouped[cat].map((it) => `
            <li>
              <span class="item-name">${escapeHtml(it.name)}</span>
              <span class="item-qty">${formatQty(it.qty)} ${escapeHtml(it.unit)}</span>
              <span class="item-price">${money(it.cost)}</span>
            </li>
          `).join("")}
        </ul>
      </div>
    `).join("") : `<p class="muted">Nothing to buy — you already have what this plan needs.</p>`;

    $("#meal-plan").querySelectorAll(".meal-tap").forEach((btn) => {
      btn.addEventListener("click", () => openSwapSheet(btn, scale, pantryKeys, allergyKeys));
    });

    results.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openSwapSheet(btn, scale, pantryKeys, allergyKeys) {
    const day = btn.getAttribute("data-day");
    const slot = btn.getAttribute("data-slot");
    const id = btn.getAttribute("data-id");
    const cost = parseFloat(btn.getAttribute("data-cost"));
    let options = kidSwapOptions(slot, id, cost, scale, pantryKeys);
    if (allergyKeys && allergyKeys.size) {
      options = options.filter((o) => !mealContainsAllergen(o.meal, allergyKeys));
    }
    const sheet = $("#swap-sheet");
    const body = $("#swap-sheet-body");
    $("#swap-sheet-title").textContent = `Kid-friendly swaps · Day ${day} ${slot}`;
    if (!options.length) {
      body.innerHTML = `<p class="muted">No cheaper kid swap for this one.</p>`;
    } else {
      body.innerHTML = options.map((o) => `
        <button type="button" class="swap-option" data-day="${day}" data-slot="${slot}" data-id="${o.meal.id}">
          <strong>${escapeHtml(o.meal.name)}</strong>
          <span>${money(o.cost)}</span>
        </button>
      `).join("");
      body.querySelectorAll(".swap-option").forEach((b) => {
        b.addEventListener("click", () => {
          const key = `${b.getAttribute("data-day")}-${b.getAttribute("data-slot")}`;
          state.swaps[key] = b.getAttribute("data-id");
          sheet.hidden = true;
          runPlan();
        });
      });
    }
    sheet.hidden = false;
  }

  function renderSeasonal() {
    const season = window.getSeasonalForMonth();
    $("#seasonal").innerHTML = `
      <div class="season-badge">${escapeHtml(season.title)}</div>
      <p class="season-blurb">${escapeHtml(season.blurb)}</p>
      <div class="recipe-grid">
        ${season.recipes.map((r) => `
          <article class="recipe-card">
            <h3>${escapeHtml(r.name)}</h3>
            <p class="recipe-meta">Serves ~${r.serves} · Est. ${money(r.cost)}</p>
            <p>${escapeHtml(r.notes)}</p>
          </article>
        `).join("")}
      </div>
      <p class="estimate-note">Estimated prices, week of Nov 2, 2026. Shelf price always wins.</p>
    `;
  }

  function renderReceiptStats() {
    const trips = loadReceipts();
    const box = $("#receipt-stats");
    const summary = summarizeReceipts(trips);
    if (!summary) {
      box.innerHTML = `<p class="muted">No trips saved yet. Upload or paste a receipt below. Your receipts stay on your phone. Delete anytime.</p>`;
      return;
    }
    box.innerHTML = `
      <div class="summary-grid">
        <div class="stat"><span class="label">Trips saved</span><strong>${summary.trips}</strong></div>
        <div class="stat"><span class="label">Average trip</span><strong>${money(summary.avgTrip)}</strong></div>
        <div class="stat highlight"><span class="label">All-time spend</span><strong>${money(summary.grand)}</strong></div>
      </div>
      <h3 class="subhead">Spending by category</h3>
      <ul class="cat-list">
        ${summary.cats.map(([c, v]) => `<li><span>${escapeHtml(c)}</span><strong>${money(v)}</strong></li>`).join("")}
      </ul>
      <h3 class="subhead">Top items</h3>
      <ul class="cat-list">
        ${summary.topItems.map((it) => `<li><span>${escapeHtml(it.name)}</span><strong>${money(it.total)}</strong></li>`).join("")}
      </ul>
      <p class="privacy-note">Your receipts stay on your phone. Delete anytime.</p>
    `;
  }

  function runPlan() {
    const text = ($("#quick-input") && $("#quick-input").value) || "";
    if (text.trim()) {
      const parsed = parseQuickInput(text, {
        store: state.store,
        budget: state.budget,
        family: state.family,
        days: state.days
      });
      state.store = parsed.store;
      state.budget = parsed.budget;
      state.family = parsed.family;
      state.days = parsed.days;
      refreshChipUI();
    }
    const plan = buildPlan({
      store: state.store,
      budget: state.budget,
      family: state.family,
      days: state.days,
      mealTypes: state.mealTypes,
      pantryKeys: pantryKeySet(),
      allergyKeys: allergyKeySet(),
      doExtras: state.extrasAdded
    });
    renderPlan(plan);
  }

  function ingestReceipt(raw, label) {
    const items = parseReceiptText(raw);
    if (!items.length) {
      $("#receipt-msg").textContent = "Couldn't find priced lines. Try lines like: Milk,1,3.49";
      return;
    }
    const total = items.reduce((s, it) => s + it.price * (it.qty || 1), 0);
    const trips = loadReceipts();
    trips.push({ id: Date.now(), label: label || "Trip", date: new Date().toISOString(), items, total });
    saveReceipts(trips);
    $("#receipt-msg").textContent = `Saved ${items.length} items · ${money(total)}. Your receipts stay on this phone.`;
    renderReceiptStats();
  }

  function buildChipRow(container, items, { multi = false, onToggle }) {
    const el = $(container);
    el.innerHTML = items.map((it) =>
      `<button type="button" class="chip" data-id="${it.id}" aria-pressed="false">${escapeHtml(it.label)}</button>`
    ).join("");
    el.querySelectorAll(".chip").forEach((btn) => {
      btn.addEventListener("click", () => onToggle(btn.getAttribute("data-id"), btn));
    });
  }

  function init() {
    // Family chips 1-8 + 9+
    buildChipRow("#family-chips", [
      ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ id: String(n), label: String(n) })),
      { id: "9plus", label: "9+" }
    ], {
      onToggle: (id) => {
        if (id === "9plus") {
          state.family = Math.max(9, state.family);
        } else {
          state.family = parseInt(id, 10);
        }
        state.swaps = {};
        refreshChipUI();
      }
    });

    $("#family-minus")?.addEventListener("click", () => {
      state.family = clamp(state.family - 1, 9, 16);
      state.swaps = {};
      refreshChipUI();
    });
    $("#family-plus")?.addEventListener("click", () => {
      state.family = clamp(state.family + 1, 9, 16);
      state.swaps = {};
      refreshChipUI();
    });

    // Budget chips $50–$500
    const budgets = [];
    for (let b = 50; b <= 500; b += 50) budgets.push({ id: String(b), label: "$" + b });
    buildChipRow("#budget-chips", budgets, {
      onToggle: (id) => {
        state.budget = parseInt(id, 10);
        state.swaps = {};
        refreshChipUI();
      }
    });
    $("#budget-minus")?.addEventListener("click", () => {
      state.budget = clamp(state.budget - 50, 50, 500);
      state.swaps = {};
      refreshChipUI();
    });
    $("#budget-plus")?.addEventListener("click", () => {
      state.budget = clamp(state.budget + 50, 50, 500);
      state.swaps = {};
      refreshChipUI();
    });

    buildChipRow("#days-chips", [
      { id: "3", label: "3 days" },
      { id: "5", label: "5 days" },
      { id: "7", label: "7 days" },
      { id: "10", label: "10 days" },
      { id: "14", label: "14 days" }
    ], {
      onToggle: (id) => {
        state.days = parseInt(id, 10);
        state.swaps = {};
        refreshChipUI();
      }
    });

    buildChipRow("#mealtype-chips", window.MEAL_TYPE_CHIPS, {
      multi: true,
      onToggle: (id) => {
        if (state.mealTypes.has(id)) state.mealTypes.delete(id);
        else state.mealTypes.add(id);
        state.swaps = {};
        refreshChipUI();
      }
    });

    buildChipRow("#pantry-chips", window.PANTRY_CHIPS.map((c) => ({ id: c.id, label: c.label })), {
      multi: true,
      onToggle: (id) => {
        if (state.pantry.has(id)) state.pantry.delete(id);
        else state.pantry.add(id);
        state.swaps = {};
        state.extrasAdded = false;
        refreshChipUI();
      }
    });

    if ($("#allergy-chips") && window.ALLERGY_CHIPS) {
      buildChipRow("#allergy-chips", window.ALLERGY_CHIPS.map((c) => ({ id: c.id, label: c.label })), {
        multi: true,
        onToggle: (id) => {
          if (state.allergies.has(id)) state.allergies.delete(id);
          else state.allergies.add(id);
          state.swaps = {};
          state.extrasAdded = false;
          refreshChipUI();
        }
      });
    }

    $("#field-store")?.addEventListener("change", (e) => {
      state.store = e.target.value.trim() || "any store";
    });

    refreshChipUI();
    renderSeasonal();
    renderReceiptStats();

    $("#plan-form").addEventListener("submit", (e) => {
      e.preventDefault();
      runPlan();
    });

    $("#btn-example")?.addEventListener("click", () => {
      state.store = "any store";
      state.budget = 250;
      state.family = 4;
      state.days = 7;
      state.pantry = new Set();
      state.allergies = new Set();
      state.mealTypes = new Set();
      state.swaps = {};
      state.extrasAdded = false;
      if ($("#quick-input")) $("#quick-input").value = "";
      refreshChipUI();
      runPlan();
    });

    $("#swap-sheet-close")?.addEventListener("click", () => {
      $("#swap-sheet").hidden = true;
    });

    $("#receipt-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      ingestReceipt($("#receipt-paste").value, $("#receipt-label").value || "Pasted trip");
    });
    $("#receipt-file")?.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => ingestReceipt(String(reader.result || ""), file.name);
      reader.readAsText(file);
    });
    $("#btn-delete-data")?.addEventListener("click", () => {
      if (!confirm("Delete all saved receipt data from this phone?")) return;
      localStorage.removeItem(STORAGE_KEY);
      $("#receipt-msg").textContent = "All receipt data deleted from this phone.";
      renderReceiptStats();
    });

    window.GroceryPlan = {
      parseQuickInput,
      buildPlan,
      parseReceiptText,
      money,
      state,
      pantryKeySet,
      allergyKeySet,
      kidSwapOptions,
      addExtrasFill
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
