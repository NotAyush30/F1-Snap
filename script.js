/**
 * F1 SNAP — script.js
 * Production-quality Formula 1 companion app
 * Architecture: Module pattern with clean separation of concerns
 */

"use strict";

/* ═══════════════════════════════════════════════════════════════════
   1. API MODULE
   ═══════════════════════════════════════════════════════════════════ */
const API = (() => {
  const BASE = "https://api.jolpi.ca/ergast/f1";
  const SEASON = 2025;
  const cache = new Map();
  const CACHE_TTL = 43200000; // 12 hours

  async function fetchJSON(url) {
    const now = Date.now();
    if (cache.has(url)) {
      const { data, ts, isCompleted } = cache.get(url);
      if (isCompleted || now - ts < CACHE_TTL) return data;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API ${res.status}: ${url}`);
    const json = await res.json();

    let isCompleted = false;
    if (json.MRData) {
      if (
        json.MRData.RaceTable &&
        json.MRData.RaceTable.Races &&
        json.MRData.RaceTable.Races.length > 0
      ) {
        if (url.includes("results") || url.includes("qualifying"))
          isCompleted = true;
      }
      if (
        json.MRData.StandingsTable &&
        json.MRData.StandingsTable.StandingsLists &&
        json.MRData.StandingsTable.StandingsLists.length > 0
      ) {
        isCompleted = true;
      }
    }
    if (
      url.endsWith("2025.json") ||
      url.endsWith("2026.json") ||
      url.endsWith("/results/1.json")
    ) {
      isCompleted = false;
    }

    cache.set(url, { data: json, ts: now, isCompleted });
    return json;
  }

  const endpoints = {
    schedule: () => fetchJSON(`${BASE}/${SEASON}.json`),
    schedule2026: () => fetchJSON(`${BASE}/2026.json`),
    driverStandings: () => fetchJSON(`${BASE}/${SEASON}/driverStandings.json`),
    constructorStandings: () =>
      fetchJSON(`${BASE}/${SEASON}/constructorStandings.json`),
    historicalDriverStandings: (season, round) =>
      fetchJSON(`${BASE}/${season}/${round}/driverStandings.json`),
    historicalConstructorStandings: (season, round) =>
      fetchJSON(`${BASE}/${season}/${round}/constructorStandings.json`),
    winners: (season) => fetchJSON(`${BASE}/${season}/results/1.json`),
    lastRace: () => fetchJSON(`${BASE}/${SEASON}/last/results.json`),
    raceResults: (season, r) =>
      fetchJSON(`${BASE}/${season || SEASON}/${r}/results.json`),
    qualifying: (season, r) =>
      fetchJSON(`${BASE}/${season || SEASON}/${r}/qualifying.json`),
    drivers: () => fetchJSON(`${BASE}/${SEASON}/drivers.json?limit=30`),
    driverResults: (id) =>
      fetchJSON(`${BASE}/${SEASON}/drivers/${id}/results.json?limit=30`),
    pitStops: (r) => fetchJSON(`${BASE}/${SEASON}/${r}/pitstops.json?limit=50`),
    lapTimes: (r, lap) => fetchJSON(`${BASE}/${SEASON}/${r}/laps/${lap}.json`),
    sprint: (r) => fetchJSON(`${BASE}/${SEASON}/${r}/sprint.json`),
    preloadRace: (season, round) => {
      endpoints.raceResults(season, round).catch(() => {});
      endpoints.historicalDriverStandings(season, round).catch(() => {});
      endpoints.historicalConstructorStandings(season, round).catch(() => {});
    },
  };

  return { ...endpoints, SEASON };
})();

/* ═══════════════════════════════════════════════════════════════════
   2. STATE MODULE
   ═══════════════════════════════════════════════════════════════════ */
const AppState = (() => {
  let _state = {
    page: "home",
    season: null,
    round: null,
    id: null,
    archiveScrollY: 0,
  };

  return {
    get: (k) => _state[k],
    getAll: () => ({ ..._state }),
    __unsafe_set: (k, v) => {
      _state[k] = v;
    },
    __unsafe_replace: (newState) => {
      _state = { ..._state, ...newState };
    },
  };
})();

/* ═══════════════════════════════════════════════════════════════════
   3. UTILS MODULE
   ═══════════════════════════════════════════════════════════════════ */
const Utils = (() => {
  function formatDate(dateStr, timeStr) {
    if (!dateStr) return "—";
    const dt = timeStr ? new Date(`${dateStr}T${timeStr}`) : new Date(dateStr);
    return dt.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function formatDateTime(dateStr, timeStr) {
    if (!dateStr || !timeStr) return "—";
    const dt = new Date(`${dateStr}T${timeStr}`);
    return (
      dt.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }) +
      " · " +
      dt.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      })
    );
  }

  function getCountryFlag(country) {
    const flags = {
      Australia: "🇦🇺",
      China: "🇨🇳",
      Japan: "🇯🇵",
      Bahrain: "🇧🇭",
      "Saudi Arabia": "🇸🇦",
      USA: "🇺🇸",
      Italy: "🇮🇹",
      Monaco: "🇲🇨",
      Spain: "🇪🇸",
      Canada: "🇨🇦",
      Austria: "🇦🇹",
      UK: "🇬🇧",
      Belgium: "🇧🇪",
      Hungary: "🇭🇺",
      Netherlands: "🇳🇱",
      Azerbaijan: "🇦🇿",
      Singapore: "🇸🇬",
      Mexico: "🇲🇽",
      Brazil: "🇧🇷",
      Qatar: "🇶🇦",
      UAE: "🇦🇪",
    };
    return flags[country] || "🏁";
  }

  const TEAM_COLORS = {
    red_bull: "#3671C6",
    mercedes: "#27F4D2",
    ferrari: "#E80020",
    mclaren: "#FF8000",
    aston_martin: "#229971",
    alpine: "#0090FF",
    williams: "#005AFF",
    rb: "#6692FF",
    sauber: "#00E701",
    haas: "#B6BABD",
  };

  function getTeamColor(constructorId) {
    return TEAM_COLORS[constructorId] || "#888888";
  }

  function countdown(targetDate) {
    const now = new Date();
    const diff = targetDate - now;
    if (diff <= 0)
      return { days: 0, hours: 0, minutes: 0, seconds: 0, past: true };
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return { days, hours, minutes, seconds, past: false };
  }

  function padTwo(n) {
    return String(n).padStart(2, "0");
  }

  function countUp(el, target, duration = 1200, suffix = "") {
    if (!el) return;
    const start = 0;
    const startTime = performance.now();
    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(start + (target - start) * eased) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function sanitize(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  function el(tag, attrs = {}, children = []) {
    const elem = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "class") elem.className = v;
      else if (k === "style") Object.assign(elem.style, v);
      else if (k.startsWith("on")) elem.addEventListener(k.slice(2), v);
      else elem.setAttribute(k, v);
    });
    children.forEach((c) => {
      if (typeof c === "string") elem.insertAdjacentHTML("beforeend", c);
      else if (c) elem.appendChild(c);
    });
    return elem;
  }

  function q(sel, parent = document) {
    return parent.querySelector(sel);
  }
  function qa(sel, parent = document) {
    return [...parent.querySelectorAll(sel)];
  }

  let _scrollRevealObserver = null;

  function setupScrollReveal() {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("revealed");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    qa(".reveal").forEach((el) => obs.observe(el));
    _scrollRevealObserver = obs;
    return obs;
  }

  function observeNewReveals() {
    if (_scrollRevealObserver) {
      qa(".reveal:not(.revealed)").forEach((el) =>
        _scrollRevealObserver.observe(el),
      );
    }
  }

  return {
    formatDate,
    formatDateTime,
    getCountryFlag,
    getTeamColor,
    countdown,
    padTwo,
    countUp,
    sanitize,
    el,
    q,
    qa,
    setupScrollReveal,
    observeNewReveals,
  };
})();

/* ═══════════════════════════════════════════════════════════════════
   4. ROUTER MODULE
   ═══════════════════════════════════════════════════════════════════ */
const Router = (() => {
  let currentNavId = 0;

  async function navigate(page, data = null, pushState = true) {
    const navId = ++currentNavId;
    const prevPage = AppState.get("page") || "home";

    if (prevPage === "home" && page !== "home") {
      AppState.__unsafe_set("archiveScrollY", window.scrollY);
    }

    if (pushState) {
      AppState.__unsafe_set("page", page);
      if (page === "race-center" && data) {
        AppState.__unsafe_set("season", data.season);
        AppState.__unsafe_set("round", data.round);
      } else if (
        page === "home" ||
        (["standings", "drivers", "teams"].includes(page) && !data)
      ) {
        AppState.__unsafe_set("season", null);
        AppState.__unsafe_set("round", null);
      }

      if ((page === "drivers" || page === "teams") && data) {
        AppState.__unsafe_set("id", data);
      } else {
        AppState.__unsafe_set("id", null);
      }
    }

    if (
      page === "race-center" &&
      (!AppState.get("season") || !AppState.get("round"))
    ) {
      try {
        const lastRace = await API.lastRace();
        if (navId !== currentNavId) return;
        AppState.__unsafe_set("season", lastRace.MRData.RaceTable.season);
        AppState.__unsafe_set(
          "round",
          lastRace.MRData.RaceTable.Races[0].round,
        );
      } catch (e) {
        AppState.__unsafe_set("season", API.SEASON);
        AppState.__unsafe_set("round", 1);
      }
    }

    if (navId !== currentNavId) return;

    if (pushState) {
      const url = new URL(window.location);
      url.search = "";
      url.searchParams.set("page", page);
      if (AppState.get("season"))
        url.searchParams.set("season", AppState.get("season"));
      if (AppState.get("round"))
        url.searchParams.set("round", AppState.get("round"));
      if (AppState.get("id")) url.searchParams.set("id", AppState.get("id"));

      history.pushState(AppState.getAll(), "", url);
    }

    Utils.qa(".nav-link").forEach((l) =>
      l.classList.toggle("active", l.dataset.page === page),
    );
    Utils.qa(".bottom-nav-item").forEach((l) =>
      l.classList.toggle("active", l.dataset.page === page),
    );
    Utils.qa(".mobile-nav-link").forEach((l) =>
      l.classList.toggle("active", l.dataset.page === page),
    );

    Utils.qa(".page").forEach((p) =>
      p.classList.toggle("active", p.id === `page-${page}`),
    );

    const activePage = Utils.q(`#page-${page}`);
    if (activePage) {
      activePage.classList.remove("page-transition-enter");
      void activePage.offsetWidth;
      activePage.classList.add("page-transition-enter");
    }

    if (page === "home") {
      window.Cinematic3D?.resume();
    } else {
      window.Cinematic3D?.pause();
    }

    await Pages.render(navId);

    if (navId !== currentNavId) return;

    if (page === "home") {
      window.scrollTo(0, AppState.get("archiveScrollY") || 0);
    } else {
      window.scrollTo(0, 0);
    }
  }

  window.addEventListener("popstate", (e) => {
    if (e.state) {
      AppState.__unsafe_replace(e.state);
      navigate(AppState.get("page"), null, false);
    } else {
      const params = new URLSearchParams(window.location.search);
      const page = params.get("page") || "home";
      navigate(page, null, false);
    }
  });

  return { navigate, getCurrentNavId: () => currentNavId };
})();

/* ═══════════════════════════════════════════════════════════════════
   5. PAGES MODULE
   ═══════════════════════════════════════════════════════════════════ */
const Pages = (() => {
  async function render(navId) {
    const state = AppState.getAll();
    if (state.page === "home") await renderHome(state, navId);
    else if (state.page === "race-center") await renderRaceCenter(state, navId);
    else if (state.page === "standings") await renderStandings(state, navId);
    else if (state.page === "drivers") {
      if (state.id) await renderDriverProfile(state, navId);
      else await renderDrivers(state, navId);
    } else if (state.page === "teams") {
      if (state.id) await renderConstructorProfile(state, navId);
      else await renderTeams(state, navId);
    }
  }

  // ── HOME ────────────────────────────────────────────────────────
  async function renderHome(state, navId) {
    const container = Utils.q("#page-home");
    if (!container) return;

    container.innerHTML = `
      <div class="container archive-layout">
        <header class="archive-intro"><div class="archive-kicker">THE RACE WEEKEND, IN FOCUS</div><h1>GRAND PRIX<br><span>ARCHIVE</span><span class="title-period">.</span></h1><div class="archive-intro-bottom"><p>Every round. Every result.</p></div></header>
        <div class="archive-seasons">
        <div id="archive-2026-wrap"><p class="archive-loading" role="status">Loading 2026 season…</p></div>
        <div id="archive-2025-wrap"><p class="archive-loading" role="status">Loading 2025 season…</p></div>
        </div>
      </div>
    `;

    try {
      const [sched26, sched25, win26, win25] = await Promise.all([
        API.schedule2026().catch(() => null),
        API.schedule().catch(() => null),
        API.winners(2026).catch(() => null),
        API.winners(2025).catch(() => null),
      ]);

      if (navId && navId !== Router.getCurrentNavId()) return;

      const races26 = sched26 ? sched26.MRData.RaceTable.Races : [];
      const races25 = sched25 ? sched25.MRData.RaceTable.Races : [];

      const mapWinners = (races, wins) => {
        const winMap = {};
        if (wins && wins.MRData.RaceTable.Races) {
          wins.MRData.RaceTable.Races.forEach((r) => {
            if (r.Results && r.Results.length > 0) {
              winMap[r.round] = r.Results[0];
            }
          });
        }
        return races.map((r) => ({ ...r, Winner: winMap[r.round] || null }));
      };

      const mapped26 = mapWinners(races26, win26).reverse();
      const mapped25 = mapWinners(races25, win25).reverse();

      renderArchiveSeason(
        Utils.q("#archive-2026-wrap"),
        "2026 Season",
        2026,
        mapped26,
      );
      renderArchiveSeason(
        Utils.q("#archive-2025-wrap"),
        "2025 Season",
        2025,
        mapped25,
      );
    } catch (err) {
      console.error("Archive load error:", err);
      container.innerHTML += `<div class="error-state" style="margin-top: 40px;"><div class="error-icon">⚡</div><div class="error-title">Could not load archive</div><div class="error-sub">${err.message}</div></div>`;
    }
  }

  function renderArchiveSeason(wrap, title, season, races) {
    if (!wrap) return;
    if (!races || races.length === 0) {
      wrap.innerHTML = `<div class="archive-season-title"><h2>${season}</h2></div><p class="archive-loading" role="status">This season’s archive is currently unavailable. Please try again later.</p>`;
      return;
    }

    wrap.innerHTML = `
      <div class="archive-season-title"><h2>${season}</h2><span>SEASON ARCHIVE</span><span>${String(races.length).padStart(2, "0")} ROUNDS</span></div>
      <div class="archive-grid">
        ${races
          .map((r) => {
            const country = r.Circuit.Location.country;
            let winnerHtml = ``;
            let statusBadge = ``;
            const now = new Date();
            const isCompleted = new Date(`${r.date}T${r.time}`) < now;

            if (isCompleted) {
              statusBadge = `<div style="font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">● Completed</div>`;
              if (r.Winner) {
                winnerHtml = `
                 <div class="archive-card-winner">
                   <div class="archive-card-winner-label">Winner</div>
                   <div class="archive-card-winner-name">${r.Winner.Driver.givenName} ${r.Winner.Driver.familyName}</div>
                 </div>
                 <div class="archive-card-divider"></div>
               `;
              }
            } else {
              statusBadge = `<div style="font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">○ Upcoming</div>`;
            }

            return `
            <div class="archive-card" data-season="${season}" data-round="${r.round}" role="link" tabindex="0" aria-label="${Utils.sanitize(r.raceName)} — ${season}, round ${r.round}" onclick="Router.navigate('race-center', {season: ${season}, round: ${r.round}})">
              <div class="archive-card-inner">
                <div class="archive-card-header"><div class="archive-round" aria-hidden="true">${Utils.padTwo(r.round)}</div>
                  ${statusBadge}
                  <div class="archive-card-location"><span class="archive-card-flag">${Utils.getCountryFlag(country)}</span>${Utils.sanitize(r.Circuit.Location.locality || country)}</div>
                  <div class="archive-card-title">${r.raceName}</div>
                  <div class="archive-card-meta">${r.Circuit.circuitName}</div>
                  <div class="archive-card-meta" style="margin-top: 8px;">${Utils.formatDate(r.date)}</div>
                  <div class="archive-card-meta">Round ${r.round}</div>
                </div>
                ${winnerHtml ? '<div class="archive-card-divider" style="margin-top: auto;"></div>' + winnerHtml : '<div style="margin-top:auto;"></div>'}
                <div class="archive-card-footer">
                  View Race <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </div>
              </div>
            </div>
          `;
          })
          .join("")}
      </div>
    `;
  }

  // ── RACE CENTER ──────────────────────────────────────────────────
  async function renderRaceCenter(state, navId) {
    const container = Utils.q("#page-race-center");
    if (!container) return;

    const season = state.season;
    const round = state.round;

    if (!season || !round) return;

    let raceName = "Grand Prix";
    try {
      const schedMethod = season == 2026 ? API.schedule2026 : API.schedule;
      const sched = await schedMethod();
      if (sched && sched.MRData.RaceTable.Races) {
        const r = sched.MRData.RaceTable.Races.find(
          (x) => String(x.round) === String(round),
        );
        if (r) raceName = r.raceName;
      }
    } catch (e) {}

    container.innerHTML = `
      <div id="race-center-content" class="container" style="padding-top:48px;padding-bottom:80px">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:3rem;font-weight:900;text-transform:uppercase;color:var(--text-primary);margin-bottom:16px">${raceName}</div>
        <div style="color:var(--text-secondary);margin-bottom:32px">Loading race data...</div>
        <div class="skeleton skeleton-card" style="height:400px;margin-bottom:60px"></div>
        <div class="skeleton skeleton-card" style="height:300px"></div>
      </div>`;

    await new Promise((resolve) => requestAnimationFrame(resolve));
    await loadRaceDetails(season, round, navId);
  }

  async function loadRaceDetails(season, round, navId) {
    const content = Utils.q("#race-center-content");
    if (!content) return;

    try {
      const schedMethod =
        Number(season) === 2026 ? API.schedule2026 : API.schedule;
      const [
        resultsData,
        driverStandingsData,
        constructorStandingsData,
        schedData,
      ] = await Promise.all([
        API.raceResults(season, round),
        API.historicalDriverStandings(season, round).catch(() => null),
        API.historicalConstructorStandings(season, round).catch(() => null),
        schedMethod().catch(() => null),
      ]);

      if (navId && navId !== Router.getCurrentNavId()) return;

      const race = resultsData.MRData.RaceTable.Races[0];
      if (!race) {
        content.innerHTML = `
          <div class="editorial-back" onclick="Router.navigate('home')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Grand Prix Archive
          </div>
          <div class="error-state"><div class="error-icon">🏎️</div><div class="error-title">Race data not yet available</div></div>
        `;
        return;
      }

      const results = race.Results || [];
      const ds = driverStandingsData
        ? driverStandingsData.MRData.StandingsTable.StandingsLists[0]
            ?.DriverStandings || []
        : [];
      const cs = constructorStandingsData
        ? constructorStandingsData.MRData.StandingsTable.StandingsLists[0]
            ?.ConstructorStandings || []
        : [];

      let prevGP = null,
        nextGP = null;
      if (schedData && schedData.MRData.RaceTable.Races) {
        const racesList = schedData.MRData.RaceTable.Races;
        const idx = racesList.findIndex(
          (r) => parseInt(r.round) === parseInt(round),
        );
        if (idx > 0) prevGP = racesList[idx - 1];
        if (idx < racesList.length - 1) nextGP = racesList[idx + 1];
      }

      content.innerHTML = `
        <div class="editorial-back" onclick="Router.navigate('home')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Grand Prix Archive
        </div>

        <div class="editorial-section race-identity">
          <div style="font-size:1rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:12px">Round ${race.round} · ${race.season} Season</div>
          <h2 style="font-family:'Barlow Condensed',sans-serif;font-size:clamp(3rem,8vw,5rem);font-weight:900;text-transform:uppercase;letter-spacing:-.02em;line-height:.9;color:var(--text-primary)">${race.raceName}</h2>
          <div style="font-size:1.25rem;color:var(--text-secondary);margin-top:16px">${Utils.getCountryFlag(race.Circuit.Location.country)} ${race.Circuit.circuitName} · ${Utils.formatDate(race.date)}</div>
          ${race.Sprint ? `<div style="margin-top:20px"><span class="badge badge-yellow">Sprint Weekend</span></div>` : ""}
        </div>
        <div class="race-podium" aria-label="Race podium">
          ${results
            .slice(0, 3)
            .map(
              (r) =>
                `<div class="race-podium-item"><span class="race-podium-pos">P${r.position}</span><div><span class="race-podium-label">${r.position === "1" ? "RACE WINNER" : Utils.sanitize(r.Constructor.name)}</span><strong>${Utils.sanitize(r.Driver.givenName)} ${Utils.sanitize(r.Driver.familyName)}</strong></div><span class="race-podium-points">${r.points}<small>PTS</small></span></div>`,
            )
            .join("")}
        </div>

        <div class="editorial-section reveal">
          <div class="editorial-section-title">Highlights</div>
          ${renderHighlightsInline(race)}
        </div>

        <div class="editorial-section reveal">
          <div class="editorial-section-title">Results</div>
          ${renderClassificationTable(results)}
        </div>

        <div class="editorial-section reveal">
          <div class="editorial-section-title">Driver Championship</div>
          <div id="driver-standings-preview" style="background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:var(--radius-lg);overflow:hidden;margin-bottom:32px;"></div>
        </div>

        <div class="editorial-section reveal">
          <div class="editorial-section-title">Constructor Championship</div>
          <div id="constructor-standings-preview" style="background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:var(--radius-lg);overflow:hidden;margin-bottom:32px;"></div>
        </div>

        <div class="editorial-section reveal race-pagination" style="display:flex; justify-content:space-between; margin-top: 64px; border-top: 1px solid var(--border-subtle); padding-top: 32px;">
           ${
             prevGP
               ? `
             <div class="editorial-back" onclick="Router.navigate('race-center', {season: ${season}, round: ${prevGP.round}})" style="margin-bottom:0;">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
               ${prevGP.raceName.replace(" Grand Prix", " GP")}
             </div>
           `
               : "<div></div>"
           }
           ${
             nextGP
               ? `
             <div class="editorial-back" onclick="Router.navigate('race-center', {season: ${season}, round: ${nextGP.round}})" style="margin-bottom:0; flex-direction: row-reverse;">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
               ${nextGP.raceName.replace(" Grand Prix", " GP")}
             </div>
           `
               : "<div></div>"
           }
        </div>
      `;

      if (ds.length) renderDriverStandingsPreview(ds);
      if (cs.length) renderConstructorStandingsPreview(cs);

      Utils.setupScrollReveal();

      if (prevGP) API.preloadRace(season, prevGP.round);
      if (nextGP) API.preloadRace(season, nextGP.round);
    } catch (err) {
      console.error("Race details error:", err);
      content.innerHTML = `
        <div class="editorial-back" onclick="Router.navigate('home')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Grand Prix Archive
        </div>
        <div class="error-state"><div class="error-icon">⚡</div><div class="error-title">Could not load race details</div><div class="error-sub">${err.message}</div></div>
      `;
    }
  }

  function renderClassificationTable(results) {
    if (!results || results.length === 0)
      return '<div class="error-state">No results available</div>';
    return `
      <div style="background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:var(--radius-lg);overflow:hidden">
        <div style="overflow-x:auto">
          <table class="results-table">
            <thead>
              <tr>
                <th>Pos</th>
                <th>Driver</th>
                <th>Team</th>
                <th>Laps</th>
                <th>Time/Reason</th>
                <th>Pts</th>
              </tr>
            </thead>
            <tbody>
              ${results
                .map((r) => {
                  const color = Utils.getTeamColor(r.Constructor.constructorId);
                  const pos = parseInt(r.position);
                  const isDNF =
                    r.status !== "Finished" && !r.status.includes("Lapped");
                  const posClass =
                    pos === 1 ? "p1" : pos === 2 ? "p2" : pos === 3 ? "p3" : "";
                  return `
                <tr onclick="Router.navigate('drivers', '${r.Driver.driverId}')" style="cursor:pointer">
                  <td><div class="result-pos ${posClass}">${r.positionText}</div></td>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px">
                      <div style="width:3px;height:24px;border-radius:2px;background:${color};flex-shrink:0"></div>
                      <div>
                        <div class="result-driver-name">${r.Driver.givenName} ${r.Driver.familyName}</div>
                        <div class="result-driver-code">${r.Driver.code || ""}</div>
                      </div>
                    </div>
                  </td>
                  <td style="color:var(--text-secondary);font-size:.875rem">${r.Constructor.name}</td>
                  <td style="color:var(--text-secondary);font-size:.875rem">${r.laps}</td>
                  <td class="result-time ${isDNF ? "result-dnf" : ""}">${r.Time ? r.Time.time : r.status}</td>
                  <td class="result-points">${r.points > 0 ? r.points : "—"}</td>
                </tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderHighlightsInline(race) {
    const highlight =
      typeof getHighlight === "function"
        ? getHighlight(race.season, race.round)
        : null;

    if (!highlight) {
      return `<div class="error-state"><div class="error-title">No highlights available</div></div>`;
    }

    return `
      <div class="highlights-card" style="margin-bottom:32px">
        <div style="padding:20px 24px;border-bottom:1px solid var(--border-subtle)">
          <div style="font-weight:700;font-size:1rem">Official Highlights</div>
        </div>
        <div class="highlights-grid">
          <div onclick="window.open('${highlight}', '_blank')" class="highlight-item" style="cursor:pointer" tabindex="0" role="button">
            <div class="highlight-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
              </svg>
            </div>
            <div class="highlight-text">
              <div class="highlight-type">Watch Official Race Highlights</div>
              <div class="highlight-title">YouTube</div>
            </div>
            <svg class="highlight-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </div>
        </div>
      </div>`;
  }

  function renderDriverStandingsPreview(standings) {
    const wrap = Utils.q("#driver-standings-preview");
    if (!wrap) return;
    wrap.innerHTML = `
      <table class="standings-table">
        <thead>
          <tr>
            <th>Pos</th><th>Driver</th><th class="right">Pts</th><th class="right">Wins</th>
          </tr>
        </thead>
        <tbody>
          ${standings
            .map((s) => {
              const color = Utils.getTeamColor(s.Constructors[0].constructorId);
              return `
            <tr class="standings-row" onclick="Router.navigate('drivers', '${s.Driver.driverId}')">
              <td class="standings-pos ${s.position === "1" ? "leader" : ""}">${s.position}</td>
              <td>
                <div class="driver-cell">
                  <div class="team-dot" style="background:${color}"></div>
                  <div class="driver-code">${s.Driver.code || s.Driver.familyName.slice(0, 3).toUpperCase()}</div>
                  <div class="driver-info">
                    <div class="driver-name">${s.Driver.givenName} ${s.Driver.familyName}</div>
                    <div class="driver-team">${s.Constructors[0].name}</div>
                  </div>
                </div>
              </td>
              <td class="standings-points">${s.points}</td>
              <td class="standings-wins">${s.wins}</td>
            </tr>`;
            })
            .join("")}
        </tbody>
      </table>`;
  }

  function renderConstructorStandingsPreview(standings) {
    const wrap = Utils.q("#constructor-standings-preview");
    if (!wrap) return;
    const maxPts = parseInt(standings[0].points);
    wrap.innerHTML = standings
      .map((s) => {
        const color = Utils.getTeamColor(s.Constructor.constructorId);
        const pct = ((parseInt(s.points) / maxPts) * 100).toFixed(1);
        return `
        <div class="constructor-row" onclick="Router.navigate('teams', '${s.Constructor.constructorId}')">
          <div class="constructor-pos">${s.position}</div>
          <div class="constructor-color-bar" style="background:${color}"></div>
          <div class="constructor-info">
            <div class="constructor-name">${s.Constructor.name}</div>
          </div>
          <div class="constructor-bar-wrap">
            <div class="constructor-bar-bg">
              <div class="constructor-bar-fill" style="background:${color};width:${pct}%"></div>
            </div>
          </div>
          <div class="constructor-points">${s.points}</div>
        </div>`;
      })
      .join("");
    // Animate bars after render
    requestAnimationFrame(() => {
      Utils.qa(".constructor-bar-fill").forEach((b) => {
        const w = b.style.width;
        b.style.width = "0%";
        setTimeout(() => {
          b.style.width = w;
        }, 50);
      });
    });
  }

  // ── STANDINGS ────────────────────────────────────────────────────
  async function renderStandings(state, navId) {
    const container = Utils.q("#page-standings");
    if (!container) return;

    // Initial skeleton
    container.innerHTML = `
      <div class="container">
        <div class="section">
          <div class="section-header">
            <div class="section-label">2025 Season</div>
            <h1 class="section-title">Championship Standings</h1>
          </div>

          <div class="tab-bar" style="margin-bottom:32px">
            <div class="tab-btn active" id="tab-drivers" onclick="switchTab('drivers')">Drivers</div>
            <div class="tab-btn" id="tab-constructors" onclick="switchTab('constructors')">Constructors</div>
          </div>

          <div id="tab-content-drivers" class="tab-content active" style="background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:var(--radius-lg);overflow:hidden">
            <div class="skeleton skeleton-card" style="height:600px"></div>
          </div>
          <div id="tab-content-constructors" class="tab-content" style="background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:var(--radius-lg);overflow:hidden">
            <div class="skeleton skeleton-card" style="height:400px"></div>
          </div>
        </div>
      </div>`;

    window.switchTab = (tab) => {
      Utils.qa(".tab-btn").forEach((b) =>
        b.classList.toggle("active", b.id === `tab-${tab}`),
      );
      Utils.qa(".tab-content").forEach((c) =>
        c.classList.toggle("active", c.id === `tab-content-${tab}`),
      );
    };

    try {
      let driverStandingsData, constructorStandingsData;

      if (state.season && state.round) {
        [driverStandingsData, constructorStandingsData] = await Promise.all([
          API.historicalDriverStandings(state.season, state.round).catch(
            () => null,
          ),
          API.historicalConstructorStandings(state.season, state.round).catch(
            () => null,
          ),
        ]);
      } else {
        [driverStandingsData, constructorStandingsData] = await Promise.all([
          API.driverStandings().catch(() => null),
          API.constructorStandings().catch(() => null),
        ]);
      }

      if (navId && navId !== Router.getCurrentNavId()) return;

      if (!driverStandingsData || !constructorStandingsData) return;

      const ds =
        driverStandingsData.MRData.StandingsTable.StandingsLists[0]
          ?.DriverStandings || [];
      const cs =
        constructorStandingsData.MRData.StandingsTable.StandingsLists[0]
          ?.ConstructorStandings || [];
      if (ds.length === 0 || cs.length === 0) return;

      const leaderPts = parseInt(ds[0].points);

      Utils.q("#tab-content-drivers").innerHTML = `
        <div style="overflow-x:auto">
          <table class="standings-table">
            <thead>
              <tr>
                <th>Pos</th><th>Driver</th><th class="right">Pts</th><th class="right">Wins</th><th class="right">Gap</th>
              </tr>
            </thead>
            <tbody>
              ${ds
                .map((s) => {
                  const color = Utils.getTeamColor(
                    s.Constructors[0].constructorId,
                  );
                  const gap =
                    parseInt(s.points) === leaderPts
                      ? "—"
                      : `-${leaderPts - parseInt(s.points)}`;
                  return `
                <tr class="standings-row" onclick="Router.navigate('drivers', '${s.Driver.driverId}')">
                  <td class="standings-pos ${s.position === "1" ? "leader" : ""}">${s.position}</td>
                  <td>
                    <div class="driver-cell">
                      <div class="team-dot" style="background:${color}"></div>
                      <div class="driver-code">${s.Driver.code || s.Driver.familyName.slice(0, 3).toUpperCase()}</div>
                      <div class="driver-info">
                        <div class="driver-name">${s.Driver.givenName} ${s.Driver.familyName}</div>
                        <div class="driver-team">${s.Constructors[0].name}</div>
                      </div>
                    </div>
                  </td>
                  <td class="standings-points">${s.points}</td>
                  <td class="standings-wins">${s.wins}</td>
                  <td class="standings-gap">${gap}</td>
                </tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </div>`;

      const csMaxPts = parseInt(cs[0].points);
      Utils.q("#tab-content-constructors").innerHTML = cs
        .map((s) => {
          const color = Utils.getTeamColor(s.Constructor.constructorId);
          const pct = ((parseInt(s.points) / csMaxPts) * 100).toFixed(1);
          return `
          <div class="constructor-row" onclick="Router.navigate('teams', '${s.Constructor.constructorId}')">
            <div class="constructor-pos">${s.position}</div>
            <div class="constructor-color-bar" style="background:${color}"></div>
            <div class="constructor-info">
              <div class="constructor-name">${s.Constructor.name}</div>
            </div>
            <div class="constructor-bar-wrap">
              <div class="constructor-bar-bg">
                <div class="constructor-bar-fill" style="background:${color};width:${pct}%"></div>
              </div>
              <div style="font-size:.7rem;color:var(--text-tertiary)">${s.wins} wins</div>
            </div>
            <div class="constructor-points">${s.points}</div>
          </div>`;
        })
        .join("");

      requestAnimationFrame(() => {
        Utils.qa(".constructor-bar-fill").forEach((b) => {
          const w = b.style.width;
          b.style.width = "0%";
          setTimeout(() => {
            b.style.width = w;
          }, 100);
        });
      });
    } catch (err) {
      console.error("Standings error:", err);
    }
    Utils.setupScrollReveal();
  }

  // ── DRIVERS ──────────────────────────────────────────────────────
  async function renderDrivers(state, navId) {
    const container = Utils.q("#page-drivers");
    if (!container) return;
    container.innerHTML = `
      <div class="container">
        <div class="section">
          <div class="section-header">
            <div class="section-label">2025 Grid</div>
            <h1 class="section-title">Drivers</h1>
          </div>
          <div class="drivers-grid" id="drivers-grid">
            ${Array(20).fill('<div class="skeleton skeleton-card" style="height:200px"></div>').join("")}
          </div>
        </div>
      </div>`;

    try {
      let driverStandingsData;
      if (state.season && state.round) {
        driverStandingsData = await API.historicalDriverStandings(
          state.season,
          state.round,
        ).catch(() => null);
      } else {
        driverStandingsData = await API.driverStandings().catch(() => null);
      }

      if (navId && navId !== Router.getCurrentNavId()) return;
      if (!driverStandingsData) return;

      const ds =
        driverStandingsData.MRData.StandingsTable.StandingsLists[0]
          ?.DriverStandings || [];
      if (ds.length === 0) return;

      Utils.q("#drivers-grid").innerHTML = ds
        .map((s, i) => {
          const color = Utils.getTeamColor(s.Constructors[0].constructorId);
          return `
          <div class="driver-card reveal reveal-delay-${Math.min(i, 4)}" onclick="Router.navigate('drivers', '${s.Driver.driverId}')">
            <div class="driver-card-accent" style="background:${color}"></div>
            <div class="driver-card-body">
              <div class="driver-card-number">${s.Driver.permanentNumber || "—"}</div>
              <div class="driver-card-name">${s.Driver.givenName} ${s.Driver.familyName}</div>
              <div class="driver-card-nationality">${s.Driver.nationality}</div>
              <div class="driver-card-team" style="color:${color}">${s.Constructors[0].name}</div>
              <div class="driver-card-stats">
                <div class="driver-card-stat">
                  <span class="driver-stat-val">${s.points}</span>
                  <span class="driver-stat-lbl">Points</span>
                </div>
                <div class="driver-card-stat">
                  <span class="driver-stat-val">${s.wins}</span>
                  <span class="driver-stat-lbl">Wins</span>
                </div>
                <div class="driver-card-stat">
                  <span class="driver-stat-val">P${s.position}</span>
                  <span class="driver-stat-lbl">Standing</span>
                </div>
              </div>
            </div>
          </div>`;
        })
        .join("");
    } catch (err) {
      Utils.q("#drivers-grid").innerHTML =
        `<div class="error-state"><div class="error-title">Could not load drivers</div></div>`;
    }
    Utils.setupScrollReveal();
  }

  async function renderDriverProfile(state, navId) {
    const driverId = state.id;
    const container = Utils.q("#page-drivers");
    if (!container) return;

    container.innerHTML = `
      <div class="profile-hero">
        <div style="max-width:var(--content-max);margin:0 auto;padding:48px var(--side-pad) 0">
          <div class="profile-back-btn" onclick="Router.navigate('drivers')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            All Drivers
          </div>
          <div id="profile-loading"><div class="skeleton skeleton-title" style="width:40%;height:48px;margin-bottom:12px"></div></div>
        </div>
      </div>
      <div class="container" style="padding-top:32px">
        <div id="profile-content"></div>
      </div>`;

    try {
      let driverStandingsData;
      if (state.season && state.round) {
        driverStandingsData = await API.historicalDriverStandings(
          state.season,
          state.round,
        ).catch(() => null);
      } else {
        driverStandingsData = await API.driverStandings().catch(() => null);
      }

      if (navId && navId !== Router.getCurrentNavId()) return;
      if (!driverStandingsData) throw new Error("Standings data not found");

      const ds =
        driverStandingsData.MRData.StandingsTable.StandingsLists[0]
          ?.DriverStandings || [];
      const standing = ds.find((s) => s.Driver.driverId === driverId);
      if (!standing) throw new Error("Driver not found");

      const driver = standing.Driver;
      const constructor = standing.Constructors[0];
      const color = Utils.getTeamColor(constructor.constructorId);

      Utils.q(".profile-hero").innerHTML = `
        <div style="max-width:var(--content-max);margin:0 auto;padding:48px var(--side-pad) 0;position:relative">
          <div class="profile-number-bg">${driver.permanentNumber || ""}</div>
          <div class="profile-back-btn" onclick="Router.navigate('drivers')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            All Drivers
          </div>
          <div class="profile-meta">
            <div class="profile-flag-code">${driver.nationality} · #${driver.permanentNumber}</div>
            <div class="profile-name">${driver.givenName}<br>${driver.familyName}</div>
            <div class="profile-team-badge">
              <div style="width:8px;height:8px;border-radius:50%;background:${color}"></div>
              ${constructor.name}
            </div>
            <div class="profile-stats-strip">
              <div class="profile-stat-item">
                <div class="profile-stat-val">${standing.points}</div>
                <div class="profile-stat-lbl">2025 Pts</div>
              </div>
              <div class="profile-stat-item">
                <div class="profile-stat-val">${standing.wins}</div>
                <div class="profile-stat-lbl">2025 Wins</div>
              </div>
              <div class="profile-stat-item">
                <div class="profile-stat-val">P${standing.position}</div>
                <div class="profile-stat-lbl">Standing</div>
              </div>
              <div class="profile-stat-item">
                <div class="profile-stat-val">${driver.dateOfBirth}</div>
                <div class="profile-stat-lbl">Date of Birth</div>
              </div>
            </div>
          </div>
        </div>`;

      Utils.q("#profile-content").innerHTML = ``; // Bio removed as requested
    } catch (err) {
      console.error("Driver profile error:", err);
    }
    Utils.setupScrollReveal();
  }

  // ── TEAMS ────────────────────────────────────────────────────────
  async function renderTeams(state, navId) {
    const container = Utils.q("#page-teams");
    if (!container) return;

    try {
      let constructorStandingsData;
      if (state.season && state.round) {
        constructorStandingsData = await API.historicalConstructorStandings(
          state.season,
          state.round,
        ).catch(() => null);
      } else {
        constructorStandingsData = await API.constructorStandings().catch(
          () => null,
        );
      }

      if (navId && navId !== Router.getCurrentNavId()) return;
      if (!constructorStandingsData) return;

      const cs =
        constructorStandingsData.MRData.StandingsTable.StandingsLists[0]
          ?.ConstructorStandings || [];

      container.innerHTML = `
      <div class="container">
        <div class="section">
          <div class="section-header">
            <div class="section-label">2025 Season</div>
            <h1 class="section-title">Teams</h1>
          </div>
          <div class="teams-grid">
            ${cs
              .map((s, i) => {
                const color = Utils.getTeamColor(s.Constructor.constructorId);
                return `
              <div class="card reveal reveal-delay-${Math.min(i, 3)}" style="cursor:pointer" onclick="Router.navigate('teams', '${s.Constructor.constructorId}')">
                <div style="height:4px;background:${color}"></div>
                <div class="card-body">
                  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px">
                    <div>
                      <div style="font-size:.75rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:4px">P${s.position} Constructor</div>
                      <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.5rem;font-weight:800;color:var(--text-primary)">${s.Constructor.name}</div>
                    </div>
                    <div style="font-family:'Barlow Condensed',sans-serif;font-size:2rem;font-weight:900;color:var(--text-primary)">${s.points}<div style="font-size:.625rem;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--text-tertiary);margin-top:-4px">Points</div></div>
                  </div>
                  <div style="display:flex;align-items:center;justify-content:space-between;padding-top:16px;border-top:1px solid var(--border-subtle)">
                    <span style="font-size:.75rem;color:${color};font-weight:600">${s.wins} wins →</span>
                  </div>
                </div>
              </div>`;
              })
              .join("")}
          </div>
        </div>
      </div>`;
    } catch (err) {
      console.error(err);
    }
    Utils.setupScrollReveal();
  }

  async function renderConstructorProfile(state, navId) {
    const constructorId = state.id;
    const container = Utils.q("#page-teams");
    const color = Utils.getTeamColor(constructorId);

    let cs = null;
    try {
      let constructorStandingsData;
      if (state.season && state.round) {
        constructorStandingsData = await API.historicalConstructorStandings(
          state.season,
          state.round,
        ).catch(() => null);
      } else {
        constructorStandingsData = await API.constructorStandings().catch(
          () => null,
        );
      }

      if (navId && navId !== Router.getCurrentNavId()) return;

      if (constructorStandingsData) {
        const standingsList =
          constructorStandingsData.MRData.StandingsTable.StandingsLists[0]
            ?.ConstructorStandings || [];
        cs = standingsList.find(
          (s) => s.Constructor.constructorId === constructorId,
        );
      }
    } catch (e) {}

    container.innerHTML = `
      <div style="background:var(--bg-void);padding:60px var(--side-pad) 0;border-bottom:1px solid var(--border-subtle);position:relative;overflow:hidden">
        <div style="height:4px;background:${color};position:absolute;top:0;left:0;right:0"></div>
        <div style="max-width:var(--content-max);margin:0 auto">
          <div class="profile-back-btn" onclick="Router.navigate('teams')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            All Teams
          </div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:clamp(2.5rem,6vw,5rem);font-weight:900;text-transform:uppercase;letter-spacing:-.02em;line-height:.9;margin-bottom:24px;color:var(--text-primary)">${cs ? cs.Constructor.name : constructorId}</div>
          <div class="profile-stats-strip" style="margin-bottom:48px">
            ${cs ? `<div class="profile-stat-item"><div class="profile-stat-val">P${cs.position}</div><div class="profile-stat-lbl">Standing</div></div>` : ""}
            ${cs ? `<div class="profile-stat-item"><div class="profile-stat-val">${cs.points}</div><div class="profile-stat-lbl">Points</div></div>` : ""}
            ${cs ? `<div class="profile-stat-item"><div class="profile-stat-val">${cs.wins}</div><div class="profile-stat-lbl">Wins</div></div>` : ""}
          </div>
        </div>
      </div>
      <div class="container" style="padding-top:40px;padding-bottom:80px">
        <!-- Team data simplified as requested -->
      </div>`;
    Utils.setupScrollReveal();
  }

  // ── CIRCUITS ─────────────────────────────────────────────────────
  return { render };
})();

/* ═══════════════════════════════════════════════════════════════════
   7. APP BOOTSTRAP
   ═══════════════════════════════════════════════════════════════════ */
function initApp() {
  // Navigation setup
  Utils.qa(".nav-link").forEach((link) => {
    link.addEventListener("click", () => Router.navigate(link.dataset.page));
  });
  Utils.qa(".bottom-nav-item").forEach((item) => {
    item.addEventListener("click", () => Router.navigate(item.dataset.page));
  });
  Utils.qa(".mobile-nav-link").forEach((link) => {
    link.addEventListener("click", () => Router.navigate(link.dataset.page));
  });

  // Logo click
  Utils.qa(".nav-logo").forEach((l) =>
    l.addEventListener("click", () => Router.navigate("home")),
  );

  // Hamburger
  const hamburger = Utils.q(".hamburger");
  const mobileMenu = Utils.q("#mobile-menu");
  if (hamburger && mobileMenu) {
    hamburger.addEventListener("click", () => {
      mobileMenu.classList.toggle("open");
    });
  }

  // Nav scroll effect
  const nav = Utils.q("#nav");
  window.addEventListener(
    "scroll",
    () => {
      if (nav) nav.classList.toggle("scrolled", window.scrollY > 40);
    },
    { passive: true },
  );

  // Render initial page
  (async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const requested = params.get("page") || "home";
      const page = [
        "home",
        "race-center",
        "standings",
        "drivers",
        "teams",
      ].includes(requested)
        ? requested
        : "home";
      AppState.__unsafe_replace({
        page,
        season: params.has("season") ? Number(params.get("season")) : null,
        round: params.has("round") ? Number(params.get("round")) : null,
        id: params.get("id"),
      });
      await Router.navigate(page, null, false);
      history.replaceState(AppState.getAll(), "", window.location.href);
    } catch (err) {
      console.error("Fatal startup error during navigation:", err);
      const content = Utils.q("#page-home");
      if (content)
        content.innerHTML = `<div class="error-state" style="margin-top:100px;"><div class="error-icon">⚡</div><div class="error-title">Application Error</div><div class="error-sub">${err.message}</div></div>`;
    }
  })();
}

// Start
try {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }
} catch (e) {
  console.error("Critical initialization failure:", e);
  const loader = document.getElementById("page-loader");
  if (loader) loader.classList.add("hidden");
}

/* Additive interaction layer. Routing, data and click handlers remain app-owned. */
(() => {
  "use strict";
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const pointer = matchMedia("(hover: hover) and (pointer: fine)");
  let card = null,
    frame = 0,
    lastEvent = null;
  const reset = () => {
    if (card)
      for (const p of ["--tilt-x", "--tilt-y", "--light-x", "--light-y"])
        card.style.removeProperty(p);
    card = null;
  };
  document.addEventListener(
    "pointermove",
    (e) => {
      if (motion.matches || !pointer.matches) return;
      const next = e.target.closest(".archive-card");
      if (next !== card) {
        reset();
        card = next;
      }
      if (!card) return;
      lastEvent = { x: e.clientX, y: e.clientY };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!card || motion.matches) return;
        const r = card.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (lastEvent.x - r.left) / r.width));
        const y = Math.max(0, Math.min(1, (lastEvent.y - r.top) / r.height));
        card.style.setProperty("--tilt-x", `${(0.5 - y) * 5}deg`);
        card.style.setProperty("--tilt-y", `${(x - 0.5) * 5}deg`);
        card.style.setProperty("--light-x", `${x * 100}%`);
        card.style.setProperty("--light-y", `${y * 100}%`);
      });
    },
    { passive: true },
  );
  document.addEventListener("pointerout", (e) => {
    if (!e.relatedTarget) reset();
  });
  window.addEventListener("blur", reset);
  motion.addEventListener("change", reset);
  const interactive = ".nav-logo,.nav-link,.mobile-nav-link,[onclick]";
  function enhance(root) {
    root.querySelectorAll(interactive).forEach((el) => {
      if (!el.matches("button,a,input,select,textarea")) {
        el.tabIndex = 0;
        if (!el.hasAttribute("role") && el.tagName !== "TR")
          el.setAttribute(
            "role",
            el.classList.contains("tab-btn") ? "button" : "link",
          );
      }
    });
  }
  enhance(document);
  new MutationObserver((records) => {
    for (const r of records)
      for (const n of r.addedNodes)
        if (n.nodeType === 1) enhance(n.parentElement || n);
  }).observe(document.getElementById("app"), {
    childList: true,
    subtree: true,
  });
  document.addEventListener("keydown", (e) => {
    if (
      (e.key === "Enter" || e.key === " ") &&
      e.target.matches(interactive) &&
      !e.target.matches("a,button,input,select,textarea")
    ) {
      e.preventDefault();
      e.target.click();
    }
    if (e.key === "Escape") {
      document.getElementById("mobile-menu").classList.remove("open");
      document
        .getElementById("hamburger-btn")
        .setAttribute("aria-expanded", "false");
    }
  });
  document.addEventListener("click", (e) => {
    const selected = e.target.closest(".archive-card");
    if (selected) {
      try {
        sessionStorage.setItem(
          "f1-snap-selected",
          `${selected.dataset.season}/${selected.dataset.round}`,
        );
      } catch {}
    }
    if (e.target.closest(".mobile-nav-link"))
      document.getElementById("mobile-menu").classList.remove("open");
    const menu = document.getElementById("mobile-menu");
    document
      .getElementById("hamburger-btn")
      .setAttribute("aria-expanded", String(menu.classList.contains("open")));
  });
  const sync = () => {
    document.querySelectorAll("[data-page]").forEach((el) => {
      if (el.classList.contains("active"))
        el.setAttribute("aria-current", "page");
      else el.removeAttribute("aria-current");
    });
    let key;
    try {
      key = sessionStorage.getItem("f1-snap-selected");
    } catch {}
    document
      .querySelectorAll(".archive-card")
      .forEach((el) =>
        el.classList.toggle(
          "is-selected",
          `${el.dataset.season}/${el.dataset.round}` === key,
        ),
      );
  };
  new MutationObserver(sync).observe(document.getElementById("app"), {
    childList: true,
    subtree: true,
  });
  new MutationObserver(sync).observe(document.querySelector(".nav-links"), {
    attributes: true,
    attributeFilter: ["class"],
    subtree: true,
  });
  sync();
})();
