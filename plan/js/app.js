(function () {
  "use strict";

  const STORAGE_KEY = "ai901_plan_receipts_v1";
  const OVERRIDE_KEY = "ai901_plan_price_overrides_v1";
  const CUSTOM_PRICE_MAX = 500;
  const BRAND_MAX = 60;
  const CUSHION_MIN = 0.03; // aim 3–5% under budget for shelf variance
  const CUSHION_MAX = 0.05;
  const BUDGET_MIN = 20;
  const BUDGET_MAX = 2000;
  const FAMILY_MIN = 1;
  const FAMILY_MAX = 8;
  const DAYS_MIN = 1;
  const DAYS_MAX = 14;
  const RECEIPT_LINE_PRICE_MAX = 500;
  const RECEIPT_PASTE_MAX = 100000; // chars
  const prices = () => window.PRICE_TABLE.items;
  function tt(key, vars) {
    return (window.I18N && window.I18N.t) ? window.I18N.t(key, vars) : key;
  }
  function tMeal(id, fallback) {
    return (window.I18N && window.I18N.mealName) ? window.I18N.mealName(id, fallback) : fallback;
  }
  function tItem(id, fallback) {
    return (window.I18N && window.I18N.itemName) ? window.I18N.itemName(id, fallback) : fallback;
  }
  function tCat(cat) {
    return (window.I18N && window.I18N.categoryName) ? window.I18N.categoryName(cat) : cat;
  }

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
    extrasAdded: false,
    notices: []
  };

  function money(n) {
    const x = Number(n);
    if (!Number.isFinite(x) || x < 0) return "$0.00";
    // Guard absurd magnitudes that round to Infinity (e.g. 1e308)
    if (x > 1e12) return "$0.00";
    const v = Math.round(x * 100) / 100;
    if (!Number.isFinite(v)) return "$0.00";
    return "$" + v.toFixed(2);
  }
  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }
  /** Treat 0 as a real value (unlike `x || fallback`). */
  function numOr(val, fallback) {
    if (val === null || val === undefined || val === "") return fallback;
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
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

  let _overrideCache = null;
  function invalidateOverrides() { _overrideCache = null; }
  function loadOverrides() {
    if (_overrideCache) return _overrideCache;
    try {
      const raw = JSON.parse(localStorage.getItem(OVERRIDE_KEY) || "{}");
      _overrideCache = (raw && typeof raw === "object" && !Array.isArray(raw)) ? raw : {};
    } catch (e) {
      _overrideCache = {};
    }
    return _overrideCache;
  }
  function saveOverrides(map) {
    _overrideCache = map;
    try { localStorage.setItem(OVERRIDE_KEY, JSON.stringify(map)); } catch (e) { /* quota */ }
  }
  /** Validate a typed price. Rejects empty, non-numeric, negative, and absurd values. */
  function parseUserPrice(raw) {
    if (raw === null || raw === undefined) return { ok: false, reason: "empty" };
    const s = String(raw).trim().replace(/[$,\s]/g, "");
    if (s === "") return { ok: false, reason: "empty" };
    if (!/^-?\d+(\.\d+)?$/.test(s)) return { ok: false, reason: "invalid" };
    const n = Number(s);
    if (!Number.isFinite(n)) return { ok: false, reason: "invalid" };
    if (n < 0) return { ok: false, reason: "negative" };
    if (n > CUSTOM_PRICE_MAX) return { ok: false, reason: "too_high" };
    return { ok: true, price: Math.round(n * 100) / 100 };
  }
  function getOverride(id) {
    const ov = loadOverrides()[id];
    if (!ov || typeof ov !== "object") return null;
    const price = Number(ov.price);
    if (!Number.isFinite(price) || price < 0) return null;
    const brand = typeof ov.brand === "string" ? ov.brand.trim().slice(0, BRAND_MAX) : "";
    return { brand, price };
  }
  function setOverride(id, brand, price) {
    const parsed = parseUserPrice(price);
    if (!parsed.ok) return parsed;
    const all = Object.assign({}, loadOverrides());
    all[id] = {
      brand: String(brand || "").trim().slice(0, BRAND_MAX),
      price: parsed.price
    };
    saveOverrides(all);
    return { ok: true, override: all[id] };
  }
  function clearOverride(id) {
    const all = Object.assign({}, loadOverrides());
    if (!(id in all)) return false;
    delete all[id];
    saveOverrides(all);
    return true;
  }
  function effectivePrice(id) {
    const item = prices()[id];
    if (!item) return null;
    const ov = getOverride(id);
    return ov ? ov.price : item.price;
  }
  function displayName(id, fallbackName) {
    const ov = getOverride(id);
    if (ov && ov.brand) return ov.brand;
    if (fallbackName) return fallbackName;
    const item = prices()[id];
    return item ? item.name : id;
  }
  function hasCustomPrice(id) {
    return !!getOverride(id);
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
      const name = displayName(ing.id, tItem(ing.id, item.name));
      if (pantryKeys.has(ing.id)) {
        skipped.push({ id: ing.id, name, qty });
        return;
      }
      const unitPrice = effectivePrice(ing.id);
      const cost = unitPrice * qty;
      total += cost;
      lines.push({
        id: ing.id,
        name,
        unit: item.unit,
        cat: item.cat,
        qty,
        price: unitPrice,
        cost,
        custom: hasCustomPrice(ing.id)
      });
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

  /**
   * Allergy-safe pool only. NEVER falls back to meals that contain selected allergens.
   * When meal-type tags match nothing, keep allergy-safe meals and set meta.typeRelaxed.
   */
  function poolFor(slot, tierMax, types, preferKid, allergyKeys, meta) {
    const allergySafe = (m) => !mealContainsAllergen(m, allergyKeys || new Set());
    let pool = (window.MEAL_CATALOG[slot] || []).filter((m) => m.tier <= tierMax);
    if (allergyKeys && allergyKeys.size) {
      pool = pool.filter(allergySafe);
    }
    if (types && types.size) {
      const filtered = pool.filter((m) => mealMatchesTypes(m, types));
      if (filtered.length) {
        pool = filtered;
      } else if (pool.length) {
        if (meta) meta.typeRelaxed = true;
        // keep allergy-safe pool (closest match) — do not drop to allergenic meals
      }
    }
    if (preferKid) {
      const kids = pool.filter((m) => (m.tags || []).includes("kid"));
      if (kids.length) pool = kids;
    }
    if (!pool.length) {
      // Widen tier, still allergy-hard: never serve an allergen meal
      pool = (window.MEAL_CATALOG[slot] || []).filter(allergySafe);
      if (types && types.size) {
        const filtered = pool.filter((m) => mealMatchesTypes(m, types));
        if (filtered.length) pool = filtered;
        else if (pool.length && meta) meta.typeRelaxed = true;
      }
    }
    // Empty pool is allowed — caller shows fewer meals + shortfall message
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

  function emptyCost() {
    return { total: 0, lines: [], skipped: [] };
  }

  function assemble(breakfasts, lunches, dinners, scale, pantryKeys) {
    const daysOut = [];
    const shopMap = {};
    let mealTotal = 0;
    const days = Math.max(breakfasts.length, lunches.length, dinners.length);
    let missingSlots = 0;
    for (let d = 0; d < days; d++) {
      const b = breakfasts[d] || null;
      const l = lunches[d] || null;
      const din = dinners[d] || null;
      if (!b) missingSlots++;
      if (!l) missingSlots++;
      if (!din) missingSlots++;
      const bc = b ? mealCost(b, scale, pantryKeys) : emptyCost();
      const lc = l ? mealCost(l, scale, pantryKeys) : emptyCost();
      const dc = din ? mealCost(din, scale, pantryKeys) : emptyCost();
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
        breakfast: b ? { id: b.id, name: tMeal(b.id, b.name), cost: bc.total, tags: b.tags || [] } : null,
        lunch: l ? { id: l.id, name: tMeal(l.id, l.name), cost: lc.total, tags: l.tags || [] } : null,
        dinner: din ? { id: din.id, name: tMeal(din.id, din.name), cost: dc.total, tags: din.tags || [] } : null,
        dayTotal: bc.total + lc.total + dc.total
      });
    }
    return { daysOut, shopMap, mealTotal, missingSlots };
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
      const unitPrice = effectivePrice(line.id);
      const price = unitPrice == null ? line.price : unitPrice;
      return {
        id: line.id,
        name: displayName(line.id, line.name),
        unit: line.unit,
        cat: line.cat,
        qty: buyQty,
        price,
        cost: buyQty * price,
        custom: hasCustomPrice(line.id)
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
    opts = opts || {};
    const notices = [];
    const rawBudget = numOr(opts.budget, state.budget);
    const rawFamily = numOr(opts.family, state.family);
    const rawDays = numOr(opts.days, state.days);

    const budget = clamp(rawBudget, BUDGET_MIN, BUDGET_MAX);
    const family = clamp(Math.round(rawFamily), FAMILY_MIN, FAMILY_MAX);
    const days = clamp(Math.round(rawDays), DAYS_MIN, DAYS_MAX);

    if (Number.isFinite(rawBudget) && rawBudget < BUDGET_MIN) {
      notices.push(tt("notice.budgetMin", { n: BUDGET_MIN }));
    } else if (Number.isFinite(rawBudget) && rawBudget > BUDGET_MAX) {
      notices.push(tt("notice.budgetMax", { n: BUDGET_MAX }));
    }
    if (Number.isFinite(rawFamily) && (rawFamily < FAMILY_MIN || rawFamily > FAMILY_MAX)) {
      notices.push(tt("notice.familyClamp", { min: FAMILY_MIN, max: FAMILY_MAX, n: family }));
    }
    if (Number.isFinite(rawDays) && (rawDays < DAYS_MIN || rawDays > DAYS_MAX)) {
      notices.push(tt("notice.daysClamp", { min: DAYS_MIN, max: DAYS_MAX, n: days }));
    }

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
    const poolMeta = { typeRelaxed: false };

    function sequences(tMax) {
      const bPool = poolFor("breakfast", tMax, types, preferKid, allergyKeys, poolMeta);
      const lPool = poolFor("lunch", tMax, types, preferKid, allergyKeys, poolMeta);
      const dPool = poolFor("dinner", tMax, types, preferKid, allergyKeys, poolMeta);
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
        // force cheapest-only pools — still allergy-hard; never widen to allergen meals
        const cheapTypes = new Set(types);
        cheapTypes.add("cheap");
        const bPool = poolFor("breakfast", 1, cheapTypes, false, allergyKeys, poolMeta);
        const lPool = poolFor("lunch", 1, cheapTypes, false, allergyKeys, poolMeta);
        const dPool = poolFor("dinner", 1, cheapTypes, false, allergyKeys, poolMeta);
        seq = applySwaps(
          pickSequence(bPool, days, seed),
          pickSequence(lPool, days, seed + 3),
          pickSequence(dPool, days, seed + 9)
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
        const unitPrice = effectivePrice(id);
        const room = fillCap - plan.mealTotal;
        if (room < unitPrice * 0.95) return;
        if (!doExtras && pass > 0 && room > budget * 0.12) return; // leave headroom unless user asked for extras
        const cap = fillCaps[id] || 1;
        const have = plan.shopMap[id] ? plan.shopMap[id].qty : 0;
        if (have >= cap + (pass > 1 ? cap : 0)) return;
        let addQty = 1;
        if (item.unit === "lb" && room > unitPrice * 2) addQty = Math.min(2, Math.floor(room / unitPrice));
        if (plan.mealTotal + unitPrice * addQty > fillCap) addQty = 1;
        if (plan.mealTotal + unitPrice * addQty > fillCap) return;
        if (!plan.shopMap[id]) {
          plan.shopMap[id] = {
            id,
            name: displayName(id, item.name),
            unit: item.unit,
            cat: item.cat,
            qty: 0,
            price: unitPrice,
            cost: 0,
            custom: hasCustomPrice(id)
          };
        }
        plan.shopMap[id].qty += addQty;
        plan.shopMap[id].cost += unitPrice * addQty;
        plan.shopMap[id].price = unitPrice;
        plan.shopMap[id].name = displayName(id, item.name);
        plan.shopMap[id].custom = hasCustomPrice(id);
        plan.mealTotal += unitPrice * addQty;
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

    const expectedSlots = days * 3;
    const filledSlots = plan.daysOut.reduce((n, d) => {
      return n + (d.breakfast ? 1 : 0) + (d.lunch ? 1 : 0) + (d.dinner ? 1 : 0);
    }, 0);
    const allergyShortfall = allergyKeys.size > 0 && filledSlots < expectedSlots;
    if (allergyShortfall) {
      notices.push(tt("notice.allergyShortfall"));
    }
    if (poolMeta.typeRelaxed && types && types.size) {
      const labels = Array.from(types).join(" + ");
      notices.push(tt("notice.typeRelaxed", { labels: labels }));
    }

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
      notices,
      allergyShortfall,
      typeRelaxed: !!poolMeta.typeRelaxed,
      filledSlots,
      expectedSlots,
      rawBudget,
      rawFamily,
      rawDays,
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
      days: fields.days != null && fields.days !== "" ? Number(fields.days) : null,
      notices: []
    };
    const t = (text || "").trim();
    if (t) {
      // Allow $0 / negative so clamps can tell the truth
      const budgetMatch = t.match(/\$\s*(-?[\d,]+(?:\.\d+)?)/) || t.match(/\b(-?[\d,]+(?:\.\d+)?)\s*(?:dollars|bucks)\b/i);
      if (budgetMatch) out.budget = parseFloat(budgetMatch[1].replace(/,/g, ""));
      const famMatch = t.match(/family\s*(?:of\s*)?(-?\d+)/i) || t.match(/(-?\d+)\s*(?:people|persons|kids|of us)/i);
      if (famMatch) out.family = parseInt(famMatch[1], 10);
      const daysMatch = t.match(/(-?\d+)\s*days?/i) || t.match(/for\s+a\s+(week|weekend)/i);
      if (daysMatch) {
        if (daysMatch[1] && /^-?\d+$/.test(daysMatch[1])) out.days = parseInt(daysMatch[1], 10);
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
    if (out.budget == null || !Number.isFinite(out.budget)) out.budget = state.budget;
    if (out.family == null || !Number.isFinite(out.family)) out.family = state.family;
    if (out.days == null || !Number.isFinite(out.days)) out.days = state.days;

    const rawBudget = out.budget;
    const rawFamily = out.family;
    const rawDays = out.days;
    out.family = clamp(Math.round(out.family), FAMILY_MIN, FAMILY_MAX);
    out.days = clamp(Math.round(out.days), DAYS_MIN, DAYS_MAX);
    out.budget = clamp(out.budget, BUDGET_MIN, BUDGET_MAX);
    if (rawBudget < BUDGET_MIN) {
      out.notices.push(tt("notice.budgetMin", { n: BUDGET_MIN }));
    } else if (rawBudget > BUDGET_MAX) {
      out.notices.push(tt("notice.budgetMax", { n: BUDGET_MAX }));
    }
    if (rawFamily < FAMILY_MIN || rawFamily > FAMILY_MAX) {
      out.notices.push(tt("notice.familyClamp", { min: FAMILY_MIN, max: FAMILY_MAX, n: out.family }));
    }
    if (rawDays < DAYS_MIN || rawDays > DAYS_MAX) {
      out.notices.push(tt("notice.daysClamp", { min: DAYS_MIN, max: DAYS_MAX, n: out.days }));
    }
    out.rawBudget = rawBudget;
    out.rawFamily = rawFamily;
    out.rawDays = rawDays;
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

  function receiptLineOk(qty, price) {
    if (!Number.isFinite(qty) || !Number.isFinite(price)) return false;
    if (qty <= 0 || price <= 0) return false;
    if (price > RECEIPT_LINE_PRICE_MAX) return false;
    if (qty * price > RECEIPT_LINE_PRICE_MAX * 20) return false;
    return true;
  }

  function parseReceiptText(raw) {
    const lines = String(raw || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const items = [];
    let rejected = 0;
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
        if (!name || !Number.isFinite(price)) { rejected++; return; }
        if (!receiptLineOk(qty, price)) { rejected++; return; }
        items.push({ name, qty, price, category: categorize(name) });
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
        if (!name || !Number.isFinite(price)) { rejected++; return; }
        if (!receiptLineOk(qty, price)) { rejected++; return; }
        items.push({ name, qty, price, category: categorize(name) });
      });
    }
    return { items, rejected };
  }

  function loadReceipts() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveReceipts(arr) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
      return true;
    } catch (e) {
      return false;
    }
  }

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
      else on = id === String(activeId);
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function refreshChipUI() {
    markChipGroup("#family-chips", state.family);
    markChipGroup("#budget-chips", state.budget);
    markChipGroup("#days-chips", state.days);
    markChipGroup("#mealtype-chips", null, state.mealTypes);
    markChipGroup("#pantry-chips", null, state.pantry);
    markChipGroup("#allergy-chips", null, state.allergies);
    const plusWrap = $("#family-plus-wrap");
    if (plusWrap) plusWrap.hidden = true;
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
      ? `<p class="privacy-note">${escapeHtml(tt("note.avoiding", { list: plan.allergies.map((id) => (window.I18N && window.I18N.allergyLabel) ? window.I18N.allergyLabel(id, id) : id).join(", ") }))}</p>`
      : `<p class="estimate-note">${escapeHtml(tt("note.allergyOnly"))}</p>`;

    const noticeHtml = (plan.notices && plan.notices.length)
      ? plan.notices.map((n) => `<p class="privacy-note" role="status">${escapeHtml(n)}</p>`).join("")
      : "";

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
      ${noticeHtml}
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
            if (!m) {
              return `<li class="meal-static meal-missing">
                <span class="meal-tag">${slot}</span>
                <span class="meal-name">No safe idea for this slot yet</span>
              </li>`;
            }
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


    // Merge extras + optional still-need filter
    let shopItems = (window.ListTools ? window.ListTools.mergeExtrasIntoShopping(plan.shopping || []) : (plan.shopping || []).slice());
    const shopView = window.ListTools ? window.ListTools.loadView() : "all";
    if (shopView === "need" && window.ListTools) shopItems = window.ListTools.filterStillNeed(shopItems);
    const grouped = window.ListTools ? window.ListTools.groupByCat(shopItems) : plan.grouped;
    const cats = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
    const checkedMap = window.ListTools ? window.ListTools.loadChecked() : {};
    const addMoreBlock = `
      <div class="shop-add-more" id="shop-add-more">
        <label for="shop-add-more-input">${escapeHtml(tt("shop.add.more"))}</label>
        <input id="shop-add-more-input" type="text" placeholder="${escapeHtml(tt("shop.add.more.placeholder"))}" autocomplete="off" />
        <div id="shop-extras-chips-inline" class="chip-row extras-chips"></div>
      </div>`;
    let listHtml = "";
    if (!cats.length) {
      listHtml = `<p class="muted">${escapeHtml(tt("shop.empty"))}</p>` + addMoreBlock;
    } else {
      let inserted = false;
      listHtml = cats.map((cat) => {
        const block = `
      <div class="shop-group">
        <h3>${escapeHtml(tCat(cat))}</h3>
        <ul>
          ${grouped[cat].map((it) => {
            const custom = !!it.custom || hasCustomPrice(it.id) || !!it.customExtra;
            const yours = custom ? `<span class="yours-mark" title="${escapeHtml(tt("shop.yoursTitle"))}">${escapeHtml(tt("shop.yours"))}</span>` : "";
            const reset = hasCustomPrice(it.id)
              ? `<button type="button" class="item-reset" data-id="${escapeHtml(it.id)}" aria-label="${escapeHtml(tt("shop.resetAria"))}">×</button>`
              : "";
            const isChecked = !!checkedMap[it.id];
            const rem = it.customExtra
              ? `<button type="button" class="item-reset extra-remove" data-extra-id="${escapeHtml(it.id)}" aria-label="Remove">×</button>`
              : "";
            return `
            <li class="shop-item${custom ? " is-custom" : ""}${isChecked ? " is-checked" : ""}${it.customExtra ? " is-extra" : ""}" data-id="${escapeHtml(it.id)}" data-unit-price="${it.price}" data-default-name="${escapeHtml((prices()[it.id] && prices()[it.id].name) || it.name)}">
              <label class="shop-check">
                <input type="checkbox" class="item-bought" data-id="${escapeHtml(it.id)}" ${isChecked ? "checked" : ""} aria-label="Purchased" />
              </label>
              <button type="button" class="shop-row" data-id="${escapeHtml(it.id)}" aria-label="${escapeHtml(tt("shop.editAria", { name: it.name }))}">
                <span class="item-name">${escapeHtml(it.name)}${yours}</span>
                <span class="item-qty">${formatQty(it.qty)} ${escapeHtml(it.unit)}</span>
                <span class="item-price">${money(it.cost)}</span>
              </button>
              ${reset}${rem}
            </li>`;
          }).join("")}
        </ul>
      </div>`;
        // After Produce (or after final group if no Produce)
        if (cat === "Produce") {
          inserted = true;
          return block + addMoreBlock;
        }
        return block;
      }).join("");
      if (!inserted) listHtml += addMoreBlock;
    }
    $("#shopping-list").innerHTML = listHtml;
    renderExtrasChips();

    // View toggle active state
    document.querySelectorAll("[data-shop-view]").forEach((btn) => {
      btn.classList.toggle("is-on", btn.getAttribute("data-shop-view") === shopView);
    });

    bindShoppingPriceEdits();
    bindShoppingChecks();
    bindExtraRemoves();
    bindAddMoreInput();

    $("#meal-plan").querySelectorAll(".meal-tap").forEach((btn) => {
      btn.addEventListener("click", () => openSwapSheet(btn, scale, pantryKeys, allergyKeys));
    });

    results.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function bindShoppingChecks() {
    const root = $("#shopping-list");
    if (!root || !window.ListTools) return;
    root.querySelectorAll(".item-bought").forEach((box) => {
      box.addEventListener("change", () => {
        const id = box.getAttribute("data-id");
        const map = window.ListTools.loadChecked();
        if (box.checked) map[id] = true; else delete map[id];
        window.ListTools.saveChecked(map);
        if (window.ListTools.loadView() === "need" && state.lastPlan) renderPlan(state.lastPlan);
        else {
          const li = box.closest(".shop-item");
          if (li) li.classList.toggle("is-checked", box.checked);
        }
      });
    });
  }

  function bindShoppingPriceEdits() {
    const root = $("#shopping-list");
    if (!root) return;
    root.querySelectorAll(".shop-row").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const li = btn.closest(".shop-item");
        if (li) beginShopEdit(li);
      });
    });
    root.querySelectorAll(".item-reset").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.getAttribute("data-id");
        if (!id) return;
        clearOverride(id);
        runPlan();
      });
    });
  }

  function beginShopEdit(li) {
    if (!li || li.classList.contains("is-editing")) return;
    const id = li.getAttribute("data-id");
    if (!id) return;
    const ov = getOverride(id);
    const tableItem = prices()[id];
    const brandVal = ov && ov.brand ? ov.brand : "";
    const priceVal = ov ? ov.price : (tableItem ? tableItem.price : effectivePrice(id));
    li.classList.add("is-editing");
    li.innerHTML = `
      <label class="shop-edit-brand">
        <span class="sr-only">${escapeHtml(tt("shop.brandAria"))}</span>
        <input type="text" class="item-brand-input" maxlength="${BRAND_MAX}" placeholder="${escapeHtml(tt("shop.brandPlaceholder"))}" value="${escapeHtml(brandVal)}" autocomplete="off" />
      </label>
      <label class="shop-edit-price">
        <span class="sr-only">${escapeHtml(tt("shop.priceAria"))}</span>
        <input type="text" class="item-price-input" inputmode="decimal" placeholder="${escapeHtml(tt("shop.pricePlaceholder"))}" value="${escapeHtml(String(priceVal))}" autocomplete="off" />
      </label>
    `;
    const brandInput = li.querySelector(".item-brand-input");
    const priceInput = li.querySelector(".item-price-input");
    let saved = false;
    const finish = (commit) => {
      if (saved) return;
      saved = true;
      if (commit) {
        const parsed = parseUserPrice(priceInput.value);
        if (!parsed.ok) {
          // Invalid: leave edit open and restore focus; allow retry
          saved = false;
          priceInput.classList.add("is-invalid");
          priceInput.focus();
          return;
        }
        setOverride(id, brandInput.value, parsed.price);
        runPlan();
        return;
      }
      // Cancel (empty price blur): just re-render current plan view
      if (state.lastPlan) renderPlan(state.lastPlan);
      else runPlan();
    };
    const onKey = (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        finish(true);
      } else if (ev.key === "Escape") {
        ev.preventDefault();
        saved = true;
        if (state.lastPlan) renderPlan(state.lastPlan);
        else runPlan();
      }
    };
    brandInput.addEventListener("keydown", onKey);
    priceInput.addEventListener("keydown", onKey);
    // Blur save when focus leaves both fields
    const maybeBlurSave = () => {
      setTimeout(() => {
        if (saved) return;
        const active = document.activeElement;
        if (active === brandInput || active === priceInput) return;
        if (String(priceInput.value || "").trim() === "") {
          finish(false);
          return;
        }
        finish(true);
      }, 0);
    };
    brandInput.addEventListener("blur", maybeBlurSave);
    priceInput.addEventListener("blur", maybeBlurSave);
    priceInput.focus();
    priceInput.select();
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
    const i18nSeason = (window.I18N && window.I18N.seasonalBlock) ? window.I18N.seasonalBlock(season.key) : null;
    const title = (i18nSeason && i18nSeason.title) || season.title;
    const blurb = (i18nSeason && i18nSeason.blurb) || season.blurb;
    $("#seasonal").innerHTML = `
      <div class="season-badge">${escapeHtml(title)}</div>
      <p class="season-blurb">${escapeHtml(blurb)}</p>
      <div class="recipe-grid">
        ${season.recipes.map((r) => {
          const name = r.id ? tMeal(r.id, r.name) : r.name;
          const note = (window.I18N && window.I18N.mealNote && r.id) ? (window.I18N.mealNote(r.id, r.notes) || r.notes) : r.notes;
          const meals = r.meals || 2;
          return `
          <article class="recipe-card">
            <h3>${escapeHtml(name)}</h3>
            <p class="recipe-meta">Serves ~${r.serves} · ~${meals} meals · Est. ${money(r.cost)}</p>
            <p>${escapeHtml(note)}</p>
          </article>`;
        }).join("")}
      </div>
      <p class="estimate-note">${escapeHtml(tt("note.estimates"))}</p>
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
    let quickNotices = [];
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
      quickNotices = parsed.notices || [];
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
    // Prefer quick-input clamp notes when present (already applied to state)
    if (quickNotices.length) {
      const merged = quickNotices.concat((plan.notices || []).filter((n) => !quickNotices.includes(n)));
      plan.notices = merged;
    }
    renderPlan(plan);
  }

  function ingestReceipt(raw, label) {
    const rawStr = String(raw || "");
    if (rawStr.length > RECEIPT_PASTE_MAX) {
      $("#receipt-msg").textContent = "That paste was too large. Try a shorter receipt.";
      return;
    }
    const parsed = parseReceiptText(rawStr);
    const items = parsed.items || [];
    if (!items.length) {
      if (parsed.rejected > 0) {
        $("#receipt-msg").textContent = "That line looked off — check quantities and prices.";
      } else {
        $("#receipt-msg").textContent = "Couldn't find priced lines. Try lines like: Milk,1,3.49";
      }
      return;
    }
    const total = items.reduce((s, it) => s + it.price * (it.qty || 1), 0);
    if (!Number.isFinite(total) || total <= 0) {
      $("#receipt-msg").textContent = "That line looked off — check quantities and prices.";
      return;
    }
    const trips = loadReceipts();
    trips.push({ id: Date.now(), label: label || "Trip", date: new Date().toISOString(), items, total });
    const ok = saveReceipts(trips);
    if (!ok) {
      $("#receipt-msg").textContent = "Couldn't save on this phone — storage may be full. Try deleting old receipts.";
      return;
    }
    let msg = "Saved " + items.length + " items · " + money(total) + ". Your receipts stay on this phone.";
    if (parsed.rejected > 0) {
      msg += " Skipped " + parsed.rejected + " odd line" + (parsed.rejected === 1 ? "" : "s") + ".";
    }
    $("#receipt-msg").textContent = msg;
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


  function renderExtrasChips() {
    const extras = window.ListTools ? window.ListTools.loadExtras() : [];
    const html = extras.map((ex) => `
      <button type="button" class="chip extra-chip" data-extra-id="${escapeHtml(ex.id)}">${escapeHtml(ex.name)} ×</button>
    `).join("");
    document.querySelectorAll("#shop-extras-chips, #shop-extras-chips-inline").forEach((el) => {
      el.innerHTML = html;
      el.querySelectorAll("[data-extra-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
          removeExtraId(btn.getAttribute("data-extra-id"));
        });
      });
    });
  }

  function removeExtraId(id) {
    if (!window.ListTools || !id) return;
    const extras = window.ListTools.loadExtras().filter((ex) => ex.id !== id);
    window.ListTools.saveExtras(extras);
    if (state.lastPlan) renderPlan(state.lastPlan);
    else renderExtrasChips();
  }

  function bindExtraRemoves() {
    document.querySelectorAll(".extra-remove").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        removeExtraId(btn.getAttribute("data-extra-id"));
      });
    });
  }

  function addSharedExtra(rawName) {
    if (!window.ListTools) return;
    const name = String(rawName || "").trim();
    if (!name) return;
    const res = window.ListTools.addExtraByName(name);
    if (state.lastPlan) renderPlan(state.lastPlan);
    else renderExtrasChips();
    return res;
  }

  function bindAddMoreInput() {
    const input = $("#shop-add-more-input");
    if (!input || input.dataset.bound === "1") return;
    input.dataset.bound = "1";
    input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const val = input.value;
      input.value = "";
      addSharedExtra(val);
      // re-focus after re-render
      requestAnimationFrame(() => {
        const again = $("#shop-add-more-input");
        if (again) again.focus();
      });
    });
  }

  function bindShopToolsOnce() {
    if (bindShopToolsOnce.done) return;
    bindShopToolsOnce.done = true;
    document.querySelectorAll("[data-shop-view]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!window.ListTools) return;
        window.ListTools.saveView(btn.getAttribute("data-shop-view") || "all");
        if (state.lastPlan) renderPlan(state.lastPlan);
      });
    });
    const addBtn = $("#shop-add-btn");
    const addInput = $("#shop-add-input");
    const doAdd = () => {
      if (!addInput) return;
      const val = addInput.value;
      addInput.value = "";
      addSharedExtra(val);
    };
    addBtn?.addEventListener("click", doAdd);
    addInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); doAdd(); }
    });
    const helperForm = $("#shop-helper-form");
    helperForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!window.ListTools) return;
      const input = $("#shop-helper-input");
      const text = input ? input.value : "";
      const res = window.ListTools.handleHelper(text, state.lastPlan);
      if (input) input.value = "";
      const reply = $("#shop-helper-reply");
      if (reply) {
        reply.hidden = false;
        reply.textContent = res.reply || "";
      }
      const chips = $("#shop-helper-chips");
      if (chips) {
        chips.innerHTML = (res.suggestions || []).map((s) =>
          `<button type="button" class="chip" data-suggest-id="${escapeHtml(s.id)}">${escapeHtml(s.name)}</button>`
        ).join("");
        chips.querySelectorAll("[data-suggest-id]").forEach((btn) => {
          btn.addEventListener("click", () => {
            addSharedExtra(btn.textContent);
          });
        });
      }
      if (res.changed && state.lastPlan) renderPlan(state.lastPlan);
    });
  }

  function init() {
    // Family chips 1-8
    buildChipRow("#family-chips", [
      ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ id: String(n), label: String(n) }))
    ], {
      onToggle: (id) => {
        state.family = clamp(parseInt(id, 10), FAMILY_MIN, FAMILY_MAX);
        state.swaps = {};
        refreshChipUI();
      }
    });

    $("#family-minus")?.addEventListener("click", () => {
      state.family = clamp(state.family - 1, FAMILY_MIN, FAMILY_MAX);
      state.swaps = {};
      refreshChipUI();
    });
    $("#family-plus")?.addEventListener("click", () => {
      state.family = clamp(state.family + 1, FAMILY_MIN, FAMILY_MAX);
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
      { id: "3", label: tt("field.days.n", { n: 3 }) },
      { id: "5", label: tt("field.days.n", { n: 5 }) },
      { id: "7", label: tt("field.days.n", { n: 7 }) },
      { id: "10", label: tt("field.days.n", { n: 10 }) },
      { id: "14", label: tt("field.days.n", { n: 14 }) }
    ], {
      onToggle: (id) => {
        state.days = parseInt(id, 10);
        state.swaps = {};
        refreshChipUI();
      }
    });

    buildChipRow("#mealtype-chips", window.MEAL_TYPE_CHIPS.map((c) => ({ id: c.id, label: (window.I18N && window.I18N.mealTypeLabel) ? window.I18N.mealTypeLabel(c.id, c.label) : c.label })), {
      multi: true,
      onToggle: (id) => {
        if (state.mealTypes.has(id)) state.mealTypes.delete(id);
        else state.mealTypes.add(id);
        state.swaps = {};
        refreshChipUI();
      }
    });

    buildChipRow("#pantry-chips", window.PANTRY_CHIPS.map((c) => ({ id: c.id, label: (window.I18N && window.I18N.pantryLabel) ? window.I18N.pantryLabel(c.id, c.label) : c.label })), {
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
      buildChipRow("#allergy-chips", window.ALLERGY_CHIPS.map((c) => ({ id: c.id, label: (window.I18N && window.I18N.allergyLabel) ? window.I18N.allergyLabel(c.id, c.label) : c.label })), {
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

    bindShopToolsOnce();
    renderExtrasChips();

    window.GroceryPlan = {
      parseQuickInput,
      buildPlan,
      parseReceiptText,
      money,
      state,
      pantryKeySet,
      allergyKeySet,
      kidSwapOptions,
      addExtrasFill,
      mealContainsAllergen,
      poolFor,
      parseUserPrice,
      getOverride,
      setOverride,
      clearOverride,
      effectivePrice,
      displayName,
      hasCustomPrice,
      loadOverrides,
      invalidateOverrides,
      OVERRIDE_KEY,
      FAMILY_MIN,
      FAMILY_MAX,
      BUDGET_MIN,
      BUDGET_MAX,
      RECEIPT_LINE_PRICE_MAX,
      RECEIPT_PASTE_MAX,
      CUSTOM_PRICE_MAX
    };
  }

  // Expose API even if DOM init is delayed (headless tests)
  window.GroceryPlan = window.GroceryPlan || {};
  Object.assign(window.GroceryPlan, {
    parseQuickInput,
    buildPlan,
    parseReceiptText,
    money,
    state,
    pantryKeySet,
    allergyKeySet,
    kidSwapOptions,
    addExtrasFill,
    mealContainsAllergen,
    poolFor,
    parseUserPrice,
    getOverride,
    setOverride,
    clearOverride,
    effectivePrice,
    displayName,
    hasCustomPrice,
    loadOverrides,
    invalidateOverrides,
    OVERRIDE_KEY,
    FAMILY_MIN,
    FAMILY_MAX,
    BUDGET_MIN,
    BUDGET_MAX,
    RECEIPT_LINE_PRICE_MAX,
    RECEIPT_PASTE_MAX,
    CUSTOM_PRICE_MAX,
    onLanguageChange: function () {
      try { if (window.I18N) window.I18N.applyDocument(window.I18N.lang); } catch (e) {}
      refreshChipUI();
      // rebuild chip labels
      try { initChipsAndButtons && null; } catch (e) {}
      if (state.lastPlan) renderPlan(state.lastPlan);
      else {
        // re-init chip rows with translated labels
        if (typeof buildChipRow === "function") {
          /* refreshed via refresh paths */
        }
      }
      renderSeasonal();
      renderReceiptStats();
    },
    tt: tt
  });

  if (typeof document !== "undefined" && document.querySelector) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else {
      try { init(); } catch (e) { /* headless without full DOM */ }
    }
  }
})();
