/* Shopping list extras, purchased checks, still-need view, scripted helper */
(function (global) {
  "use strict";
  var CHECK_KEY = "ai901_plan_checked_v1";
  var EXTRA_KEY = "ai901_plan_extras_v1";
  var VIEW_KEY = "ai901_plan_shop_view_v1";

  var AISLE_KEYWORDS = [
    { cat: "Dairy & Eggs", words: ["milk", "egg", "butter", "cheese", "yogurt", "cream", "leche", "huevo", "حليب", "بيض", "sữa", "trứng", "牛奶", "鸡蛋", "奶酪"] },
    { cat: "Meat & Protein", words: ["chicken", "beef", "turkey", "pork", "bacon", "tuna", "bean", "tofu", "hot dog", "peanut", "lentil", "pollo", "carne", "دجاج", "لحم", "thịt", "gà", "肉", "鸡", "豆"] },
    { cat: "Grains & Bread", words: ["bread", "rice", "pasta", "tortilla", "oat", "cereal", "flour", "ramen", "cracker", "pan", "arroz", "خبز", "أرز", "bánh mì", "gạo", "面包", "米", "面"] },
    { cat: "Produce", words: ["banana", "apple", "onion", "potato", "carrot", "lettuce", "tomato", "pepper", "garlic", "celery", "broccoli", "spinach", "avocado", "lemon", "fruit", "veg", "plátano", "papa", "بصل", "بطاطس", "chuối", "khoai", "香蕉", "土豆", "洋葱"] },
    { cat: "Frozen", words: ["frozen", "pizza", "congel", "مجمد", "đông lạnh", "冷冻"] },
    { cat: "Drinks", words: ["juice", "coffee", "tea", "jugo", "café", "عصير", "قهوة", "nước", "汁", "咖啡", "茶"] },
    { cat: "Pantry", words: ["oil", "salt", "sugar", "sauce", "soup", "broth", "mayo", "ketchup", "mustard", "salsa", "jam", "honey", "spice", "flour", "aceite", "زيت", "dầu", "油", "盐", "糖"] }
  ];

  var STAPLE_SUGGESTIONS = [
    "eggs_dozen", "milk_gallon", "bread", "bananas", "rice", "pasta", "canned_beans",
    "chicken_thighs", "carrots", "onions", "potatoes", "cereal", "peanut_butter", "frozen_veg", "cheddar"
  ];

  function t(key, vars) {
    return (global.I18N && global.I18N.t) ? global.I18N.t(key, vars) : key;
  }
  function catName(c) {
    return (global.I18N && global.I18N.categoryName) ? global.I18N.categoryName(c) : c;
  }
  function itemName(id, fb) {
    return (global.I18N && global.I18N.itemName) ? global.I18N.itemName(id, fb) : (fb || id);
  }

  function loadJson(key, fallback) {
    try {
      var raw = global.localStorage.getItem(key);
      if (!raw) return fallback;
      var v = JSON.parse(raw);
      return v == null ? fallback : v;
    } catch (e) { return fallback; }
  }
  function saveJson(key, val) {
    try { global.localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  function loadChecked() { return loadJson(CHECK_KEY, {}); }
  function saveChecked(map) { saveJson(CHECK_KEY, map); }
  function loadExtras() { return loadJson(EXTRA_KEY, []); }
  function saveExtras(arr) { saveJson(EXTRA_KEY, arr); }
  function loadView() { return global.localStorage.getItem(VIEW_KEY) || "all"; }
  function saveView(v) { try { global.localStorage.setItem(VIEW_KEY, v); } catch (e) {} }

  function guessAisle(name) {
    var n = String(name || "").toLowerCase();
    for (var i = 0; i < AISLE_KEYWORDS.length; i++) {
      var row = AISLE_KEYWORDS[i];
      for (var j = 0; j < row.words.length; j++) {
        if (n.indexOf(row.words[j]) !== -1) return row.cat;
      }
    }
    return "Other";
  }

  function slugify(name) {
    return "extra_" + String(name || "item").toLowerCase().replace(/[^a-z0-9\u0600-\u06ff\u4e00-\u9fff]+/gi, "_").replace(/^_|_$/g, "").slice(0, 40);
  }

  function allergyKeySet() {
    if (global.GroceryPlan && global.GroceryPlan.allergyKeySet) return global.GroceryPlan.allergyKeySet();
    return new Set();
  }

  function knownItemIdByName(name) {
    var table = (global.PRICE_TABLE && global.PRICE_TABLE.items) || {};
    var n = String(name || "").toLowerCase().trim();
    if (!n) return null;
    // direct id
    if (table[n]) return n;
    var keys = Object.keys(table);
    for (var i = 0; i < keys.length; i++) {
      var id = keys[i];
      var label = itemName(id, table[id].name).toLowerCase();
      var en = (table[id].name || "").toLowerCase();
      if (label === n || en === n || label.indexOf(n) !== -1 || en.indexOf(n) !== -1 || n.indexOf(en.split(" (")[0]) !== -1) return id;
    }
    // keyword aliases
    var aliases = {
      milk: "milk_gallon", eggs: "eggs_dozen", egg: "eggs_dozen", bread: "bread", cereal: "cereal",
      rice: "rice", pasta: "pasta", bananas: "bananas", banana: "bananas", chicken: "chicken_thighs",
      beef: "ground_beef", beans: "canned_beans", cheese: "cheddar", tortillas: "tortillas",
      onions: "onions", potatoes: "potatoes", carrots: "carrots", butter: "butter", yogurt: "yogurt"
    };
    if (aliases[n]) return aliases[n];
    return null;
  }

  function parseIntent(text) {
    var raw = String(text || "").trim();
    var s = raw.toLowerCase();
    if (!s) return { type: "empty" };
    if (/how much|total|cu[aá]nto|المجموع|tổng|总计|多少钱/.test(s)) return { type: "total" };
    if (/what else|missing|suggest|qu[eé] m[aá]s|ماذا.*أضيف|còn thiếu|还能加|缺什么/.test(s)) return { type: "suggest" };
    var rem = s.match(/^(?:remove|delete|quita[r]?|حذف|x[oó]a|删除)\s+(.+)/i) || raw.match(/^(?:remove|delete)\s+(.+)/i);
    if (rem) return { type: "remove", names: splitNames(rem[1]) };
    var add = s.match(/^(?:add|can i add|agrega[r]?|أضف|thêm|加|添加)\s+(.+)/i) || raw.match(/^(?:add|can i add)\s+(.+)/i);
    if (add) return { type: "add", names: splitNames(add[1].replace(/\?$/, "")) };
    // bare grocery words only if every token maps to a known item
    if (/^[a-zA-Z\u0600-\u06ff\u4e00-\u9fff].{0,60}$/.test(raw) && !/\?$/.test(s)) {
      var maybe = splitNames(raw);
      if (maybe.length && maybe.every(function (n) { return !!knownItemIdByName(n); })) {
        return { type: "add", names: maybe };
      }
    }
    return { type: "fallback" };
  }

  function splitNames(chunk) {
    return String(chunk || "")
      .replace(/\?$/g, "")
      .split(/\s*(?:,|&| and | y | و | và |和)\s*/i)
      .map(function (x) { return x.trim(); })
      .filter(Boolean);
  }

  function makeExtraItem(name) {
    var known = knownItemIdByName(name);
    var table = (global.PRICE_TABLE && global.PRICE_TABLE.items) || {};
    if (known && table[known]) {
      var it = table[known];
      return { id: known, name: itemName(known, it.name), unit: it.unit || "each", cat: it.cat || guessAisle(name), qty: 1, price: it.price || 0, cost: it.price || 0, customExtra: true, known: true };
    }
    var id = slugify(name);
    var cat = guessAisle(name);
    return { id: id, name: name.trim(), unit: "each", cat: cat, qty: 1, price: 0, cost: 0, customExtra: true, known: false };
  }

  function mergeExtrasIntoShopping(shopping) {
    var list = (shopping || []).map(function (x) { return Object.assign({}, x); });
    var extras = loadExtras();
    var ids = {};
    list.forEach(function (it) { ids[it.id] = true; });
    extras.forEach(function (ex) {
      if (!ex || !ex.id) return;
      if (ids[ex.id]) return;
      // refresh translated name for known ids
      if (ex.known) ex.name = itemName(ex.id, ex.name);
      list.push(Object.assign({}, ex));
      ids[ex.id] = true;
    });
    return list;
  }

  function filterStillNeed(shopping) {
    var checked = loadChecked();
    return (shopping || []).filter(function (it) { return !checked[it.id]; });
  }

  function groupByCat(shopping) {
    var grouped = {};
    (shopping || []).forEach(function (item) {
      var c = item.cat || "Other";
      if (!grouped[c]) grouped[c] = [];
      grouped[c].push(item);
    });
    return grouped;
  }

  function suggestStaples(plan) {
    var allergyKeys = allergyKeySet();
    var have = new Set();
    (plan && plan.shopping ? plan.shopping : []).forEach(function (it) { have.add(it.id); });
    loadExtras().forEach(function (ex) { if (ex && ex.id) have.add(ex.id); });
    var table = (global.PRICE_TABLE && global.PRICE_TABLE.items) || {};
    var budgetLeft = plan ? Math.max(0, (plan.budget || 0) - (plan.total || 0)) : 50;
    var out = [];
    for (var i = 0; i < STAPLE_SUGGESTIONS.length && out.length < 5; i++) {
      var id = STAPLE_SUGGESTIONS[i];
      if (have.has(id)) continue;
      if (allergyKeys.has(id)) continue;
      var item = table[id];
      if (!item) continue;
      if (item.price > budgetLeft + 5 && out.length >= 3) continue;
      out.push({ id: id, name: itemName(id, item.name), price: item.price, cat: item.cat });
    }
    return out;
  }

  function handleHelper(text, plan) {
    var intent = parseIntent(text);
    if (intent.type === "empty") return { intent: intent, reply: t("shop.helper.fallback"), suggestions: [] };
    if (intent.type === "fallback") return { intent: intent, reply: t("shop.helper.fallback"), suggestions: [] };
    if (intent.type === "total") {
      var money = (global.GroceryPlan && global.GroceryPlan.money) ? global.GroceryPlan.money(plan ? plan.total : 0) : ("$" + ((plan && plan.total) || 0));
      return { intent: intent, reply: t("shop.helper.total", { money: money }), suggestions: [] };
    }
    if (intent.type === "suggest") {
      var sug = suggestStaples(plan);
      if (!sug.length) return { intent: intent, reply: t("shop.helper.suggestEmpty"), suggestions: [] };
      return { intent: intent, reply: t("shop.helper.suggest"), suggestions: sug };
    }
    if (intent.type === "remove") {
      var extras = loadExtras();
      var removed = [];
      var missing = [];
      intent.names.forEach(function (name) {
        var id = knownItemIdByName(name) || slugify(name);
        var before = extras.length;
        extras = extras.filter(function (ex) { return ex.id !== id && String(ex.name).toLowerCase() !== name.toLowerCase(); });
        var checked = loadChecked();
        if (checked[id]) { delete checked[id]; saveChecked(checked); }
        if (extras.length < before) removed.push(name); else missing.push(name);
      });
      saveExtras(extras);
      if (removed.length) return { intent: intent, reply: t("shop.helper.removed", { list: removed.join(", ") }), suggestions: [], changed: true };
      return { intent: intent, reply: t("shop.helper.notFound", { list: missing.join(", ") }), suggestions: [] };
    }
    if (intent.type === "add") {
      var extras = loadExtras();
      var allergyKeys = allergyKeySet();
      var added = [];
      var already = [];
      var blocked = [];
      intent.names.forEach(function (name) {
        var item = makeExtraItem(name);
        if (allergyKeys.has(item.id)) { blocked.push(name); return; }
        if (extras.some(function (ex) { return ex.id === item.id; }) || ((plan && plan.shopping) || []).some(function (it) { return it.id === item.id; })) {
          already.push(item.name); return;
        }
        extras.push(item);
        added.push(item.name);
      });
      saveExtras(extras);
      var parts = [];
      if (added.length) parts.push(t("shop.helper.added", { list: added.join(", ") }));
      if (already.length) parts.push(t("shop.helper.already", { list: already.join(", ") }));
      if (blocked.length) parts.push(t("shop.helper.allergyBlock", { list: blocked.join(", ") }));
      return { intent: intent, reply: parts.join(" ") || t("shop.helper.fallback"), suggestions: [], changed: added.length > 0 };
    }
    return { intent: intent, reply: t("shop.helper.fallback"), suggestions: [] };
  }

  function addExtraByName(name) {
    return handleHelper("add " + name, (global.GroceryPlan && global.GroceryPlan.state && global.GroceryPlan.state.lastPlan) || global.__lastPlan);
  }

  global.ListTools = {
    CHECK_KEY: CHECK_KEY, EXTRA_KEY: EXTRA_KEY, VIEW_KEY: VIEW_KEY,
    loadChecked: loadChecked, saveChecked: saveChecked,
    loadExtras: loadExtras, saveExtras: saveExtras,
    loadView: loadView, saveView: saveView,
    guessAisle: guessAisle, makeExtraItem: makeExtraItem,
    mergeExtrasIntoShopping: mergeExtrasIntoShopping,
    filterStillNeed: filterStillNeed, groupByCat: groupByCat,
    parseIntent: parseIntent, suggestStaples: suggestStaples, handleHelper: handleHelper,
    addExtraByName: addExtraByName, knownItemIdByName: knownItemIdByName,
    catName: catName
  };
})(typeof window !== "undefined" ? window : globalThis);
