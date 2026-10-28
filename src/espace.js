/* Relève : espace client et espace opérateur. JavaScript sans dépendance, API Supabase via fetch. */
(function () {
  'use strict';
  var root = document.getElementById('app');
  if (!root) return;
  var SB = root.getAttribute('data-sb-url');
  var KEY = root.getAttribute('data-sb-key');
  var PORTAL = root.getAttribute('data-portal-url');
  var MODE = root.getAttribute('data-mode'); // 'client' | 'admin'
  var ADDRESS = (root.getAttribute('data-address') || '').split('|').filter(Boolean);

  var PLAN = { essentiel: 'Essentiel', pro: 'Pro', entreprise: 'Entreprise' };
  var CYCLE = { mensuel: 'mensuel', annuel: 'annuel' };
  var STATUS_CUSTOMER = { active: 'Actif', past_due: 'Paiement en retard', canceled: 'Résilié' };
  var TREATMENT = { emailespace: 'Email + espace client', espace: 'Espace client', email: 'Email', api: 'Agents IA / API', reexpedition: 'Réexpédition de l’original', destruction: 'Destruction sans ouverture' };
  var DEFAULT_TREATMENT = { emailespace: TREATMENT.emailespace, espace: 'Espace client uniquement', email: 'Email uniquement', api: TREATMENT.api, reexpedition: 'Numérisation puis réexpédition' };
  var STATUS_ITEM = { recu: 'Reçu', numerise: 'Numérisé', envoye: 'Envoyé', detruit: 'Détruit', reexpedie: 'Réexpédié' };
  var DOC = { facture: 'Facture', impots: 'Impôts', administratif: 'Administratif', banque: 'Banque', assurance: 'Assurance', contrat: 'Contrat', juridique: 'Juridique', recommande: 'Recommandé', autre: 'Autre' };

  /* ---------- Utilitaires ---------- */
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function fmtDate(d) { if (!d) return '—'; var p = String(d).slice(0, 10).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : d; }
  function fmtEur(n) { return n == null ? '—' : Number(n).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }); }
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* stockage indisponible */ } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };

  /* ---------- Session ---------- */
  var session = null;
  function saveSession(s) { session = s; if (s) store.set('rlv_session', JSON.stringify(s)); else store.del('rlv_session'); }
  function loadSession() { try { session = JSON.parse(store.get('rlv_session') || 'null'); } catch (e) { session = null; } }

  function readHash() {
    var hash = location.hash.replace(/^#/, '');
    if (!hash) return null;
    var p = new URLSearchParams(hash);
    if (p.get('error_description') || p.get('error')) {
      history.replaceState(null, '', location.pathname);
      return { error: 'Ce lien de connexion a expiré ou a déjà été utilisé. Demandez-en un nouveau.' };
    }
    if (p.get('access_token')) {
      var exp = Number(p.get('expires_in') || 3600);
      saveSession({ access_token: p.get('access_token'), refresh_token: p.get('refresh_token'), expires_at: Math.floor(Date.now() / 1000) + exp });
      history.replaceState(null, '', location.pathname);
    }
    return null;
  }

  function refresh() {
    if (!session || !session.refresh_token) return Promise.resolve(false);
    return fetch(SB + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: session.refresh_token })
    }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j || !j.access_token) { saveSession(null); return false; }
      saveSession({ access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Math.floor(Date.now() / 1000) + (j.expires_in || 3600) });
      return true;
    }).catch(function () { return false; });
  }

  function api(path, opts, retried) {
    opts = opts || {};
    var headers = Object.assign({ apikey: KEY }, opts.headers || {});
    if (session) headers.Authorization = 'Bearer ' + session.access_token;
    return fetch(SB + path, Object.assign({}, opts, { headers: headers })).then(function (r) {
      if (r.status === 401 && !retried && session) {
        return refresh().then(function (ok) { return ok ? api(path, opts, true) : r; });
      }
      return r;
    });
  }
  function json(r) { return r.json().catch(function () { return null; }); }

  /* ---------- Connexion ---------- */
  function sendLink(email) {
    return fetch(SB + '/auth/v1/otp?redirect_to=' + encodeURIComponent(location.origin + location.pathname), {
      method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, create_user: true })
    });
  }

  function viewLogin(message) {
    clear(root);
    var msg = h('p', { class: 'note', role: 'status' });
    if (message) msg.textContent = message;
    var input = h('input', { id: 'login-email', type: 'email', autocomplete: 'email', required: 'required', placeholder: 'vous@exemple.fr' });
    var btn = h('button', { class: 'btn btn-primary', type: 'submit' }, ['Recevoir mon lien de connexion']);
    var form = h('form', { class: 'login-form', novalidate: 'novalidate' }, [
      h('div', { class: 'field' }, [h('label', { for: 'login-email' }, [MODE === 'admin' ? 'Email opérateur' : 'Email utilisé lors de votre abonnement']), input]),
      btn, msg
    ]);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { msg.textContent = 'Saisissez une adresse email valide.'; return; }
      btn.disabled = true; msg.textContent = 'Envoi du lien…';
      sendLink(email).then(function (r) {
        btn.disabled = false;
        if (r.ok) msg.textContent = 'Si cette adresse correspond à un compte, un lien de connexion vient d’être envoyé. Il est valable une heure.';
        else if (r.status === 429) msg.textContent = 'Trop de demandes. Patientez quelques minutes avant de réessayer.';
        else msg.textContent = 'Envoi impossible pour le moment. Réessayez dans un instant.';
      }).catch(function () { btn.disabled = false; msg.textContent = 'Connexion impossible. Vérifiez votre réseau.'; });
    });
    root.appendChild(h('div', { class: 'app-card narrow-card' }, [
      h('h2', { class: 'h3', text: 'Connexion' }),
      h('p', { class: 'muted', text: 'Nous vous envoyons un lien de connexion par email, sans mot de passe.' }),
      form
    ]));
  }

  function logout() {
    var s = session;
    saveSession(null);
    if (s) fetch(SB + '/auth/v1/logout', { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + s.access_token } }).catch(function () {});
    viewLogin();
  }

  function topbar(email, title) {
    return h('div', { class: 'app-top' }, [
      h('div', {}, [h('h2', { text: title }), h('p', { class: 'muted', text: email })]),
      h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: logout }, ['Se déconnecter'])
    ]);
  }

  function openPdf(path, btn) {
    btn.disabled = true;
    api('/storage/v1/object/sign/plis/' + path.split('/').map(encodeURIComponent).join('/'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 300 })
    }).then(json).then(function (j) {
      btn.disabled = false;
      if (j && j.signedURL) window.open(SB + '/storage/v1' + j.signedURL, '_blank', 'noopener');
      else btn.textContent = 'Indisponible';
    }).catch(function () { btn.disabled = false; btn.textContent = 'Indisponible'; });
  }

  function fnUrl(name) { return SB + '/functions/v1/' + name; }
  function openCertificate(id, ref, btn) {
    var label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Téléchargement…';
    fetch(fnUrl('certificate') + '?item=' + encodeURIComponent(id), { headers: { apikey: KEY, Authorization: 'Bearer ' + session.access_token } })
      .then(function (r) { if (!r.ok) throw new Error('cert'); return r.blob(); })
      .then(function (b) {
        var u = URL.createObjectURL(b);
        var a = document.createElement('a');
        a.href = u; a.download = 'Attestation-destruction-' + (ref || id) + '.pdf';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(u); }, 60000);
        btn.disabled = false; btn.textContent = label;
      })
      .catch(function () { btn.disabled = false; btn.textContent = 'Indisponible'; });
  }
  function notify(body) {
    return fetch(fnUrl('notify'), { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }); }).catch(function () { return { error: 'réseau' }; });
  }
  function notifyText(res) {
    if (!res || res.error) return 'Notification impossible.';
    var out = [];
    if (res.email === true) out.push('email envoyé'); else if (res.email === false) out.push('email NON envoyé (mot de passe SMTP à configurer ?)');
    if (typeof res.webhook === 'number') out.push('webhook : HTTP ' + res.webhook); else if (typeof res.webhook === 'string' && res.webhook.indexOf('erreur') === 0) out.push('webhook en échec');
    return out.length ? out.join(' · ') : '';
  }

  function opt(v, t) { return h('option', { value: v }, [t]); }
  function badge(text, kind) { return h('span', { class: 'badge ' + (kind || '') }, [text]); }

  /* ---------- Espace client ---------- */
  function viewClient(email) {
    clear(root);
    root.appendChild(topbar(email, 'Mon espace'));
    var body = h('div', { class: 'app-body' }, [h('p', { class: 'muted', text: 'Chargement…' })]);
    root.appendChild(body);

    api('/rest/v1/customers?select=*&limit=1').then(function (r) { return r.ok ? json(r) : null; }).then(function (rows) {
      if (rows && rows.length) return { c: rows[0], member: false };
      return api('/rest/v1/rpc/member_account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
        .then(function (r) { return r.ok ? json(r) : null; }).then(function (m) {
          return m && m.length ? { c: m[0], member: true } : null;
        });
    }).then(function (res) {
      clear(body);
      if (!res) {
        body.appendChild(h('div', { class: 'app-card' }, [
          h('h3', { text: 'Aucun abonnement associé à cette adresse' }),
          h('p', { class: 'muted', text: 'Connectez-vous avec l’email utilisé lors du paiement. Si vous venez de souscrire, patientez une minute puis rechargez la page.' }),
          h('a', { class: 'btn btn-ghost btn-sm', href: '/tarifs/' }, ['Voir les formules'])
        ]));
        return;
      }
      var c = res.c, member = res.member;
      var active = c.status === 'active';
      var advanced = (c.plan === 'pro' || c.plan === 'entreprise');

      var panelMail = h('div', { id: 'panel-mail', role: 'tabpanel', 'aria-labelledby': 'tab-mail', class: 'app-body' });
      var panelAcc = h('div', { id: 'panel-acc', role: 'tabpanel', 'aria-labelledby': 'tab-acc', class: 'app-body' });
      var tabMail = h('button', { id: 'tab-mail', class: 'tab', type: 'button', role: 'tab', 'aria-controls': 'panel-mail' }, ['Mon courrier']);
      var tabAcc = h('button', { id: 'tab-acc', class: 'tab', type: 'button', role: 'tab', 'aria-controls': 'panel-acc' }, [member ? 'Compte' : 'Mon compte']);
      function show(which) {
        var m = which !== 'acc';
        tabMail.setAttribute('aria-selected', m ? 'true' : 'false'); tabAcc.setAttribute('aria-selected', m ? 'false' : 'true');
        tabMail.tabIndex = m ? 0 : -1; tabAcc.tabIndex = m ? -1 : 0;
        if (m) { panelMail.removeAttribute('hidden'); panelAcc.setAttribute('hidden', 'hidden'); } else { panelAcc.removeAttribute('hidden'); panelMail.setAttribute('hidden', 'hidden'); }
        store.set('rlv_tab', m ? 'mail' : 'acc');
      }
      tabMail.addEventListener('click', function () { show('mail'); });
      tabAcc.addEventListener('click', function () { show('acc'); });
      [tabMail, tabAcc].forEach(function (t) {
        t.addEventListener('keydown', function (e) {
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { var next = t === tabMail ? tabAcc : tabMail; show(next === tabMail ? 'mail' : 'acc'); next.focus(); }
        });
      });
      body.appendChild(h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Sections de l’espace client' }, [tabMail, tabAcc]));
      body.appendChild(panelMail); body.appendChild(panelAcc);

      mailPanel(panelMail, { advanced: advanced, plan: c.plan });

      if (member) {
        panelAcc.appendChild(h('div', { class: 'app-card' }, [
          h('h3', { text: (c.company || c.name || 'Compte') + ' · ' + (PLAN[c.plan] || c.plan) }),
          h('p', { class: 'muted', text: 'Vous consultez ce compte en tant qu’utilisateur invité par ' + c.owner_email + '. Référence client : ' + c.reference + '.' })
        ]));
      } else {
        panelAcc.appendChild(accountCard(c));
        panelAcc.appendChild(prefsCard(c));
        if (advanced && active) { panelAcc.appendChild(rulesCard(c)); panelAcc.appendChild(teamCard(c)); }
        if (c.plan === 'entreprise' && active) panelAcc.appendChild(apiCard(c));
      }
      show(store.get('rlv_tab') === 'acc' ? 'acc' : 'mail');
    }).catch(function () {
      clear(body); body.appendChild(h('p', { class: 'note', text: 'Impossible de charger vos données. Réessayez dans un instant.' }));
    });
  }

  /* ---------- Courrier : liste, filtres, aperçu, exports ---------- */
  var TYPE_ORDER = ['facture', 'impots', 'administratif', 'banque', 'assurance', 'contrat', 'juridique', 'recommande', 'autre'];
  var PERIODS = { '': 'Toute la période', '30': '30 derniers jours', '90': '3 derniers mois', '365': '12 derniers mois' };
  var SORTS = { recent: 'Plus récents', old: 'Plus anciens', sender: 'Expéditeur (A→Z)', amount: 'Montant décroissant', due: 'Échéance proche' };

  function todayIso() { return new Date().toISOString().slice(0, 10); }
  function daysFrom(iso) { return Math.round((Date.parse(iso + 'T00:00:00Z') - Date.parse(todayIso() + 'T00:00:00Z')) / 86400000); }
  function slug(s) { return String(s || 'courrier').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'courrier'; }
  function fileName(it, n) { return String(it.received_at).slice(0, 10) + '_' + slug(it.sender) + '_' + (it.doc_type || 'pli') + (n ? '_' + n : '') + '.pdf'; }
  function saveBlob(blob, name) {
    var u = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = u; a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(u); }, 60000);
  }
  function fetchPdf(path) {
    return api('/storage/v1/object/sign/plis/' + path.split('/').map(encodeURIComponent).join('/'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 120 })
    }).then(json).then(function (j) {
      if (!j || !j.signedURL) throw new Error('sign');
      return fetch(SB + '/storage/v1' + j.signedURL);
    }).then(function (r) { if (!r.ok) throw new Error('get'); return r.blob(); });
  }
  function csvCell(v) {
    var s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  var CRC = (function () { var t = [], c, n, k; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u8) { var c = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zipStore(files) { // files : [{name, data:Uint8Array}] ; méthode « stored », sans compression
    var enc = new TextEncoder(), parts = [], central = [], offset = 0, d = new Date();
    var dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    var dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    files.forEach(function (f) {
      var name = enc.encode(f.name), crc = crc32(f.data), sz = f.data.length;
      var lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, dosTime, true); lh.setUint16(12, dosDate, true); lh.setUint32(14, crc, true); lh.setUint32(18, sz, true); lh.setUint32(22, sz, true);
      lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(lh.buffer, name, f.data);
      var ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
      ch.setUint16(12, dosTime, true); ch.setUint16(14, dosDate, true); ch.setUint32(16, crc, true); ch.setUint32(20, sz, true); ch.setUint32(24, sz, true);
      ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
      central.push(ch.buffer, name);
      offset += 30 + name.length + sz;
    });
    var csize = 0; central.forEach(function (p) { csize += p.byteLength || p.length; });
    var end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, csize, true); end.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [end.buffer]), { type: 'application/zip' });
  }

  function itemTodo(it) { return !!it.due_date && !it.handled_at && it.status !== 'detruit'; }
  function itemNew(it) { return !it.opened_at && !!it.pdf_path; }

  function openPreview(it, onOpened) {
    var dlg = h('dialog', { class: 'preview', 'aria-label': 'Aperçu du pli' });
    var frameBox = h('div', { class: 'preview-body' }, [h('p', { class: 'muted', text: 'Chargement du PDF…' })]);
    var close = h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { dlg.close(); } }, ['Fermer']);
    var title = (it.sender || 'Pli') + ' · ' + fmtDate(it.received_at);
    var dl = h('button', { class: 'btn btn-primary btn-sm', type: 'button' }, ['Télécharger']);
    dlg.appendChild(h('div', { class: 'preview-top' }, [h('strong', { text: title }), h('span', { class: 'preview-actions' }, [dl, close])]));
    dlg.appendChild(frameBox);
    document.body.appendChild(dlg);
    var objectUrl = null, blobRef = null;
    dlg.addEventListener('close', function () { if (objectUrl) URL.revokeObjectURL(objectUrl); if (dlg.parentNode) dlg.parentNode.removeChild(dlg); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dl.addEventListener('click', function () { if (blobRef) saveBlob(blobRef, fileName(it)); });
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', 'open');
    fetchPdf(it.pdf_path).then(function (blob) {
      blobRef = blob; objectUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      clear(frameBox);
      frameBox.appendChild(h('iframe', { src: objectUrl, title: 'PDF : ' + title, class: 'preview-frame' }));
      onOpened();
    }).catch(function () { clear(frameBox); frameBox.appendChild(h('p', { class: 'note', text: 'Aperçu indisponible. Utilisez « Télécharger ».' })); });
  }

  function mailPanel(box, opts) {
    var advanced = opts.advanced;
    var all = [];
    var st = { q: '', type: '', status: '', period: '', folder: '', todo: false, sort: 'recent' };
    var chipsBox = h('div', { class: 'chips', role: 'group', 'aria-label': 'Filtrer par type de document' });
    var listBox = h('div', {});
    var info = h('p', { class: 'muted', role: 'status', 'aria-live': 'polite' });
    var q = h('input', { type: 'search', placeholder: 'Rechercher : expéditeur, référence, contenu…', 'aria-label': 'Rechercher dans mes plis', maxlength: '100' });
    function sel(label, map, key, extra) {
      var s = h('select', { 'aria-label': label }, (extra || []).concat(Object.keys(map).map(function (k) { return opt(k, map[k]); })));
      s.addEventListener('change', function () { st[key] = s.value; render(); });
      return s;
    }
    var statusSel = sel('Statut', STATUS_ITEM, 'status', [opt('', 'Tous les statuts')]);
    var periodSel = sel('Période', PERIODS, 'period');
    var sortSel = sel('Trier par', SORTS, 'sort');
    var folderSel = h('select', { 'aria-label': 'Dossier' }, [opt('', 'Tous les dossiers')]);
    folderSel.addEventListener('change', function () { st.folder = folderSel.value; render(); });
    var todoBtn = h('button', { class: 'chip', type: 'button', 'aria-pressed': 'false', onclick: function () { st.todo = !st.todo; render(); } }, ['À traiter']);
    var form = h('form', { class: 'toolbar', role: 'search', novalidate: 'novalidate' }, [q, h('button', { class: 'btn btn-ghost btn-sm', type: 'submit' }, ['Rechercher'])]);
    form.addEventListener('submit', function (e) { e.preventDefault(); st.q = q.value.trim(); load(); });
    q.addEventListener('search', function () { if (!q.value && st.q) { st.q = ''; load(); } });
    var filters = h('div', { class: 'filters' }, [statusSel, periodSel].concat(advanced ? [folderSel] : [], [sortSel]));
    var exportCsv = h('button', { class: 'btn btn-ghost btn-sm', type: 'button' }, ['Exporter en CSV']);
    var exportZip = h('button', { class: 'btn btn-ghost btn-sm', type: 'button' }, ['Télécharger les PDF (ZIP)']);
    var exMsg = h('span', { class: 'muted', role: 'status' });

    var card = h('div', { class: 'app-card' }, [h('h3', { text: 'Mes plis' }), form]);
    if (advanced) card.appendChild(chipsBox);
    else card.appendChild(h('p', { class: 'hint lock' }, ['Classer par type (facture, impôts, banque…) et par dossier : ', h('a', { href: '/tarifs/' }, ['disponible avec la formule Pro']), '.']));
    card.appendChild(filters);
    card.appendChild(info);
    card.appendChild(listBox);
    card.appendChild(h('div', { class: 'export-row' }, [exportCsv, exportZip, exMsg]));
    box.appendChild(card);

    function load() {
      var url = '/rest/v1/mail_items?select=*&order=received_at.desc,created_at.desc&limit=500';
      if (st.q) url += '&search=wfts(french).' + encodeURIComponent(st.q.replace(/[(),]/g, ' '));
      listBox.textContent = 'Chargement…';
      api(url).then(function (r) { return r.ok ? json(r) : []; }).then(function (items) { all = items || []; render(); })
        .catch(function () { listBox.textContent = 'Chargement impossible.'; });
    }

    function filtered() {
      var now = todayIso(), out = all.filter(function (it) {
        if (st.type && it.doc_type !== st.type) return false;
        if (st.status && it.status !== st.status) return false;
        if (st.folder && it.folder !== st.folder) return false;
        if (st.todo && !itemTodo(it)) return false;
        if (st.period) { var age = -daysFrom(String(it.received_at).slice(0, 10)); if (age > Number(st.period)) return false; }
        return true;
      });
      var cmp = {
        recent: function (a, b) { return String(b.received_at).localeCompare(String(a.received_at)); },
        old: function (a, b) { return String(a.received_at).localeCompare(String(b.received_at)); },
        sender: function (a, b) { return String(a.sender || '').localeCompare(String(b.sender || ''), 'fr'); },
        amount: function (a, b) { return (Number(b.amount_ttc) || -1) - (Number(a.amount_ttc) || -1); },
        due: function (a, b) { return String(a.due_date || '9999').localeCompare(String(b.due_date || '9999')); }
      }[st.sort];
      return out.sort(cmp);
    }

    function renderChips() {
      clear(chipsBox);
      var counts = {}; all.forEach(function (it) { counts[it.doc_type] = (counts[it.doc_type] || 0) + 1; });
      function chip(label, value, n) {
        var on = st.type === value;
        return h('button', { class: 'chip', type: 'button', 'aria-pressed': on ? 'true' : 'false', onclick: function () { st.type = value; render(); } }, [label + (n != null ? ' ' : ''), n != null ? h('span', { class: 'chip-n', text: String(n) }) : null]);
      }
      chipsBox.appendChild(chip('Tous', '', all.length));
      TYPE_ORDER.forEach(function (k) { if (counts[k]) chipsBox.appendChild(chip(DOC[k], k, counts[k])); });
      todoBtn.setAttribute('aria-pressed', st.todo ? 'true' : 'false');
      chipsBox.appendChild(todoBtn);
    }

    function renderFolders() {
      var seen = {}; all.forEach(function (it) { if (it.folder) seen[it.folder] = 1; });
      clear(folderSel); folderSel.appendChild(opt('', 'Tous les dossiers'));
      Object.keys(seen).sort().forEach(function (f) { folderSel.appendChild(opt(f, f)); });
      folderSel.value = seen[st.folder] ? st.folder : '';
    }

    function dueNode(it) {
      if (!it.due_date) return null;
      var d = daysFrom(String(it.due_date).slice(0, 10));
      if (it.handled_at || it.status === 'detruit') return h('span', { class: 'due', text: 'Échéance ' + fmtDate(it.due_date) });
      if (d < 0) return h('span', { class: 'due late', text: 'En retard · ' + fmtDate(it.due_date) });
      if (d <= 7) return h('span', { class: 'due soon', text: (d === 0 ? 'Aujourd’hui' : 'Dans ' + d + ' j') + ' · ' + fmtDate(it.due_date) });
      return h('span', { class: 'due', text: 'Échéance ' + fmtDate(it.due_date) });
    }

    function row(it) {
      var meta = [h('span', { class: 'badge', text: DOC[it.doc_type] || it.doc_type })];
      if (it.folder) meta.push(h('span', { class: 'meta-folder', text: it.folder }));
      if (it.reference) meta.push(h('span', { class: 'meta-ref mono', text: it.reference }));
      var actions = [];
      if (it.pdf_path) {
        actions.push(h('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: function () {
          openPreview(it, function () { markOpened(it); });
        } }, ['Aperçu']));
        actions.push(h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function (e) {
          var b = e.currentTarget, t = b.textContent; b.disabled = true; b.textContent = '…';
          fetchPdf(it.pdf_path).then(function (blob) { saveBlob(blob, fileName(it)); markOpened(it); b.disabled = false; b.textContent = t; })
            .catch(function () { b.disabled = false; b.textContent = 'Indisponible'; });
        } }, ['Télécharger']));
      }
      if (it.certificate_ref) actions.push(h('button', { class: 'btn btn-ghost btn-sm', type: 'button', title: 'Attestation de destruction', onclick: function (e) { openCertificate(it.id, it.certificate_ref, e.currentTarget); } }, ['Attestation']));
      var handled = null;
      if (it.due_date || it.amount_ttc != null) {
        var cb = h('input', { type: 'checkbox', checked: it.handled_at ? 'checked' : false });
        cb.addEventListener('change', function () {
          var done = cb.checked; cb.disabled = true;
          api('/rest/v1/rpc/set_item_handled', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p_id: it.id, p_done: done }) })
            .then(function (r) { cb.disabled = false; if (r.ok) { it.handled_at = done ? new Date().toISOString() : null; render(); } else cb.checked = !done; })
            .catch(function () { cb.disabled = false; cb.checked = !done; });
        });
        handled = h('label', { class: 'handled' }, [cb, ' Traité']);
      }
      return h('li', { class: 'pli' }, [
        h('div', { class: 'pli-main' }, [
          h('div', { class: 'pli-title' }, [h('strong', { text: it.sender || 'Expéditeur inconnu' }), itemNew(it) ? h('span', { class: 'pill-new', text: 'Nouveau' }) : null, h('span', { class: 'pli-date', text: fmtDate(it.received_at) })]),
          h('div', { class: 'pli-meta' }, meta)
        ]),
        h('div', { class: 'pli-amount' }, [it.amount_ttc != null ? h('strong', { text: fmtEur(it.amount_ttc) }) : h('span', { class: 'muted', text: '—' }), dueNode(it)]),
        h('div', { class: 'pli-status' }, [badge(STATUS_ITEM[it.status] || it.status, it.status === 'detruit' || it.status === 'reexpedie' ? '' : 'ok'), handled]),
        h('div', { class: 'pli-actions' }, actions)
      ]);
    }

    function markOpened(it) {
      if (it.opened_at) return;
      it.opened_at = new Date().toISOString();
      api('/rest/v1/rpc/mark_item_opened', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p_id: it.id }) }).catch(function () {});
      render();
    }

    function render() {
      if (advanced) { renderChips(); renderFolders(); }
      statusSel.value = st.status; periodSel.value = st.period; sortSel.value = st.sort;
      var list = filtered();
      var f = !!(st.q || st.type || st.status || st.period || st.folder || st.todo);
      info.textContent = all.length ? list.length + (list.length > 1 ? ' plis' : ' pli') + (f ? ' correspondant à vos filtres' : '') : '';
      clear(listBox);
      if (!list.length) {
        listBox.appendChild(h('div', { class: 'empty' }, [
          h('strong', { text: f ? 'Aucun pli ne correspond à ces filtres.' : 'Aucun pli pour le moment.' }),
          h('p', { class: 'muted', text: f ? 'Modifiez la recherche ou réinitialisez les filtres.' : 'Vos plis numérisés apparaîtront ici dès leur réception, sous 24 h ouvrées.' }),
          f ? h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { st.q = ''; st.type = ''; st.status = ''; st.period = ''; st.folder = ''; st.todo = false; q.value = ''; load(); } }, ['Réinitialiser les filtres']) : null
        ]));
      } else listBox.appendChild(h('ul', { class: 'pli-list' }, list.map(row)));
      exportCsv.disabled = exportZip.disabled = !list.length;
    }

    exportCsv.addEventListener('click', function () {
      var head = ['Date de réception', 'Expéditeur', 'Type', 'Dossier', 'Référence', 'Montant TTC', 'Échéance', 'Statut', 'Traité', 'Conservé jusqu’au'];
      var lines = [head.map(csvCell).join(';')].concat(filtered().map(function (it) {
        return [fmtDate(it.received_at), it.sender, DOC[it.doc_type] || it.doc_type, it.folder, it.reference, it.amount_ttc == null ? '' : Number(it.amount_ttc).toFixed(2).replace('.', ','), it.due_date ? fmtDate(it.due_date) : '', STATUS_ITEM[it.status] || it.status, it.handled_at ? 'oui' : 'non', fmtDate(it.expires_at)].map(csvCell).join(';');
      }));
      saveBlob(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), 'releve-plis-' + todayIso() + '.csv');
    });

    exportZip.addEventListener('click', function () {
      var items = filtered().filter(function (it) { return it.pdf_path; }).slice(0, 50);
      if (!items.length) { exMsg.textContent = 'Aucun PDF dans cette sélection.'; return; }
      exportZip.disabled = true; var done = 0, files = [], used = {};
      exMsg.textContent = 'Préparation… 0/' + items.length;
      items.reduce(function (p, it) {
        return p.then(function () {
          return fetchPdf(it.pdf_path).then(function (b) { return b.arrayBuffer(); }).then(function (buf) {
            var n = fileName(it), k = 1; while (used[n]) { k++; n = fileName(it, k); } used[n] = 1;
            files.push({ name: n, data: new Uint8Array(buf) }); done++; exMsg.textContent = 'Préparation… ' + done + '/' + items.length;
          });
        });
      }, Promise.resolve()).then(function () {
        saveBlob(zipStore(files), 'releve-plis-' + todayIso() + '.zip');
        exMsg.textContent = done + ' PDF dans le ZIP' + (filtered().filter(function (it) { return it.pdf_path; }).length > 50 ? ' (50 maximum par téléchargement)' : '') + '.';
        exportZip.disabled = false;
      }).catch(function () { exMsg.textContent = 'Téléchargement impossible.'; exportZip.disabled = false; });
    });

    load();
  }

  /* Règles par expéditeur */
  function rulesCard(c) {
    var list = h('div', {});
    var msg = h('p', { class: 'note', role: 'status' });
    function loadRules() {
      api('/rest/v1/mail_rules?select=*&order=created_at.asc').then(function (r) { return r.ok ? json(r) : []; }).then(function (rules) {
        clear(list);
        if (!rules || !rules.length) { list.appendChild(h('p', { class: 'muted', text: 'Aucune règle. Sans règle, vos plis sont classés par type et par année (ex. Factures › 2026) et traités selon vos préférences.' })); return; }
        var rows = rules.map(function (ru) {
          var cond = [ru.sender_contains ? 'expéditeur contient « ' + ru.sender_contains + ' »' : null, ru.doc_type ? 'type : ' + (DOC[ru.doc_type] || ru.doc_type) : null].filter(Boolean).join(' et ');
          var act = [ru.set_folder ? 'dossier « ' + ru.set_folder + ' »' : null, ru.set_treatment ? TREATMENT[ru.set_treatment] : null].filter(Boolean).join(' · ');
          var del = h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () {
            if (!window.confirm('Supprimer la règle « ' + ru.name + ' » ?')) return;
            api('/rest/v1/mail_rules?id=eq.' + encodeURIComponent(ru.id), { method: 'DELETE' }).then(loadRules);
          } }, ['Supprimer']);
          return h('tr', {}, [h('td', { text: ru.name }), h('td', { text: cond }), h('td', { text: act }), h('td', {}, [del])]);
        });
        list.appendChild(h('div', { class: 'tablewrap' }, [h('table', {}, [
          h('thead', {}, [h('tr', {}, ['Règle', 'Si', 'Alors', ''].map(function (t) { return h('th', { scope: 'col', text: t }); }))]),
          h('tbody', {}, rows)])]));
      });
    }
    var name = h('input', { type: 'text', maxlength: '80', placeholder: 'Factures EDF', id: 'ru-name' });
    var sender = h('input', { type: 'text', maxlength: '80', placeholder: 'EDF', id: 'ru-sender' });
    var dtype = h('select', { id: 'ru-type' }, [opt('', 'Tous les types')].concat(Object.keys(DOC).map(function (k) { return opt(k, DOC[k]); })));
    var folder = h('input', { type: 'text', maxlength: '80', placeholder: 'Énergie › 2026', id: 'ru-folder' });
    var treat = h('select', { id: 'ru-treat' }, [opt('', 'Traitement inchangé')].concat(Object.keys(TREATMENT).map(function (k) { return opt(k, TREATMENT[k]); })));
    var btn = h('button', { class: 'btn btn-primary btn-sm', type: 'submit' }, ['Ajouter la règle']);
    function fld(id, label, node) { return h('div', { class: 'field' }, [h('label', { for: id }, [label]), node]); }
    var form = h('form', { novalidate: 'novalidate', class: 'form-grid' }, [
      fld('ru-name', 'Nom de la règle', name),
      h('div', { class: 'row' }, [fld('ru-sender', 'Si l’expéditeur contient', sender), fld('ru-type', 'et le type est', dtype)]),
      h('div', { class: 'row' }, [fld('ru-folder', 'Classer dans le dossier', folder), fld('ru-treat', 'Traiter par', treat)]),
      h('div', {}, [btn]), msg
    ]);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var row = { customer_id: c.id, name: name.value.trim(), sender_contains: sender.value.trim() || null, doc_type: dtype.value || null, set_folder: folder.value.trim() || null, set_treatment: treat.value || null };
      if (!row.name) { msg.textContent = 'Donnez un nom à la règle.'; return; }
      if (!row.sender_contains && !row.doc_type) { msg.textContent = 'Indiquez un expéditeur ou un type de document.'; return; }
      if (row.sender_contains && row.sender_contains.length < 2) { msg.textContent = 'L’expéditeur doit contenir au moins 2 caractères.'; return; }
      if (!row.set_folder && !row.set_treatment) { msg.textContent = 'Choisissez un dossier ou un traitement.'; return; }
      btn.disabled = true; msg.textContent = 'Enregistrement…';
      api('/rest/v1/mail_rules', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(row) }).then(function (r) {
        btn.disabled = false;
        if (!r.ok) { msg.textContent = 'Enregistrement impossible.'; return; }
        msg.textContent = 'Règle ajoutée. Elle s’applique aux prochains plis (la première règle correspondante l’emporte).';
        name.value = ''; sender.value = ''; folder.value = ''; dtype.value = ''; treat.value = ''; loadRules();
      }).catch(function () { btn.disabled = false; msg.textContent = 'Enregistrement impossible.'; });
    });
    loadRules();
    return h('div', { class: 'app-card' }, [h('h3', { text: 'Règles par expéditeur' }),
      h('p', { class: 'muted', text: 'Classez ou orientez automatiquement chaque pli selon son expéditeur ou son type. Exemple : « EDF » → dossier Énergie, envoi par email.' }), list, h('h4', { text: 'Nouvelle règle' }), form]);
  }

  /* Utilisateurs supplémentaires */
  function teamCard(c) {
    var max = c.plan === 'pro' ? 4 : null;
    var list = h('div', {});
    var msg = h('p', { class: 'note', role: 'status' });
    function loadTeam() {
      api('/rest/v1/team_members?select=*&order=created_at.asc').then(function (r) { return r.ok ? json(r) : []; }).then(function (ms) {
        clear(list);
        if (!ms || !ms.length) { list.appendChild(h('p', { class: 'muted', text: 'Vous êtes le seul utilisateur.' })); return; }
        ms.forEach(function (m) {
          var del = h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () {
            if (!window.confirm('Retirer l’accès de ' + m.email + ' ?')) return;
            api('/rest/v1/team_members?id=eq.' + encodeURIComponent(m.id), { method: 'DELETE' }).then(loadTeam);
          } }, ['Retirer']);
          list.appendChild(h('p', { class: 'team-row' }, [h('span', { text: m.email + ' ' }), del]));
        });
      });
    }
    var email = h('input', { id: 'tm-email', type: 'email', placeholder: 'collegue@exemple.fr', autocomplete: 'off' });
    var btn = h('button', { class: 'btn btn-primary btn-sm', type: 'submit' }, ['Inviter']);
    var form = h('form', { novalidate: 'novalidate', class: 'form-grid' }, [
      h('div', { class: 'field' }, [h('label', { for: 'tm-email' }, ['Email du collègue']), email, h('p', { class: 'hint', text: 'Il se connecte avec cet email (lien de connexion) et consulte vos plis et leurs PDF, en lecture seule.' })]),
      h('div', {}, [btn]), msg
    ]);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = email.value.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { msg.textContent = 'Adresse email invalide.'; return; }
      btn.disabled = true; msg.textContent = 'Ajout…';
      api('/rest/v1/team_members', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ customer_id: c.id, email: v }) }).then(function (r) {
        btn.disabled = false;
        if (r.ok) { msg.textContent = 'Utilisateur ajouté.'; email.value = ''; loadTeam(); return; }
        return json(r).then(function (j) { msg.textContent = (j && j.message) ? j.message : (r.status === 409 ? 'Cet utilisateur existe déjà.' : 'Ajout impossible.'); });
      }).catch(function () { btn.disabled = false; msg.textContent = 'Ajout impossible.'; });
    });
    loadTeam();
    return h('div', { class: 'app-card' }, [h('h3', { text: 'Utilisateurs' }),
      h('p', { class: 'muted', text: max ? 'Formule Pro : jusqu’à ' + (max + 1) + ' utilisateurs, vous compris.' : 'Formule Entreprise : utilisateurs illimités.' }), list, form]);
  }

  function kv(label, valueNode) { return h('div', { class: 'kv' }, [h('dt', { text: label }), h('dd', {}, [valueNode])]); }

  function accountCard(c) {
    var lines = [h('b', { text: 'c/o Relève · Réf. ' + c.reference })].concat(ADDRESS.map(function (l) { return h('span', { text: l }); }));
    var addr = h('div', { class: 'label-addr' }, [
      h('span', { text: c.company || c.name || '' })
    ].concat(lines.map(function (l) { return [h('br'), l]; }).reduce(function (a, b) { return a.concat(b); }, [])));
    var actions = [];
    if (PORTAL) actions.push(h('a', { class: 'btn btn-ghost btn-sm', href: PORTAL, rel: 'noopener', target: '_blank' }, ['Factures et moyen de paiement']));
    return h('div', { class: 'app-card' }, [
      h('h3', { text: 'Mon abonnement' }),
      h('dl', { class: 'kvs' }, [
        kv('Formule', document.createTextNode((PLAN[c.plan] || c.plan) + ' · ' + (CYCLE[c.billing_cycle] || c.billing_cycle))),
        kv('Statut', badge(STATUS_CUSTOMER[c.status] || c.status, c.status === 'active' ? 'ok' : 'warn')),
        kv('Référence client', h('span', { class: 'mono', text: c.reference }))
      ]),
      h('p', { class: 'legend', text: 'Libellé à utiliser pour votre courrier' }),
      addr,
      h('p', { class: 'note', text: 'Ajoutez cette ligne sous le nom de votre société sur vos changements d’adresse et votre réexpédition La Poste.' }),
      h('div', { class: 'hero-actions' }, actions)
    ]);
  }

  function prefsCard(c) {
    var sel = h('select', { id: 'pref-processing' }, Object.keys(DEFAULT_TREATMENT).map(function (k) {
      return h('option', { value: k, selected: c.default_processing === k ? 'selected' : false }, [DEFAULT_TREATMENT[k]]);
    }));
    var scan = h('input', { id: 'pref-scan', type: 'email', value: c.scan_email || '', placeholder: 'compta@exemple.fr' });
    var msg = h('p', { class: 'note', role: 'status' });
    var btn = h('button', { class: 'btn btn-primary btn-sm', type: 'submit' }, ['Enregistrer']);
    var form = h('form', { novalidate: 'novalidate', class: 'form-grid' }, [
      h('div', { class: 'field' }, [h('label', { for: 'pref-processing' }, ['Traitement par défaut']), sel]),
      h('div', { class: 'field' }, [h('label', { for: 'pref-scan' }, ['Email qui reçoit les scans']), scan, h('p', { class: 'hint', text: 'Laissez vide pour utiliser l’email du compte.' })]),
      h('div', {}, [btn]), msg
    ]);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = scan.value.trim();
      if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { msg.textContent = 'Adresse email invalide.'; return; }
      btn.disabled = true; msg.textContent = 'Enregistrement…';
      api('/rest/v1/customers?id=eq.' + encodeURIComponent(c.id), {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ default_processing: sel.value, scan_email: v || null })
      }).then(function (r) {
        btn.disabled = false; msg.textContent = r.ok ? 'Préférences enregistrées.' : 'Enregistrement impossible.';
      }).catch(function () { btn.disabled = false; msg.textContent = 'Enregistrement impossible.'; });
    });
    return h('div', { class: 'app-card' }, [h('h3', { text: 'Préférences de traitement' }), form]);
  }

  function apiCard(c) {
    var keyBox = h('div', {});
    var prefix = h('span', { class: 'mono', text: '…' });
    var msg = h('p', { class: 'note', role: 'status' });
    api('/rest/v1/rpc/my_api_key_prefix', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).then(json).then(function (p) { prefix.textContent = (typeof p === 'string' && p) ? p + '…' : 'aucune clé'; });
    var gen = h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () {
      if (!window.confirm('Générer une nouvelle clé ? L’ancienne cessera de fonctionner immédiatement.')) return;
      gen.disabled = true;
      api('/rest/v1/rpc/rotate_api_key', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).then(json).then(function (k) {
        gen.disabled = false; clear(keyBox);
        if (typeof k === 'string' && k.indexOf('rlv_live_') === 0) {
          prefix.textContent = k.slice(0, 13) + '…';
          keyBox.appendChild(h('p', { class: 'note', text: 'Copiez cette clé maintenant : elle ne sera plus affichée.' }));
          keyBox.appendChild(h('pre', { class: 'mono codebox', text: k }));
        } else msg.textContent = 'Génération impossible.';
      }).catch(function () { gen.disabled = false; msg.textContent = 'Génération impossible.'; });
    } }, ['Générer une nouvelle clé']);

    var url = h('input', { id: 'wh-url', type: 'url', value: c.webhook_url || '', placeholder: 'https://votre-systeme.fr/webhooks/releve' });
    var secretBox = h('div', {});
    function showSecret(sec) { clear(secretBox); if (sec) { secretBox.appendChild(h('p', { class: 'legend', text: 'Secret de signature' })); secretBox.appendChild(h('pre', { class: 'mono codebox', text: sec })); } }
    showSecret(c.webhook_secret);
    var save = h('button', { class: 'btn btn-primary btn-sm', type: 'submit' }, ['Enregistrer le webhook']);
    var whMsg = h('p', { class: 'note', role: 'status' });
    var form = h('form', { novalidate: 'novalidate', class: 'form-grid' }, [
      h('div', { class: 'field' }, [h('label', { for: 'wh-url' }, ['URL du webhook (https)']), url, h('p', { class: 'hint', text: 'Laissez vide pour désactiver. Un POST JSON signé est envoyé à chaque changement d’état d’un pli.' })]),
      h('div', {}, [save]), whMsg, secretBox
    ]);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = url.value.trim();
      if (v && !/^https:\/\/[^\s]+$/.test(v)) { whMsg.textContent = 'L’URL doit commencer par https://'; return; }
      save.disabled = true; whMsg.textContent = 'Enregistrement…';
      api('/rest/v1/rpc/set_webhook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p_url: v || null }) }).then(json).then(function (sec) {
        save.disabled = false; whMsg.textContent = v ? 'Webhook enregistré.' : 'Webhook désactivé.'; showSecret(typeof sec === 'string' ? sec : null);
      }).catch(function () { save.disabled = false; whMsg.textContent = 'Enregistrement impossible.'; });
    });
    var doc = 'curl ' + SB + '/functions/v1/api/v1/items \\\n  -H "Authorization: Bearer rlv_live_…"\n\n' +
      '# Un pli (avec pdf_url valable 10 min)\ncurl ' + SB + '/functions/v1/api/v1/items/{id} -H "Authorization: Bearer rlv_live_…"\n\n' +
      '# Paramètres de liste : limit (1-100), status, folder, q (recherche plein texte), before (ISO 8601)\n' +
      '# Webhook : en-tête Releve-Signature: t=<horodatage>,v1=<HMAC-SHA256 hex de "<t>.<corps>" avec le secret>';
    return h('div', { class: 'app-card' }, [
      h('h3', { text: 'API et webhooks' }),
      h('p', { class: 'muted', text: 'Donnez à vos outils et agents IA l’accès à vos plis : expéditeur, type, montant, échéance, IBAN, PDF.' }),
      h('dl', { class: 'kvs' }, [kv('Clé d’API', prefix)]),
      h('div', { class: 'hero-actions' }, [gen]), keyBox, msg,
      h('h4', { text: 'Webhook' }), form,
      h('h4', { text: 'Exemples' }), h('pre', { class: 'mono codebox', text: doc })
    ]);
  }

  /* ---------- Espace opérateur ---------- */
  function viewAdmin(email) {
    clear(root);
    root.appendChild(topbar(email, 'Espace opérateur'));
    var body = h('div', { class: 'app-body' }, [h('p', { class: 'muted', text: 'Vérification des droits…' })]);
    root.appendChild(body);
    api('/rest/v1/admins?select=email').then(function (r) { return r.ok ? json(r) : null; }).then(function (a) {
      clear(body);
      if (!a || !a.length) { body.appendChild(h('div', { class: 'app-card' }, [h('h3', { text: 'Accès réservé' }), h('p', { class: 'muted', text: 'Ce compte n’est pas autorisé à gérer le courrier.' })])); return; }
      return api('/rest/v1/customers?select=id,reference,company,name,email,plan,status,welcome_sent_at&order=created_at.desc').then(json).then(function (customers) {
        var list = h('div', { class: 'app-card' }, [h('h3', { text: 'Derniers plis déposés' }), h('p', { class: 'muted', text: 'Chargement…' })]);
        body.appendChild(depositForm(customers || [], function () { loadAdminItems(list); }));
        body.appendChild(list);
        loadAdminItems(list);
        body.appendChild(customersCard(customers || []));
      });
    }).catch(function () { clear(body); body.appendChild(h('p', { class: 'note', text: 'Chargement impossible.' })); });
  }

  function customersCard(customers) {
    var rows = customers.map(function (c) {
      var msg = h('span', { class: 'muted', text: c.welcome_sent_at ? 'Accueil envoyé le ' + fmtDate(c.welcome_sent_at) : 'Accueil non envoyé' });
      var b = h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () {
        b.disabled = true; msg.textContent = 'Envoi…';
        notify({ event: 'welcome', customer_id: c.id }).then(function (res) { b.disabled = false; msg.textContent = res && res.email === true ? 'Email d’accueil envoyé.' : 'Envoi impossible (SMTP ?).'; });
      } }, ['Renvoyer l’email d’accueil']);
      return h('tr', {}, [h('td', { class: 'mono', text: c.reference }), h('td', { text: c.company || c.name || c.email }), h('td', { text: (PLAN[c.plan] || c.plan) }), h('td', {}, [badge(STATUS_CUSTOMER[c.status] || c.status, c.status === 'active' ? 'ok' : 'warn')]), h('td', {}, [msg]), h('td', {}, [b])]);
    });
    return h('div', { class: 'app-card' }, [h('h3', { text: 'Clients' }),
      rows.length ? h('div', { class: 'tablewrap' }, [h('table', {}, [h('thead', {}, [h('tr', {}, ['Référence', 'Client', 'Formule', 'Statut', 'Email d’accueil', ''].map(function (t) { return h('th', { scope: 'col', text: t }); }))]), h('tbody', {}, rows)])]) : h('p', { class: 'muted', text: 'Aucun client pour le moment.' })]);
  }

  function depositForm(customers, onDone) {
    var f = {};
    function field(id, label, node, hint) { f[id] = node; node.id = 'd-' + id; return h('div', { class: 'field' }, [h('label', { for: 'd-' + id }, [label]), node, hint ? h('p', { class: 'hint', text: hint }) : null]); }
    var custSel = h('select', {}, [opt('', customers.length ? 'Choisir un client' : 'Aucun client')].concat(customers.map(function (c) { return opt(c.id, c.reference + ' · ' + (c.company || c.name || c.email)); })));
    var types = h('select', {}, Object.keys(DOC).map(function (k) { return opt(k, DOC[k]); }));
    var treat = h('select', {}, [opt('', 'Selon les règles et préférences du client')].concat(Object.keys(TREATMENT).map(function (k) { return opt(k, TREATMENT[k]); })));
    var status = h('select', {}, Object.keys(STATUS_ITEM).map(function (k) { return h('option', { value: k, selected: k === 'numerise' ? 'selected' : false }, [STATUS_ITEM[k]]); }));
    var today = new Date().toISOString().slice(0, 10);
    var msg = h('p', { class: 'note', role: 'status' });
    var btn = h('button', { class: 'btn btn-primary', type: 'submit' }, ['Déposer le pli']);
    var form = h('form', { novalidate: 'novalidate', class: 'form-grid' }, [
      field('customer', 'Client', custSel),
      h('div', { class: 'row' }, [field('received', 'Reçu le', h('input', { type: 'date', value: today })), field('sender', 'Expéditeur', h('input', { type: 'text', maxlength: '120' }))]),
      h('div', { class: 'row' }, [field('type', 'Type de document', types), field('treatment', 'Traitement demandé', treat)]),
      h('div', { class: 'row3b' }, [field('amount', 'Montant TTC (€)', h('input', { type: 'number', step: '0.01', min: '0', inputmode: 'decimal' })), field('due', 'Échéance', h('input', { type: 'date' })), field('pages', 'Pages', h('input', { type: 'number', min: '1', step: '1' }))]),
      h('div', { class: 'row' }, [field('reference', 'Référence du document', h('input', { type: 'text', maxlength: '80' }), 'N° de facture, de contrat…'), field('iban', 'IBAN', h('input', { type: 'text', maxlength: '40', autocomplete: 'off' }))]),
      h('div', { class: 'row' }, [field('status', 'Statut', status), field('file', 'PDF numérisé', h('input', { type: 'file', accept: 'application/pdf' }), '20 Mo maximum. Facultatif pour un pli détruit fermé.')]),
      field('folder', 'Dossier (facultatif)', h('input', { type: 'text', maxlength: '80' }), 'Laissez vide : le classement automatique (Pro et Entreprise) s’applique.'),
      field('ocr', 'Texte du document (OCR)', h('textarea', { rows: '3', maxlength: '20000' }), 'Facultatif. Rend le contenu du pli trouvable par la recherche plein texte du client.'),
      field('notes', 'Note (visible par le client)', h('input', { type: 'text', maxlength: '300' })),
      h('p', { class: 'hint', text: 'À l’enregistrement, le client est prévenu par email (PDF joint si sa consigne est « email ») et son webhook est appelé s’il est en formule Entreprise.' }),
      h('div', {}, [btn]), msg
    ]);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!custSel.value) { msg.textContent = 'Choisissez un client.'; return; }
      var file = f.file.files[0];
      if (file && (file.type !== 'application/pdf' || file.size > 20 * 1024 * 1024)) { msg.textContent = 'Le fichier doit être un PDF de 20 Mo maximum.'; return; }
      btn.disabled = true; msg.textContent = 'Dépôt en cours…';
      var id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : null;
      if (!id) { btn.disabled = false; msg.textContent = 'Navigateur trop ancien pour déposer un pli.'; return; }
      var path = file ? custSel.value + '/' + id + '.pdf' : null;
      var upload = file
        ? api('/storage/v1/object/plis/' + path, { method: 'POST', headers: { 'Content-Type': 'application/pdf', 'x-upsert': 'false' }, body: file })
        : Promise.resolve({ ok: true });
      upload.then(function (r) {
        if (!r.ok) throw new Error('upload');
        var row = {
          id: id, customer_id: custSel.value, received_at: f.received.value || today, sender: f.sender.value.trim() || null,
          doc_type: types.value, treatment: treat.value || null, status: status.value, pdf_path: path,
          amount_ttc: f.amount.value === '' ? null : Number(f.amount.value), due_date: f.due.value || null,
          pages: f.pages.value === '' ? null : parseInt(f.pages.value, 10), notes: f.notes.value.trim() || null,
          folder: f.folder.value.trim() || null, ocr_text: f.ocr.value.trim() || null,
          reference: f.reference.value.trim() || null, iban: f.iban.value.replace(/\s+/g, '').toUpperCase() || null,
          scanned_at: file ? new Date().toISOString() : null
        };
        return api('/rest/v1/mail_items', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(row) });
      }).then(function (r) {
        if (!r.ok) { btn.disabled = false; msg.textContent = 'Le pli n’a pas pu être enregistré.'; return; }
        msg.textContent = 'Pli déposé. Notification en cours…';
        return notify({ item_id: id }).then(function (res) {
          btn.disabled = false;
          msg.textContent = 'Pli déposé' + (notifyText(res) ? ' · ' + notifyText(res) : '') + '.';
          f.reference.value = ''; f.iban.value = ''; f.folder.value = ''; f.ocr.value = '';
          f.sender.value = ''; f.amount.value = ''; f.due.value = ''; f.pages.value = ''; f.notes.value = ''; f.file.value = '';
          onDone();
        });
      }).catch(function () { btn.disabled = false; msg.textContent = 'Dépôt impossible. Réessayez.'; });
    });
    return h('div', { class: 'app-card' }, [h('h3', { text: 'Déposer un pli numérisé' }), form]);
  }

  function loadAdminItems(box, info) {
    api('/rest/v1/mail_items?select=*,customers(reference,company,name)&order=created_at.desc&limit=50').then(function (r) { return r.ok ? json(r) : []; }).then(function (items) {
      clear(box); box.appendChild(h('h3', { text: 'Derniers plis déposés' }));
      if (info) box.appendChild(h('p', { class: 'note', role: 'status', text: 'Notification : ' + info }));
      if (!items || !items.length) { box.appendChild(h('p', { class: 'muted', text: 'Aucun pli déposé.' })); return; }
      var rows = items.map(function (it) {
        var sel = h('select', { 'aria-label': 'Statut du pli' }, Object.keys(STATUS_ITEM).map(function (k) { return h('option', { value: k, selected: k === it.status ? 'selected' : false }, [STATUS_ITEM[k]]); }));
        sel.addEventListener('change', function () {
          sel.disabled = true;
          api('/rest/v1/mail_items?id=eq.' + encodeURIComponent(it.id), { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ status: sel.value }) })
            .then(function (r) {
              if (!r.ok) { sel.disabled = false; return; }
              return notify({ item_id: it.id }).then(function (res) { sel.disabled = false; loadAdminItems(box, notifyText(res)); });
            }).catch(function () { sel.disabled = false; });
        });
        var cust = it.customers ? it.customers.reference + ' · ' + (it.customers.company || it.customers.name || '') : '—';
        return h('tr', {}, [h('td', { text: fmtDate(it.received_at) }), h('td', { text: cust }), h('td', { text: it.sender || '—' }), h('td', { text: DOC[it.doc_type] || it.doc_type }), h('td', {}, [sel]), h('td', { class: 'mono', text: it.certificate_ref || '—' })]);
      });
      box.appendChild(h('div', { class: 'tablewrap' }, [h('table', {}, [
        h('thead', {}, [h('tr', {}, ['Reçu le', 'Client', 'Expéditeur', 'Type', 'Statut', 'Attestation'].map(function (t) { return h('th', { scope: 'col', text: t }); }))]),
        h('tbody', {}, rows)
      ])]));
    });
  }

  /* ---------- Démarrage ---------- */
  loadSession();
  var hashResult = readHash();
  if (hashResult && hashResult.error) { viewLogin(hashResult.error); return; }
  if (!session) { viewLogin(); return; }
  var start = session.expires_at && session.expires_at < Math.floor(Date.now() / 1000) + 30 ? refresh() : Promise.resolve(true);
  start.then(function (ok) {
    if (!ok || !session) { viewLogin(); return; }
    api('/auth/v1/user').then(function (r) { return r.ok ? json(r) : null; }).then(function (u) {
      if (!u || !u.email) { saveSession(null); viewLogin(); return; }
      if (MODE === 'admin') viewAdmin(u.email); else viewClient(u.email);
    }).catch(function () { viewLogin('Connexion impossible. Vérifiez votre réseau.'); });
  });
})();
