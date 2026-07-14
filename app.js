(function () {
  // Cheatsheet content (data.json, thumbnails) lives in the hub-cheatsheets
  // repo (gated library) — this public landing reads the same public asset,
  // no duplication.
  var DATA_BASE = "https://jetmetrics-io.github.io/hub-cheatsheets/";
  var IS_LOCAL = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  var SELF_BASE = IS_LOCAL ? "" : "https://jetmetrics-io.github.io/cheatsheets/";
  var SIGNUP_URL = "https://джетметрикс.рф/signup";

  var state = {
    items: [],
    tagLabels: {},
    activeTags: new Set(),
    query: "",
  };

  var els = {
    tags: document.getElementById("jm-csl-tags"),
    grid: document.getElementById("jm-csl-grid"),
    count: document.getElementById("jm-csl-count"),
    empty: document.getElementById("jm-csl-empty"),
    search: document.getElementById("jm-csl-search-input"),
    resetFilters: document.getElementById("jm-csl-reset-filters"),
  };

  // ctaVariants is filled once data.json and telegram_stats.json resolve —
  // renderCtaCard() cycles through it, so the in-grid CTA cards (one every
  // CTA_EVERY items) rotate between different reasons to register instead
  // of repeating the same line 4+ times down a 93-card grid.
  var ctaVariants = [];

  function pluralize(n, one, few, many) {
    var mod10 = n % 10;
    var mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
  }

  var dataPromise = fetch(DATA_BASE + "data.json").then(function (r) { return r.json(); });

  // Telegram subscriber count — refreshed daily by a GitHub Action that
  // scrapes the public t.me/s/jetmetrics page (no bot token, no client-side secret).
  var tgPromise = fetch(SELF_BASE + "telegram_stats.json")
    .then(function (r) { return r.ok ? r.json() : null; })
    .catch(function () { return null; });

  Promise.all([dataPromise, tgPromise])
    .then(function (results) {
      var data = results[0];
      var stats = results[1];

      state.items = data.items;
      state.tagLabels = data.tags;

      var total = state.items.length;
      var tagCount = Object.keys(state.tagLabels).length;
      var sheetWord = pluralize(total, "читшит", "читшита", "читшитов");
      var tagWord = pluralize(tagCount, "тема", "темы", "тем");

      document.getElementById("jm-csl-lead-count").textContent = total;
      document.getElementById("jm-csl-lead-word").textContent = sheetWord;
      document.getElementById("jm-csl-stat-total").textContent = total;
      document.getElementById("jm-csl-stat-total-word").textContent = sheetWord;
      document.getElementById("jm-csl-stat-tags").textContent = tagCount;
      document.getElementById("jm-csl-stat-tags-word").textContent = tagWord;
      document.getElementById("jm-csl-footer-count").textContent = total;
      document.getElementById("jm-csl-footer-word").textContent = sheetWord;

      ctaVariants = [
        { icon: "🔓", title: "Откройте все " + total + " " + sheetWord, sub: "Бесплатно, сразу после регистрации" },
        { icon: "📥", title: "Скачивайте в PDF", sub: "Сохраняйте, распечатывайте, используйте офлайн" },
      ];
      if (stats && stats.label_ru) {
        ctaVariants.push({
          icon: "✈️",
          title: "Каждый читшит сначала выходит в ТГ",
          sub: stats.label_ru + " человек уже читают",
          secondaryHref: "https://t.me/jetmetrics",
          secondaryLabel: "Открыть канал →",
        });
      }

      renderTagPills();
      render();
    })
    .catch(function (err) {
      els.grid.innerHTML = "<p style='color:#b00'>Не удалось загрузить список читшитов: " + err + "</p>";
    });

  function renderTagPills() {
    var allPill = document.createElement("button");
    allPill.className = "jm-csl-tag-pill all active";
    allPill.type = "button";
    allPill.textContent = "Все темы";
    allPill.addEventListener("click", function () {
      state.activeTags.clear();
      updatePillStates();
      render();
    });
    els.tags.appendChild(allPill);

    Object.keys(state.tagLabels).forEach(function (tagId) {
      var pill = document.createElement("button");
      pill.className = "jm-csl-tag-pill";
      pill.type = "button";
      pill.dataset.tag = tagId;
      pill.textContent = state.tagLabels[tagId];
      pill.addEventListener("click", function () {
        state.activeTags = new Set([tagId]);
        updatePillStates();
        render();
      });
      els.tags.appendChild(pill);
    });
  }

  function updatePillStates() {
    var pills = els.tags.querySelectorAll(".jm-csl-tag-pill");
    pills.forEach(function (pill) {
      if (pill.classList.contains("all")) {
        pill.classList.toggle("active", state.activeTags.size === 0);
      } else {
        pill.classList.toggle("active", state.activeTags.has(pill.dataset.tag));
      }
    });
  }

  els.search.addEventListener("input", function (e) {
    state.query = e.target.value.trim().toLowerCase();
    render();
  });

  els.resetFilters.addEventListener("click", function () {
    state.activeTags.clear();
    state.query = "";
    els.search.value = "";
    updatePillStates();
    render();
  });

  function matches(item) {
    if (state.activeTags.size > 0) {
      var hasTag = item.tags.some(function (t) { return state.activeTags.has(t); });
      if (!hasTag) return false;
    }
    if (state.query && item.title.toLowerCase().indexOf(state.query) === -1) {
      return false;
    }
    return true;
  }

  var TITLE_NUM_RE = /^№(\d+)\s*—\s*(.*)$/;

  function renderTitle(container, title) {
    var m = TITLE_NUM_RE.exec(title);
    container.innerHTML = "";
    if (!m) {
      container.textContent = title;
      return;
    }
    var num = document.createElement("span");
    num.className = "jm-csl-num";
    num.textContent = m[1];
    container.appendChild(num);
    container.appendChild(document.createTextNode(" " + m[2]));
  }

  var CTA_EVERY = 20;

  function renderCtaCard(n) {
    var variant = ctaVariants[n % ctaVariants.length];
    // A plain <a> can't hold a second independent link, so the card is a
    // <div> — the action link is stretched over the whole card via ::after
    // (see style.css), and an optional secondary link (e.g. the Telegram
    // channel itself) stays independently clickable on top of it.
    var card = document.createElement("div");
    card.className = "jm-csl-card jm-csl-card--cta";
    card.innerHTML =
      '<span class="jm-csl-card-cta-icon">' + variant.icon + '</span>' +
      '<span class="jm-csl-card-cta-title">' + variant.title + '</span>' +
      (variant.sub ? '<span class="jm-csl-card-cta-sub">' + variant.sub + '</span>' : '') +
      (variant.secondaryHref
        ? '<a class="jm-csl-card-cta-secondary" href="' + variant.secondaryHref + '" target="_blank" rel="noopener">' + variant.secondaryLabel + '</a>'
        : '') +
      '<a class="jm-csl-card-cta-action" href="' + SIGNUP_URL + '">Зарегистрироваться →</a>';
    return card;
  }

  function render() {
    var filtered = state.items.filter(matches);
    els.grid.innerHTML = "";
    els.count.textContent = filtered.length + " из " + state.items.length + " читшитов";
    els.empty.hidden = filtered.length > 0;
    els.resetFilters.hidden = state.activeTags.size === 0 && !state.query;

    var ctaCount = 0;
    filtered.forEach(function (item, index) {
      if (index > 0 && index % CTA_EVERY === 0) {
        els.grid.appendChild(renderCtaCard(ctaCount));
        ctaCount++;
      }

      var card = document.createElement("a");
      card.className = "jm-csl-card";
      card.href = SIGNUP_URL;

      var thumbWrap = document.createElement("div");
      thumbWrap.className = "jm-csl-card-thumb-wrap";
      var img = document.createElement("img");
      img.src = DATA_BASE + item.thumb;
      img.loading = "lazy";
      img.alt = item.title;
      thumbWrap.appendChild(img);

      var lock = document.createElement("div");
      lock.className = "jm-csl-card-lock";
      lock.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="5" y="9" width="10" height="8" rx="1.5" stroke="white" stroke-width="1.6"/>' +
        '<path d="M7 9V6.5C7 4.6 8.6 3 10.5 3C12.4 3 14 4.6 14 6.5V9" stroke="white" stroke-width="1.6" stroke-linecap="round"/>' +
        '</svg>';
      thumbWrap.appendChild(lock);
      card.appendChild(thumbWrap);

      var body = document.createElement("div");
      body.className = "jm-csl-card-body";

      var title = document.createElement("div");
      title.className = "jm-csl-card-title";
      renderTitle(title, item.title);
      body.appendChild(title);

      if (item.seo_description) {
        var desc = document.createElement("div");
        desc.className = "jm-csl-card-desc";
        desc.textContent = item.seo_description;
        body.appendChild(desc);
      }

      var tagsWrap = document.createElement("div");
      tagsWrap.className = "jm-csl-card-tags";
      item.tags.forEach(function (t) {
        var chip = document.createElement("span");
        chip.className = "jm-csl-card-tag";
        chip.textContent = state.tagLabels[t] || t;
        tagsWrap.appendChild(chip);
      });
      body.appendChild(tagsWrap);

      card.appendChild(body);
      els.grid.appendChild(card);
    });
  }
})();
