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
  var DOC = { facture: 'Facture', administratif: 'Administratif', banque: 'Banque', assurance: 'Assurance', contrat: 'Contrat', recommande: 'Recommandé', autre: 'Autre' };

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

    var me = String(email).toLowerCase();
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
      if (member) {
        body.appendChild(h('div', { class: 'app-card' }, [
          h('h3', { text: (c.company || c.name || 'Compte') + ' · ' + (PLAN[c.plan] || c.plan) }),
          h('p', { class: 'muted', text: 'Vous consultez ce compte en tant qu’utilisateur invité par ' + c.owner_email + '. Référence client : ' + c.reference + '.' })
        ]));
      } else {
        body.appendChild(accountCard(c));
      }
      var itemsBox = h('div', { class: 'app-card' });
      body.appendChild(itemsBox);
      itemsPanel(itemsBox, advanced);
      if (!member) {
        if (advanced && active) { body.appendChild(rulesCard(c)); body.appendChild(teamCard(c)); }
        if (c.plan === 'entreprise' && active) body.appendChild(apiCard(c));
        body.appendChild(prefsCard(c));
      }
    }).catch(function () {
      clear(body); body.appendChild(h('p', { class: 'note', text: 'Impossible de charger vos données. Réessayez dans un instant.' }));
    });
  }

  /* Liste des plis : recherche plein texte et dossiers (formules Pro et Entreprise) */
  function itemsPanel(box, advanced) {
    var state = { q: '', folder: '' };
    var holder = h('div', {});
    var q = h('input', { type: 'search', placeholder: 'Rechercher : expéditeur, référence, contenu…', 'aria-label': 'Rechercher dans mes plis', maxlength: '100' });
    var folderSel = h('select', { 'aria-label': 'Dossier' }, [opt('', 'Tous les dossiers')]);
    var go = h('button', { class: 'btn btn-ghost btn-sm', type: 'submit' }, ['Rechercher']);
    var bar = h('form', { class: 'searchbar', role: 'search', novalidate: 'novalidate' }, [q, folderSel, go]);
    bar.addEventListener('submit', function (e) { e.preventDefault(); state.q = q.value.trim(); state.folder = folderSel.value; load(); });
    folderSel.addEventListener('change', function () { state.folder = folderSel.value; load(); });
    function load() {
      var url = '/rest/v1/mail_items?select=*&order=received_at.desc,created_at.desc&limit=200';
      if (state.q) url += '&search=wfts(french).' + encodeURIComponent(state.q.replace(/[(),]/g, ' '));
      if (state.folder) url += '&folder=eq.' + encodeURIComponent(state.folder);
      holder.textContent = 'Chargement…';
      api(url).then(function (r) { return r.ok ? json(r) : []; }).then(function (items) {
        renderItems(holder, items || [], !!(state.q || state.folder));
      }).catch(function () { holder.textContent = 'Chargement impossible.'; });
    }
    box.appendChild(h('h3', { text: 'Mes plis' }));
    if (advanced) {
      box.appendChild(bar);
      api('/rest/v1/mail_items?select=folder&folder=not.is.null&limit=1000').then(function (r) { return r.ok ? json(r) : []; }).then(function (rows) {
        var seen = {};
        (rows || []).forEach(function (x) { if (x.folder) seen[x.folder] = 1; });
        Object.keys(seen).sort().forEach(function (f) { folderSel.appendChild(opt(f, f)); });
      });
    }
    box.appendChild(holder);
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

  function renderItems(box, items, filtered) {
    clear(box);
    if (!items.length) {
      box.appendChild(h('p', { class: 'muted', text: filtered ? 'Aucun pli ne correspond à cette recherche.' : 'Aucun pli pour le moment. Vos plis numérisés apparaîtront ici dès leur réception.' }));
      return;
    }
    var rows = items.map(function (it) {
      var dl = it.pdf_path ? h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function (e) { openPdf(it.pdf_path, e.currentTarget); } }, ['Télécharger']) : h('span', { class: 'muted', text: '—' });
      var cert = it.certificate_ref ? h('button', { class: 'btn btn-ghost btn-sm', type: 'button', title: 'Télécharger l’attestation de destruction', onclick: function (e) { openCertificate(it.id, it.certificate_ref, e.currentTarget); } }, [it.certificate_ref]) : h('span', { class: 'muted', text: '—' });
      return h('tr', {}, [
        h('td', { text: fmtDate(it.received_at) }), h('td', { text: it.sender || '—' }), h('td', { text: DOC[it.doc_type] || it.doc_type }), h('td', { text: it.folder || '—' }),
        h('td', { text: fmtEur(it.amount_ttc) }), h('td', { text: fmtDate(it.due_date) }),
        h('td', {}, [badge(STATUS_ITEM[it.status] || it.status)]),
        h('td', {}, [cert]), h('td', {}, [dl]), h('td', { text: fmtDate(it.expires_at) })
      ]);
    });
    box.appendChild(h('div', { class: 'tablewrap' }, [h('table', {}, [
      h('thead', {}, [h('tr', {}, ['Reçu le', 'Expéditeur', 'Type', 'Dossier', 'Montant TTC', 'Échéance', 'Statut', 'Attestation', 'PDF', 'Conservé jusqu’au'].map(function (t) { return h('th', { scope: 'col', text: t }); }))]),
      h('tbody', {}, rows)
    ])]));
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
