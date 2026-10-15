/* Relève : amélioration progressive du schéma de parcours (la page reste lisible sans JavaScript). */
(function () {
  var flow = document.getElementById('flow');
  var dataEl = document.getElementById('modes-data');
  if (!flow || !dataEl) return;
  var MODES;
  try { MODES = JSON.parse(dataEl.textContent); } catch (e) { return; }
  var log = document.getElementById('log');
  var logSub = document.getElementById('log-sub');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var timer = null;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function render(key) {
    var m = MODES[key];
    if (!m) return;
    flow.innerHTML = m.steps.map(function (s, i) {
      return '<li class="st' + (s.skip ? ' skip' : '') + '" data-i="' + i + '"><span class="node">' + (i + 1) + '</span>' +
        '<div class="st-body"><span class="st-time">' + esc(s.time) + '</span><h3>' + esc(s.t) + '</h3><p>' + esc(s.d) + '</p>' +
        (s.tag ? '<span class="st-tag' + (s.warn ? ' warn' : '') + '">' + esc(s.tag) + '</span>' : '') + '</div></li>';
    }).join('');
    log.innerHTML = m.steps.filter(function (s) { return !s.skip && s.time !== '—'; }).map(function (s) {
      return '<li><time>' + esc(s.time.split(' · ')[1] || '') + '</time><span><b>' + esc(s.t) + '</b> — ' + esc(s.d) + '</span></li>';
    }).join('');
    logSub.textContent = m.sub;
    var items = Array.prototype.slice.call(flow.children);
    clearInterval(timer);
    function paint(k) {
      items.forEach(function (el, i) { el.classList.toggle('done', i < k); el.classList.toggle('active', i === k); });
      flow.style.setProperty('--p', Math.min(k, 4) / 4);
    }
    if (reduce) { paint(4); return; }
    var k = 0;
    paint(0);
    timer = setInterval(function () { k++; paint(k); if (k >= 4) clearInterval(timer); }, 520);
  }

  var chips = document.querySelectorAll('.chip[data-mode]');
  Array.prototype.forEach.call(chips, function (c) {
    c.addEventListener('click', function () {
      Array.prototype.forEach.call(chips, function (o) { o.setAttribute('aria-pressed', o === c ? 'true' : 'false'); });
      render(c.getAttribute('data-mode'));
    });
  });
})();
