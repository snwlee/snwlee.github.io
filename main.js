(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function initReveal() {
    var els = document.querySelectorAll(".reveal");
    if (reduced || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
      });
    }, { threshold: 0.25 });
    els.forEach(function (el) { io.observe(el); });
  }

  function initCounters() {
    var els = document.querySelectorAll("[data-count]");
    function animate(el) {
      var target = parseInt(el.getAttribute("data-count"), 10);
      if (reduced) { el.textContent = target.toLocaleString(); return; }
      var start = null;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / 1200, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased).toLocaleString();
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    if (!("IntersectionObserver" in window)) { els.forEach(animate); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { animate(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    els.forEach(function (el) { io.observe(el); });
  }

  function fetchJSON(url, ms) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject(new Error("timeout")); }, ms);
      fetch(url).then(function (r) {
        clearTimeout(t);
        if (!r.ok) throw new Error("http " + r.status);
        return r.json();
      }).then(resolve, reject);
    });
  }

  function setBoardValue(el, text) {
    if (!el) return;
    el.textContent = text;
    el.classList.toggle("is-collecting", !/\d/.test(String(text)));
  }

  function renderGrass(contributions) {
    var container = document.querySelector("#stat-grass .grass");
    if (!container || !contributions || !contributions.length) return;
    container.textContent = "";
    var frag = document.createDocumentFragment();
    var firstDate = new Date(contributions[0].date + "T00:00:00");
    var startDay = isNaN(firstDate.getTime()) ? 0 : firstDate.getDay();
    for (var i = 0; i < startDay; i++) {
      var pad = document.createElement("div");
      pad.className = "grass-cell";
      frag.appendChild(pad);
    }
    contributions.forEach(function (d) {
      var cell = document.createElement("div");
      var lvl = typeof d.level === "number" ? d.level : 0;
      cell.className = "grass-cell lvl-" + lvl;
      cell.title = d.date + ": " + d.count + "건";
      frag.appendChild(cell);
    });
    container.appendChild(frag);
  }

  function computeWakaHours(d) {
    try {
      var data = d && d.data;
      if (!data) return null;
      var entries = Array.isArray(data) ? data : [data];
      var totalSeconds = 0;
      var hasSeconds = false;
      var lastText = null;
      entries.forEach(function (entry) {
        var gt = entry && entry.grand_total;
        if (!gt) return;
        if (typeof gt.total_seconds === "number") {
          totalSeconds += gt.total_seconds;
          hasSeconds = true;
        }
        lastText = gt.text || gt.digital || lastText;
      });
      if (hasSeconds) return (totalSeconds / 3600).toFixed(1) + "h";
      return lastText;
    } catch (e) {
      return null;
    }
  }

  function initLiveBoard() {
    try {
      fetchJSON("data/stats.json", 3000).then(function (stats) {
        var tokensValueEl = document.querySelector("#stat-tokens .stat-value");
        var tokensNoteEl = document.querySelector("#stat-tokens .stat-note");
        var tokenText = stats.tokens && stats.tokens.value && stats.tokens.value !== "—"
          ? stats.tokens.value
          : "수집 중";
        setBoardValue(tokensValueEl, tokenText);
        if (tokensNoteEl) {
          var tokenNote = stats.tokens && stats.tokens.note ? stats.tokens.note + " · " : "";
          tokensNoteEl.textContent = tokenNote + "기준: " + stats.asOf;
        }

        // 잔디: 공개 컨트리뷰션 API
        fetchJSON("https://github-contributions-api.jogruber.de/v4/snwlee?y=last", 5000)
          .then(function (d) {
            try {
              renderGrass(d.contributions);
            } catch (e) {
              console.warn("liveboard: grass render failed");
              var note = document.querySelector("#stat-grass .stat-note");
              if (note) note.textContent = "오프라인 스냅샷";
            }
          })
          .catch(function () {
            console.warn("liveboard: contributions fetch failed");
            if (stats.fallback && stats.fallback.contributions && stats.fallback.contributions.length) {
              renderGrass(stats.fallback.contributions);
            }
            var note = document.querySelector("#stat-grass .stat-note");
            if (note) note.textContent = "오프라인 스냅샷";
          });

        // WakaTime (share URL 설정 시에만)
        var codingValueEl = document.querySelector("#stat-coding .stat-value");
        if (stats.wakatimeShareUrl) {
          fetchJSON(stats.wakatimeShareUrl, 5000)
            .then(function (d) {
              var text = computeWakaHours(d);
              setBoardValue(codingValueEl, text || stats.fallback.codingHours);
              try {
                var data = d && d.data;
                var gt = data && (Array.isArray(data) ? data[0] && data[0].grand_total : data.grand_total);
                var codingNoteEl = document.querySelector("#stat-coding .stat-note");
                if (codingNoteEl && gt && typeof gt.daily_average === "number") {
                  var avgH = Math.floor(gt.daily_average / 3600);
                  var avgM = Math.floor((gt.daily_average % 3600) / 60);
                  codingNoteEl.textContent =
                    "2022.03부터 · 코딩한 날 하루 평균 " + avgH + "시간 " + avgM + "분";
                }
              } catch (e) {}
            })
            .catch(function () {
              console.warn("liveboard: wakatime fetch failed");
              setBoardValue(codingValueEl, stats.fallback.codingHours);
            });
        } else {
          setBoardValue(codingValueEl, (stats.fallback && stats.fallback.codingHours) || "수집 중");
        }
      }).catch(function () {
        console.warn("liveboard: stats.json fetch failed");
        setBoardValue(document.querySelector("#stat-tokens .stat-value"), "수집 중");
        setBoardValue(document.querySelector("#stat-coding .stat-value"), "수집 중");
        var note = document.querySelector("#stat-grass .stat-note");
        if (note) note.textContent = "오프라인 스냅샷";
        var gs = document.querySelector("#stat-grass .grass-scroll");
        if (gs) gs.style.display = "none";
      });
    } catch (e) {
      console.warn("liveboard: init failed");
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    initReveal();
    initCounters();
    initLiveBoard();
  });
})();
