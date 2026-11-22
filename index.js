/* MaxJubayerYT site - behaviour
   Theme toggle, scroll-spy, reveal on scroll, copy buttons, GitHub stats.
   No dependencies. */
(function () {
  "use strict";

  var USER = "MaxJubayerYT";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;

  function store(key, val) {
    try { if (val === undefined) return localStorage.getItem(key); localStorage.setItem(key, val); } catch (e) {}
    return null;
  }

  /* ---------------------------------------------------------------- Toast */
  var toastEl = $("#toast"), toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2200);
  }

  /* ---------------------------------------------------------------- Theme */
  var themeBtn = $("#themeBtn");
  function isDark() {
    var t = root.dataset.theme;
    if (t === "dark") return true;
    if (t === "light") return false;
    return window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function syncThemeIcons() {
    var dark = isDark();
    var moon = $("#themeIconMoon"), sun = $("#themeIconSun");
    // SVG elements have no .hidden property, so toggle the attribute directly.
    if (moon) moon.toggleAttribute("hidden", dark);
    if (sun) sun.toggleAttribute("hidden", !dark);
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#0b141a" : "#f5fbff");
  }
  if (themeBtn) themeBtn.addEventListener("click", function () {
    var next = isDark() ? "light" : "dark";
    root.dataset.theme = next;
    store("max.theme", next);
    syncThemeIcons();
  });
  if (window.matchMedia) {
    var mq = matchMedia("(prefers-color-scheme: dark)");
    var onMq = function () { syncThemeIcons(); };
    if (mq.addEventListener) mq.addEventListener("change", onMq); else if (mq.addListener) mq.addListener(onMq);
  }
  syncThemeIcons();

  /* ------------------------------------------------- Reveal on scroll */
  $$(".reveal").forEach(function (sec) {
    $$(".rv", sec).forEach(function (c, i) { c.style.setProperty("--i", i); });
  });
  if ("IntersectionObserver" in window) {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); rio.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    $$(".reveal").forEach(function (el) { rio.observe(el); });
  } else {
    $$(".reveal").forEach(function (el) { el.classList.add("in"); });
  }

  /* ------------------------------------------------------ Scroll spy */
  var links = $$("#navLinks a");
  var byId = {};
  links.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
  function setCurrent(id) {
    links.forEach(function (a) {
      if (byId[id] === a) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
    });
    var cur = byId[id];
    var nav = $("#navLinks");
    if (cur && nav && nav.scrollWidth > nav.clientWidth) {
      var left = cur.offsetLeft - (nav.clientWidth - cur.offsetWidth) / 2;
      nav.scrollTo ? nav.scrollTo({ left: left, behavior: "smooth" }) : (nav.scrollLeft = left);
    }
  }
  if ("IntersectionObserver" in window) {
    var visible = {};
    var order = ["top", "about", "projects", "links", "contact"];
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
      var active = null;
      for (var i = 0; i < order.length; i++) if (visible[order[i]]) active = order[i];
      setCurrent(active || "top");
    }, { rootMargin: "-35% 0px -55% 0px" });
    order.forEach(function (id) { var el = document.getElementById(id); if (el) spy.observe(el); });
  }

  /* ------------------------------------------------------------ Copy */
  $$("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var src = $(btn.getAttribute("data-copy"));
      if (!src) return;
      var text = src.textContent.trim();
      var done = function () { toast("Copied to clipboard"); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
      } else { fallbackCopy(text); done(); }
    });
  });
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
  }

  /* ------------------------------------------------------ GitHub stats
     Optional. If the API is unreachable or rate-limited the block stays hidden. */
  var stats = $("#ghStats");
  if (stats && window.fetch) {
    fetch("https://api.github.com/users/" + USER)
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (u) {
        var items = [[u.followers, "followers"], [u.public_repos, "public repos"]];
        items.forEach(function (it) {
          if (typeof it[0] !== "number") return;
          var c = document.createElement("span");
          c.className = "chip chip--round";
          c.textContent = it[0] + " " + it[1];
          stats.appendChild(c);
        });
        if (stats.childNodes.length) stats.hidden = false;
      })
      .catch(function () {});
  }

  /* ------------------------------------------------- Download counts
     Modrinth: sum of project downloads. GitHub: sum of release asset downloads.
     Cached for 1 hour. Badges stay hidden if the APIs fail. */
  function fmt(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, "") + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, "") + "K";
    return String(n);
  }
  function showDl(el, n) {
    if (typeof n !== "number" || n < 0) return;
    var t = $(".dl__n", el);
    if (t) t.textContent = fmt(n);
    el.hidden = false;
  }
  function cached(key, load, apply) {
    var raw = store(key), hit = null;
    try { hit = raw ? JSON.parse(raw) : null; } catch (e) {}
    if (hit && Date.now() - hit.t < 3600000) { apply(hit.v); return; }
    load().then(function (v) { store(key, JSON.stringify({ t: Date.now(), v: v })); apply(v); })
      .catch(function () { if (hit) apply(hit.v); });
  }
  if (window.fetch) {
    var mrEls = $$("[data-mr]");
    if (mrEls.length) {
      var ids = mrEls.map(function (e) { return e.getAttribute("data-mr"); });
      cached("max.dl.mr", function () {
        return fetch("https://api.modrinth.com/v2/projects?ids=" + encodeURIComponent(JSON.stringify(ids)))
          .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
          .then(function (list) { var m = {}; list.forEach(function (p) { m[p.id] = p.downloads; }); return m; });
      }, function (m) { mrEls.forEach(function (e) { showDl(e, m[e.getAttribute("data-mr")]); }); });
    }
    $$("[data-gh]").forEach(function (el) {
      var repo = el.getAttribute("data-gh");
      cached("max.dl.gh." + repo, function () {
        return fetch("https://api.github.com/repos/" + repo + "/releases?per_page=100")
          .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
          .then(function (rel) {
            var sum = 0;
            rel.forEach(function (x) { (x.assets || []).forEach(function (a) { sum += a.download_count || 0; }); });
            return sum;
          });
      }, function (n) { showDl(el, n); });
    });
  }
})();
