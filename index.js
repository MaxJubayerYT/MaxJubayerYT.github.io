/* MaxJubayerYT site - behaviour
   Theme toggle, scroll-spy, reveal on scroll, copy buttons, live counts.
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

  /* ------------------------------------------------------ Live counts
     Everything goes through getJSON so a URL is only requested once per page.
     Results are cached for 1 hour. If a request fails and nothing is cached the
     badge shows "API limit reached" (HTTP 403/429) or "Unavailable". */
  var memo = {};
  function getJSON(url) {
    if (!memo[url]) memo[url] = fetch(url).then(function (r) {
      if (!r.ok) { var e = new Error("HTTP " + r.status); e.status = r.status; throw e; }
      return r.json();
    });
    return memo[url];
  }
  function fmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function showDl(el, text) {
    var t = $(".dl__n", el);
    if (t) t.textContent = text;
    el.classList.remove("dl--err");
    el.hidden = false;
  }
  function showErr(el, e) {
    var t = $(".dl__n", el);
    if (t) t.textContent = (e && (e.status === 403 || e.status === 429)) ? "API limit reached" : "Unavailable";
    el.classList.add("dl--err");
    el.hidden = false;
  }
  function cached(key, load, apply, fail) {
    var raw = store(key), hit = null;
    try { hit = raw ? JSON.parse(raw) : null; } catch (e) {}
    if (hit && Date.now() - hit.t < 3600000) { apply(hit.v); return; }
    load().then(function (v) { store(key, JSON.stringify({ t: Date.now(), v: v })); apply(v); })
      .catch(function (e) { if (hit) apply(hit.v); else fail(e); });
  }

  if (window.fetch) {
    var manual = fetch("stats.json", { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .catch(function () { return {}; });
    var UNITS = { youtube: "subscribers", twitch: "followers", x: "followers", tiktok: "followers",
      instagram: "followers", patreon: "patrons", namemc: "likes", curseforge: "downloads",
      github: "followers", bluesky: "followers", discord: "members" };

    /* GitHub follower/repo chips in the About section (quiet: hidden on failure) */
    var stats = $("#ghStats");
    if (stats) {
      getJSON("https://api.github.com/users/" + USER).then(function (u) {
        [[u.followers, "followers"], [u.public_repos, "public repos"]].forEach(function (it) {
          if (typeof it[0] !== "number") return;
          var c = document.createElement("span");
          c.className = "chip chip--round";
          c.textContent = it[0] + " " + it[1];
          stats.appendChild(c);
        });
        if (stats.childNodes.length) stats.hidden = false;
      }).catch(function () {});
    }

    /* Modrinth: per-project counts on the cards */
    var mrEls = $$("[data-mr]");
    if (mrEls.length) {
      var ids = mrEls.map(function (e) { return e.getAttribute("data-mr"); });
      cached("max.v3.mr", function () {
        return getJSON("https://api.modrinth.com/v2/projects?ids=" + encodeURIComponent(JSON.stringify(ids)))
          .then(function (list) { var m = {}; list.forEach(function (p) { m[p.id] = p.downloads; }); return m; });
      }, function (m) {
        mrEls.forEach(function (e) {
          var n = m[e.getAttribute("data-mr")];
          if (typeof n === "number") showDl(e, fmt(n) + " downloads"); else showErr(e, null);
        });
      }, function (err) { mrEls.forEach(function (e) { showErr(e, err); }); });
    }

    /* Modrinth: combined totals over all of the user's projects */
    var mrTotals = $$("[data-mr-total]"), mrStat = $$('[data-stat="modrinth"]');
    if (mrTotals.length || mrStat.length) {
      cached("max.v3.mruser", function () {
        return getJSON("https://api.modrinth.com/v2/user/" + USER + "/projects").then(function (list) {
          var d = 0, f = 0;
          list.forEach(function (p) { d += p.downloads || 0; f += p.followers || 0; });
          return { d: d, f: f };
        });
      }, function (t) {
        mrTotals.forEach(function (e) { showDl(e, fmt(t.d) + " total Modrinth downloads"); });
        mrStat.forEach(function (e) { showDl(e, fmt(t.d) + " downloads, " + fmt(t.f) + " followers"); });
      }, function (err) {
        mrTotals.concat(mrStat).forEach(function (e) { showErr(e, err); });
      });
    }

    /* GitHub: total release downloads per repo */
    function repoTotal(repo) {
      var sum = 0;
      function page(p) {
        return getJSON("https://api.github.com/repos/" + repo + "/releases?per_page=100&page=" + p)
          .then(function (rel) {
            rel.forEach(function (x) { (x.assets || []).forEach(function (a) { sum += a.download_count || 0; }); });
            return rel.length === 100 && p < 5 ? page(p + 1) : sum;
          });
      }
      return page(1);
    }
    $$("[data-gh]").forEach(function (el) {
      var repo = el.getAttribute("data-gh");
      cached("max.v3.gh." + repo, function () { return repoTotal(repo); },
        function (n) { showDl(el, fmt(n) + " downloads"); },
        function (err) { showErr(el, err); });
    });

    /* Links tab: follower / subscriber counts.
       Live where a browser-callable public API exists, otherwise from stats.json. */
    var LIVE = {
      github: function () {
        return getJSON("https://api.github.com/users/" + USER).then(function (u) { return u.followers; });
      },
      bluesky: function () {
        return getJSON("https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=maxjubayeryt.bsky.social")
          .then(function (p) { return p.followersCount; });
      },
      discord: function () {
        return getJSON("https://discord.com/api/v9/invites/j8GTQv3YvY?with_counts=true")
          .then(function (i) { return i.approximate_member_count; });
      }
    };
    $$("[data-stat]").forEach(function (el) {
      var key = el.getAttribute("data-stat");
      if (key === "modrinth") return;
      var show = function (n) { showDl(el, fmt(n) + " " + UNITS[key]); };
      var fromManual = function (err) {
        manual.then(function (m) {
          if (typeof m[key] === "number") show(m[key]);
          else if (err) showErr(el, err);
        });
      };
      if (LIVE[key]) {
        cached("max.v3.st." + key, function () {
          return LIVE[key]().then(function (n) { if (typeof n !== "number") throw new Error("bad data"); return n; });
        }, show, fromManual);
      } else fromManual(null);
    });
  }
})();
