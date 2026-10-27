// Générateur du site Relève : node build.mjs  →  dist/
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PAGES, PLANS, MODES, MODE_LABELS, FAQ } from './content.mjs';

const cfg = JSON.parse(fs.readFileSync('./site.config.json', 'utf8'));
const SITE = (process.env.SITE_URL || cfg.siteUrl).replace(/\/$/, '');
const BRAND = cfg.brand;
const DATE = '2026-10-08';
const OUT = 'dist';
const ORG_ID = `${SITE}/#organization`;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const jsonSafe = (o) => JSON.stringify(o).replace(/</g, '\\u003c');
const eur = (n) => `${n.toLocaleString('fr-FR')} €`;

/* ---------- Ressources versionnées ---------- */
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const minCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*([{}:;,>])\s*/g, '$1').replace(/;}/g, '}').replace(/\n+/g, '').trim();
const css = minCss(fs.readFileSync('src/style.css', 'utf8'));
const js = fs.readFileSync('src/main.js', 'utf8');
const hash = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);
const CSS_FILE = `/assets/style.${hash(css)}.css`;
const JS_FILE = `/assets/main.${hash(js)}.js`;
const write = (p, c) => { const f = path.join(OUT, p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, c); };
for (const f of fs.readdirSync('static')) fs.copyFileSync(path.join('static', f), path.join(OUT, f));
const espaceJs = fs.readFileSync('src/espace.js', 'utf8');
const ESPACE_FILE = `/assets/espace.${hash(espaceJs)}.js`;
write(ESPACE_FILE, espaceJs);
write(CSS_FILE, css);
write(JS_FILE, js);

/* ---------- Libellés courts pour les liens internes ---------- */
const LABEL = {
  '/': 'Accueil',
  '/numerisation-courrier-entreprise/': 'Numérisation de courrier',
  '/scan-courrier-par-email/': 'Scan par email',
  '/dematerialisation-courrier-agents-ia/': 'Courrier pour agents IA',
  '/destruction-courrier-confidentiel/': 'Destruction attestée',
  '/reexpedition-courrier-numerique/': 'Faire suivre son courrier',
  '/pour/tpe-independants/': 'TPE et indépendants',
  '/pour/cabinets-comptables-juridiques/': 'Cabinets comptables et juridiques',
  '/pour/entreprises-en-teletravail/': 'Équipes à distance',
  '/tarifs/': 'Tarifs',
  '/faq/': 'Questions fréquentes',
  '/guides/': 'Guides',
  '/guides/dematerialiser-courrier-papier/': 'Dématérialiser son courrier papier',
  '/guides/automatiser-traitement-facture-papier-agent-ia/': 'Automatiser une facture papier avec un agent IA',
  '/guides/recommande-absent-que-faire/': 'Recommandé en votre absence',
  '/mentions-legales/': 'Mentions légales',
  '/cgv/': 'Conditions générales de vente',
  '/confidentialite/': 'Politique de confidentialité',
};

/* ---------- Gabarit commun ---------- */
const NAV = [['/numerisation-courrier-entreprise/', 'Numérisation'], ['/dematerialisation-courrier-agents-ia/', 'Agents IA'], ['/tarifs/', 'Tarifs'], ['/guides/', 'Guides'], ['/faq/', 'Questions'], ['/espace/', 'Mon espace']];

function header(cur) {
  const links = NAV.map(([p, l]) => `<a href="${p}"${cur === p ? ' aria-current="page"' : ''}>${l}</a>`).join('');
  return `<a class="skip" href="#contenu">Aller au contenu</a>
<header class="top"><div class="wrap">
<a class="brand" href="/" aria-label="${BRAND}, accueil"><span class="brand-mark" aria-hidden="true">R</span>${BRAND}</a>
<nav class="nav" aria-label="Navigation principale">${links}<a class="btn btn-primary btn-sm" href="/tarifs/">Souscrire</a></nav>
<details class="menu"><summary>Menu</summary><div class="menu-list">${links}<a href="/tarifs/"><strong>Souscrire</strong></a></div></details>
</div></header>`;
}

function footer() {
  const col = (title, items) => `<div><h2>${title}</h2><ul>${items.map((p) => `<li><a href="${p}">${LABEL[p]}</a></li>`).join('')}</ul></div>`;
  return `<footer><div class="wrap">
<div class="foot">
<div><a class="brand" href="/"><span class="brand-mark" aria-hidden="true">R</span>${BRAND}</a><p class="note">Votre courrier papier devient une donnée : ouvert, numérisé sous 24 h ouvrées, puis détruit ou réexpédié.</p><p class="note"><a href="mailto:${cfg.contactEmail}">${cfg.contactEmail}</a></p></div>
${col('Services', ['/numerisation-courrier-entreprise/', '/scan-courrier-par-email/', '/dematerialisation-courrier-agents-ia/', '/destruction-courrier-confidentiel/', '/reexpedition-courrier-numerique/'])}
${col('Pour qui', ['/pour/tpe-independants/', '/pour/cabinets-comptables-juridiques/', '/pour/entreprises-en-teletravail/'])}
${col('Ressources', ['/tarifs/', '/guides/', '/guides/recommande-absent-que-faire/', '/faq/'])}
</div>
<div class="foot-bottom"><span>© 2026 ${BRAND}</span><span><a href="/mentions-legales/">Mentions légales</a> · <a href="/cgv/">CGV</a> · <a href="/confidentialite/">Confidentialité</a></span></div>
</div></footer>`;
}

function faqHtml(keys) {
  return `<div class="faq">${keys.map((k, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(FAQ[k][0])}</summary><p>${esc(FAQ[k][1])}</p></details>`).join('')}</div>`;
}
const faqLd = (keys) => ({ '@type': 'FAQPage', mainEntity: keys.map((k) => ({ '@type': 'Question', name: FAQ[k][0], acceptedAnswer: { '@type': 'Answer', text: FAQ[k][1] } })) });

function crumbsHtml(trail) {
  return `<nav class="crumbs wrap" aria-label="Fil d’Ariane"><ol>${trail.map((t, i) => i < trail.length - 1 ? `<li><a href="${t.path}">${esc(t.name)}</a></li>` : `<li aria-current="page">${esc(t.name)}</li>`).join('')}</ol></nav>`;
}
const crumbsLd = (trail) => ({ '@type': 'BreadcrumbList', itemListElement: trail.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, item: SITE + t.path })) });

const ctaBand = (h = 'Ouvrez votre adresse Relève aujourd’hui', p = 'Vos premiers plis numérisés dès le lendemain ouvré de leur réception.') =>
  `<section class="tight"><div class="wrap"><div class="cta-band"><div><h2>${h}</h2><p>${p}</p></div><a class="btn btn-primary" href="/tarifs/">Voir les formules</a></div></div></section>`;

const relatedHtml = (paths) => `<section class="tight"><div class="wrap page-body"><div class="related"><h2 class="eyebrow">Pour aller plus loin</h2><ul>${paths.map((p) => `<li><a href="${p}">${LABEL[p]}</a></li>`).join('')}</ul></div></div></section>`;

function layout({ p, title, desc, body, ld = [], index = true, cur, ogType = 'website', scripts = [] }) {
  const url = SITE + p;
  if (title.length > 62) console.warn(`  ! titre long (${title.length}) ${p}`);
  if (desc.length > 160) console.warn(`  ! description longue (${desc.length}) ${p}`);
  const graph = { '@context': 'https://schema.org', '@graph': ld };
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="${index ? 'index,follow,max-image-preview:large,max-snippet:-1' : 'noindex,follow'}">
<meta name="theme-color" content="#F1F2EC" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0F1320" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${BRAND}">
<meta property="og:locale" content="fr_FR">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Relève : numérisation de courrier d’entreprise sous 24 h ouvrées">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${SITE}/og-image.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,500..800&family=IBM+Plex+Mono:wght@400;500&family=Public+Sans:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="${CSS_FILE}">
<script type="application/ld+json">${jsonSafe(graph)}</script>
</head>
<body>
${header(cur || p)}
<main id="contenu">
${body}
</main>
${footer()}
${scripts.map((x) => `<script src="${x}" defer></script>`).join('\n')}
</body>
</html>`;
}

const orgLd = {
  '@type': 'Organization', '@id': ORG_ID, name: BRAND, url: SITE + '/', logo: `${SITE}/favicon.svg`,
  description: "Relève reçoit le courrier papier des entreprises et des particuliers, le numérise sous 24 h ouvrées, puis le détruit, avec une attestation de destruction, ou le réexpédie.",
  areaServed: { '@type': 'Country', name: 'France' }, knowsLanguage: 'fr', email: cfg.contactEmail,
  address: { '@type': 'PostalAddress', streetAddress: '2 bis rue Hardy', postalCode: '78000', addressLocality: 'Versailles', addressCountry: 'FR' },
  contactPoint: { '@type': 'ContactPoint', contactType: 'customer service', email: cfg.contactEmail, availableLanguage: 'fr' },
};
const siteLd = { '@type': 'WebSite', '@id': `${SITE}/#website`, url: SITE + '/', name: BRAND, inLanguage: 'fr-FR', publisher: { '@id': ORG_ID } };

const pageHero = (pg, trail) => `${crumbsHtml(trail)}
<section class="page-hero"><div class="wrap page-body"><p class="eyebrow">${esc(pg.eyebrow)}</p><h1>${pg.h1}</h1><p class="lead">${pg.lead}</p>
<div class="hero-actions"><a class="btn btn-primary" href="/tarifs/">Voir les formules</a><a class="btn btn-ghost" href="/faq/">Questions fréquentes</a></div></div></section>`;

const sitemap = [];
function emit(p, html, { index = true, file } = {}) {
  write(file || (p.endsWith('/') ? p + 'index.html' : p), html);
  if (index) sitemap.push(p);
}

/* ---------- Pages de contenu ---------- */
for (const pg of PAGES) {
  const isGuide = pg.path.startsWith('/guides/');
  const trail = [{ name: 'Accueil', path: '/' }];
  if (isGuide) trail.push({ name: 'Guides', path: '/guides/' });
  trail.push({ name: LABEL[pg.path], path: pg.path });
  const ld = [orgLd, crumbsLd(trail)];
  if (pg.kind === 'service') {
    ld.push({ '@type': 'Service', '@id': SITE + pg.path + '#service', name: pg.service, serviceType: pg.service, description: pg.desc, url: SITE + pg.path, provider: { '@id': ORG_ID }, areaServed: { '@type': 'Country', name: 'France' }, inLanguage: 'fr-FR' });
  } else {
    ld.push({ '@type': 'Article', headline: pg.h1.replace(/&[^;]+;/g, ''), description: pg.desc, mainEntityOfPage: SITE + pg.path, datePublished: DATE, dateModified: DATE, inLanguage: 'fr-FR', author: { '@id': ORG_ID }, publisher: { '@id': ORG_ID }, image: `${SITE}/og-image.png` });
  }
  if (pg.faq) ld.push(faqLd(pg.faq));
  const body = `${pageHero(pg, trail)}
<section class="tight"><div class="wrap page-body"><div class="prose">${pg.body}</div></div></section>
${pg.faq ? `<section class="tight"><div class="wrap page-body"><h2>Questions fréquentes</h2><div class="gap"></div>${faqHtml(pg.faq)}</div></section>` : ''}
${relatedHtml(pg.related)}
${ctaBand()}`;
  emit(pg.path, layout({ p: pg.path, title: pg.title, desc: pg.desc, body, ld, ogType: isGuide ? 'article' : 'website' }));
}

/* ---------- Cartes de tarifs ---------- */
const planCard = (pl, { features = true } = {}) => {
  const l = cfg.paymentLinks[pl.id];
  return `<article class="plan${pl.reco ? ' reco' : ''}">
${pl.reco ? '<span class="plan-badge">LE PLUS CHOISI</span>' : ''}
<div><h3>${pl.name}</h3><p class="plan-for">${pl.for}</p></div>
<div><div class="price"><strong>${pl.month} €</strong><span>/ mois</span></div><p class="price-alt">ou ${eur(pl.year)} / an, 2 mois offerts</p></div>
<div class="quota"><span>${pl.quota} plis / mois</span><span>puis ${pl.extra} / pli</span></div>
${features ? `<ul>${pl.feat.map((f) => `<li><span>${f}</span></li>`).join('')}</ul>` : ''}
<div class="plan-cta"><a class="btn ${pl.reco ? 'btn-primary' : 'btn-ghost'}" href="${l.mensuel}" rel="nofollow noopener">Souscrire à ${pl.name} (mensuel)</a><a class="alt" href="${l.annuel}" rel="nofollow noopener">Ou en annuel : ${eur(pl.year)}</a></div>
</article>`;
};

/* ---------- Accueil ---------- */
{
  const m = MODES.email;
  const flowHtml = m.steps.map((s, i) => `<li class="st done" data-i="${i}"><span class="node">${i + 1}</span><div class="st-body"><span class="st-time">${esc(s.time)}</span><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p>${s.tag ? `<span class="st-tag${s.warn ? ' warn' : ''}">${esc(s.tag)}</span>` : ''}</div></li>`).join('');
  const logHtml = m.steps.filter((s) => !s.skip && s.time !== '—').map((s) => `<li><time>${esc(s.time.split(' · ')[1])}</time><span><b>${esc(s.t)}</b> — ${esc(s.d)}</span></li>`).join('');
  const chips = Object.keys(MODES).map((k, i) => `<button class="chip" type="button" data-mode="${k}" aria-pressed="${i === 0}">${MODE_LABELS[k]}</button>`).join('');
  const faqKeys = ['arrivee', 'original', 'delai', 'recommandes', 'domiciliation', 'valeur'];
  const svc = [
    ['/numerisation-courrier-entreprise/', 'Numérisation', 'Scan complet et lisible', 'Recto-verso en 300 dpi, PDF avec texte reconnu, enveloppe photographiée. Vous retrouvez tout par recherche.'],
    ['/scan-courrier-par-email/', 'Envoi personnalisé', 'Email, espace client ou API', 'PDF envoyé aux adresses de votre choix, selon l’expéditeur, avec copie dans votre espace.'],
    ['/reexpedition-courrier-numerique/', 'Mise en route', 'Faire suivre son courrier', 'Réexpédition La Poste, changement d’adresse et procuration pour les recommandés.'],
    ['/destruction-courrier-confidentiel/', 'Destruction', 'Destruction attestée', 'Après numérisation, ou sans ouverture pour la publicité. Attestation de destruction horodatée pour chaque pli.'],
  ];
  const who = [
    ['/pour/tpe-independants/', 'TPE et indépendants', 'Les factures partent chez votre comptable, les échéances vous sont signalées.'],
    ['/pour/cabinets-comptables-juridiques/', 'Cabinets', 'Le courrier de vos clients, classé par dossier, avec traçabilité et plis fermés sur demande.'],
    ['/pour/entreprises-en-teletravail/', 'Équipes à distance', 'Personne au bureau, personne pour ouvrir : Relève joue ce rôle et partage le résultat.'],
  ];
  const body = `<section class="hero"><div class="wrap">
<div class="hero-copy">
<p class="eyebrow">Courrier papier → données numériques</p>
<h1>Numérisation de courrier : vos plis papier en PDF sous 24 h</h1>
<p class="lead">Faites suivre votre courrier à Relève. Chaque pli est ouvert, numérisé sous 24 h ouvrées, envoyé là où vous le voulez (email, espace client ou agents IA), puis détruit, avec une attestation de destruction.</p>
<div class="hero-actions"><a class="btn btn-primary" href="/tarifs/">Choisir une formule</a><a class="btn btn-ghost" href="#parcours">Voir le parcours d’un pli</a></div>
<ul class="hero-facts"><li>Numérisé sous 24 h ouvrées</li><li>Original détruit, attestation fournie</li><li>Sans engagement en mensuel</li></ul>
</div>
<div class="desk" aria-hidden="true">
<div class="envelope"><div class="stamp">0,96</div><div class="postmark">REÇU<br>08·10·26<br>09:42</div><div class="addr">SARL Atelier Morel<br><b>c/o Relève · Réf. RLV-48213</b><br>Adresse de réception</div><div class="scanline"></div></div>
<pre class="datacard"><span class="k">pli</span>          <span class="s">RLV-2026-104582</span>
<span class="k">type</span>         <span class="v">facture</span>
<span class="k">expediteur</span>   <span class="v">Fournisseur d'électricité</span>
<span class="k">montant_ttc</span>  <span class="s">184,36 €</span>
<span class="k">echeance</span>     <span class="s">23/10/2026</span>
<span class="k">original</span>     <span class="v">détruit · DST-2026-0412</span></pre>
</div></div></section>

<section id="parcours" class="band"><div class="wrap">
<div class="sec-head"><p class="eyebrow">Le parcours de votre courrier</p><h2>Ce qui arrive à chaque lettre, étape par étape</h2><p class="lead">Choisissez un traitement : le schéma montre exactement par où passe votre pli, et à quelle heure.</p></div>
<div class="modes" role="group" aria-labelledby="modes-label"><p class="modes-label" id="modes-label">Que voulez-vous faire de ce pli ?</p>${chips}</div>
<ol class="flow" id="flow" aria-live="polite">${flowHtml}</ol>
<div class="log"><div class="log-head"><span class="mono">Journal du pli RLV-2026-104582</span><span id="log-sub">${esc(m.sub)}</span></div><ol id="log">${logHtml}</ol></div>
<script type="application/json" id="modes-data">${jsonSafe(MODES)}</script>
</div></section>

<section><div class="wrap">
<div class="sec-head"><p class="eyebrow">Nos services</p><h2>Une consigne par défaut, des règles par expéditeur</h2><p class="lead">Fixez une consigne générale à l’inscription, puis affinez : les factures vers la comptabilité, l’administratif dans votre espace, les publicités à la destruction.</p></div>
<div class="grid g4">${svc.map(([h, e, t, d]) => `<article class="item"><p class="eyebrow">${e}</p><h3><a href="${h}">${t}</a></h3><p>${d}</p><a class="more" href="${h}">En savoir plus</a></article>`).join('')}</div>
<div class="callout" role="note"><span aria-hidden="true">⚠</span><p><strong>Jamais détruits :</strong> chèques, cartes bancaires, pièces d’identité, cartes Vitale et actes originaux. Ils sont numérisés, signalés dans votre espace et réexpédiés en lettre suivie.</p></div>
</div></section>

<section class="band"><div class="wrap two">
<div class="prose"><p class="eyebrow">Pour vos agents IA</p><h2>Le courrier devient une donnée que vos agents peuvent lire</h2><p class="lead">Un PDF ne suffit pas à un agent. Relève extrait les informations utiles de chaque pli et les envoie dans un format structuré.</p>
<ul class="ticks"><li>Expéditeur, type de document, montant, échéance, références de contrat</li><li>Webhook à chaque nouveau pli, API pour retrouver l’historique</li><li>Clé d’API pour vos agents IA, PDF accessible par lien temporaire</li></ul>
<a class="more" href="/dematerialisation-courrier-agents-ia/">Courrier papier pour agents IA</a></div>
<pre class="code" aria-label="Exemple de données transmises pour un pli"><span class="k">{</span>
  <span class="k">"pli":</span> <span class="v">"RLV-2026-104582"</span>,
  <span class="k">"recu_le":</span> <span class="v">"2026-10-08T09:42:00+02:00"</span>,
  <span class="k">"numerise_le":</span> <span class="v">"2026-10-08T11:15:00+02:00"</span>,
  <span class="k">"expediteur":</span> <span class="v">"Fournisseur d'électricité"</span>,
  <span class="k">"type":</span> <span class="v">"facture"</span>,
  <span class="k">"montant_ttc":</span> <span class="n">184.36</span>,
  <span class="k">"echeance":</span> <span class="v">"2026-10-23"</span>,
  <span class="k">"original":</span> <span class="v">"detruit"</span>,
  <span class="k">"certificat":</span> <span class="v">"DST-2026-0412"</span>
<span class="k">}</span></pre>
</div></section>

<section><div class="wrap">
<div class="sec-head"><p class="eyebrow">Pour qui</p><h2>Pour ceux qui n’ont pas le temps d’ouvrir le courrier</h2></div>
<div class="grid g3">${who.map(([h, t, d]) => `<article class="item"><h3><a href="${h}">${t}</a></h3><p>${d}</p><a class="more" href="${h}">Voir le détail</a></article>`).join('')}</div>
</div></section>

<section id="tarifs" class="band"><div class="wrap">
<div class="sec-head"><p class="eyebrow">Tarifs</p><h2>Une formule selon votre volume de courrier</h2><p class="lead">Un « pli » est une enveloppe reçue, quel que soit son nombre de pages. Sans engagement en mensuel, paiement sécurisé par Stripe.</p></div>
<div class="plans">${PLANS.map((pl) => planCard(pl)).join('')}</div>
<p class="note">Prix nets : TVA non applicable, art. 293 B du CGI. Réexpédition des originaux : frais postaux refacturés au tarif La Poste. <a href="/tarifs/">Comparer les formules en détail</a>.</p>
</div></section>

<section id="securite"><div class="wrap">
<div class="sec-head"><p class="eyebrow">Confidentialité</p><h2>Votre courrier ne traîne nulle part</h2><p class="lead">Le papier reste le moins longtemps possible entre nos mains, et chaque manipulation laisse une trace que vous pouvez consulter.</p></div>
<div class="grid g3">
${[['24 h ouvrées', 'Numérisé dès réception', 'Boîte aux lettres relevée chaque jour ouvré. Votre pli est numérisé au plus tard le jour ouvré suivant.'], ['Attestation', 'Destruction attestée', 'L’original est détruit juste après numérisation. Une attestation de destruction horodatée, établie par Relève, rejoint votre espace. Elle n’est pas délivrée par un organisme tiers et ne vise aucun niveau de sécurité normalisé.'], ['Un seul opérateur', 'Une seule personne ouvre', 'Le courrier est ouvert et numérisé par l’exploitant de Relève, tenu au secret de la correspondance et à la confidentialité.'], ['Suivi', 'Les étapes sont datées', 'Réception, numérisation, envoi et destruction : les dates sont visibles dans votre espace.'], ['Chiffrement', 'Stockage chiffré', 'Fichiers chiffrés au repos et en transit, hébergés dans l’Union européenne. La durée de conservation dépend de votre formule.'], ['RGPD', 'Contrat de sous-traitance', 'Un accord de traitement des données est signé avec chaque client professionnel. Export ou suppression sur demande.']].map(([e, t, d]) => `<article class="item"><p class="eyebrow">${e}</p><h3>${t}</h3><p>${d}</p></article>`).join('')}
</div></div></section>

<section id="faq" class="band"><div class="wrap">
<div class="sec-head"><p class="eyebrow">Questions fréquentes</p><h2>Avant de vous lancer</h2></div>
${faqHtml(faqKeys)}
<p class="note"><a href="/faq/">Toutes les questions</a></p>
</div></section>
${ctaBand()}`;
  const ld = [orgLd, siteLd,
    { '@type': 'WebPage', '@id': SITE + '/#webpage', url: SITE + '/', name: 'Numérisation de courrier d’entreprise sous 24 h', isPartOf: { '@id': `${SITE}/#website` }, about: { '@id': ORG_ID }, inLanguage: 'fr-FR', dateModified: DATE },
    { '@type': 'Service', name: 'Numérisation de courrier professionnel', serviceType: 'Numérisation et traitement de courrier', provider: { '@id': ORG_ID }, areaServed: { '@type': 'Country', name: 'France' }, description: 'Réception, ouverture, numérisation sous 24 h ouvrées, envoi personnalisé et destruction du courrier papier avec attestation.' },
    faqLd(faqKeys)];
  emit('/', layout({ scripts: [JS_FILE], p: '/', title: 'Numérisation de courrier d’entreprise sous 24 h | Relève', desc: 'Faites suivre votre courrier à Relève : ouverture, scan en PDF sous 24 h ouvrées, envoi par email ou à vos agents IA, destruction attestée. Dès 9 € HT/mois.', body, ld }));
}

/* ---------- Tarifs ---------- */
{
  const p = '/tarifs/';
  const trail = [{ name: 'Accueil', path: '/' }, { name: 'Tarifs', path: p }];
  const faqKeys = ['quota', 'resiliation', 'paiement', 'domiciliation'];
  const body = `${crumbsHtml(trail)}
<section class="page-hero"><div class="wrap"><p class="eyebrow">Tarifs</p><h1>Tarifs de numérisation de courrier : dès 9&nbsp;€ HT par mois</h1>
<p class="lead">Trois formules selon le nombre de plis reçus chaque mois. Sans engagement en mensuel, deux mois offerts en annuel. Le paiement se fait sur une page sécurisée Stripe.</p></div></section>
<section class="tight"><div class="wrap"><div class="plans">${PLANS.map((pl) => planCard(pl)).join('')}</div>
<p class="note">Prix nets : TVA non applicable, art. 293 B du CGI. Réexpédition des originaux : frais postaux refacturés au tarif La Poste en vigueur. Un pli est une enveloppe reçue, quel que soit son nombre de pages.</p></div></section>
<section class="tight"><div class="wrap"><h2>Comparer les formules</h2><div class="gap"></div>
${`<div class="tablewrap"><table><thead><tr><th scope="col">Fonction</th>${PLANS.map((x) => `<th scope="col">${x.name}</th>`).join('')}</tr></thead><tbody>
<tr><td>Prix mensuel (TVA non applicable)</td>${PLANS.map((x) => `<td>${x.month} €</td>`).join('')}</tr>
<tr><td>Prix annuel (TVA non applicable)</td>${PLANS.map((x) => `<td>${eur(x.year)}</td>`).join('')}</tr>
<tr><td>Plis inclus par mois</td>${PLANS.map((x) => `<td>${x.quota}</td>`).join('')}</tr>
<tr><td>Pli supplémentaire</td>${PLANS.map((x) => `<td>${x.extra}</td>`).join('')}</tr>
<tr><td>Numérisation sous 24 h ouvrées</td><td>Oui</td><td>Oui</td><td>Oui</td></tr>
<tr><td>Envoi par email et espace client</td><td>Oui</td><td>Oui</td><td>Oui</td></tr>
<tr><td>Destruction avec attestation</td><td>Oui</td><td>Oui</td><td>Oui</td></tr>
<tr><td>Règles par expéditeur, classement automatique</td><td>Non</td><td>Oui</td><td>Oui</td></tr>
<tr><td>Réexpédition des originaux</td><td>Non</td><td>Oui</td><td>Oui</td></tr>
<tr><td>API, webhooks, extraction de données</td><td>Non</td><td>Non</td><td>Oui</td></tr>
<tr><td>Archives</td><td>12 mois</td><td>5 ans</td><td>10 ans</td></tr>
<tr><td>Utilisateurs</td><td>1</td><td>5</td><td>Illimité</td></tr></tbody></table></div>`}
</div></section>
<section class="tight"><div class="wrap page-body"><h2>Questions sur les tarifs</h2><div class="gap"></div>${faqHtml(faqKeys)}</div></section>
${relatedHtml(['/numerisation-courrier-entreprise/', '/reexpedition-courrier-numerique/', '/faq/'])}`;
  const prod = PLANS.map((pl) => ({
    '@type': 'Product', name: `Relève ${pl.name}`, description: `${pl.quota} plis numérisés par mois. ${pl.for}.`, brand: { '@type': 'Brand', name: BRAND }, url: SITE + p,
    offers: [
      { '@type': 'Offer', name: `${pl.name} mensuel`, priceCurrency: 'EUR', price: String(pl.month), priceSpecification: { '@type': 'UnitPriceSpecification', price: pl.month, priceCurrency: 'EUR', unitCode: 'MON', valueAddedTaxIncluded: true }, availability: 'https://schema.org/InStock', url: SITE + p },
      { '@type': 'Offer', name: `${pl.name} annuel`, priceCurrency: 'EUR', price: String(pl.year), priceSpecification: { '@type': 'UnitPriceSpecification', price: pl.year, priceCurrency: 'EUR', unitCode: 'ANN', valueAddedTaxIncluded: true }, availability: 'https://schema.org/InStock', url: SITE + p },
    ],
  }));
  emit(p, layout({ p, title: 'Tarifs numérisation de courrier dès 9 €/mois | Relève', desc: 'Trois formules pour numériser votre courrier : Essentiel 9 €, Pro 29 €, Entreprise 89 € par mois. Sans engagement en mensuel, 2 mois offerts en annuel.', body, ld: [orgLd, crumbsLd(trail), ...prod, faqLd(faqKeys)] }));
}

/* ---------- FAQ ---------- */
{
  const p = '/faq/';
  const trail = [{ name: 'Accueil', path: '/' }, { name: 'Questions fréquentes', path: p }];
  const keys = Object.keys(FAQ);
  const body = `${crumbsHtml(trail)}
<section class="page-hero"><div class="wrap page-body"><p class="eyebrow">Questions fréquentes</p><h1>Questions fréquentes sur la numérisation du courrier</h1><p class="lead">Tout ce qu’il faut savoir avant de faire suivre votre courrier : délais, destruction, recommandés, confidentialité, paiement.</p></div></section>
<section class="tight"><div class="wrap page-body">${faqHtml(keys)}</div></section>
${relatedHtml(['/tarifs/', '/numerisation-courrier-entreprise/', '/reexpedition-courrier-numerique/'])}${ctaBand()}`;
  emit(p, layout({ p, title: 'Questions fréquentes sur la numérisation du courrier | Relève', desc: 'Délai de numérisation, destruction des originaux, recommandés, domiciliation, RGPD, paiement : les réponses aux questions sur le service Relève.', body, ld: [orgLd, crumbsLd(trail), faqLd(keys)] }));
}

/* ---------- Index des guides ---------- */
{
  const p = '/guides/';
  const trail = [{ name: 'Accueil', path: '/' }, { name: 'Guides', path: p }];
  const items = PAGES.filter((x) => x.path.startsWith('/guides/'));
  const body = `${crumbsHtml(trail)}
<section class="page-hero"><div class="wrap page-body"><p class="eyebrow">Guides</p><h1>Guides pour dématérialiser son courrier</h1><p class="lead">Méthodes, checklists et bonnes pratiques pour passer du courrier papier au traitement numérique et automatisé.</p></div></section>
<section class="tight"><div class="wrap"><div class="grid g3">${items.map((g) => `<article class="item"><p class="eyebrow">Guide</p><h2 class="h3"><a href="${g.path}">${g.h1}</a></h2><p>${g.desc}</p><a class="more" href="${g.path}">Lire le guide</a></article>`).join('')}</div></div></section>
${ctaBand()}`;
  emit(p, layout({ p, title: 'Guides : dématérialiser son courrier papier | Relève', desc: 'Guides pratiques : dématérialiser son courrier papier, automatiser une facture avec un agent IA, gérer une lettre recommandée en votre absence.', body, ld: [orgLd, crumbsLd(trail), { '@type': 'CollectionPage', name: 'Guides Relève', url: SITE + p, inLanguage: 'fr-FR', hasPart: items.map((g) => ({ '@type': 'Article', headline: g.h1, url: SITE + g.path })) }] }));
}

/* ---------- Pages non indexées ---------- */
{
  const p = '/merci/';
  const body = `<section class="page-hero"><div class="wrap page-body"><div class="done-stamp" aria-hidden="true">PAIEMENT<br>REÇU</div><h1>Bienvenue chez Relève</h1>
<p class="lead">Votre abonnement est confirmé. Stripe vous envoie le reçu par email.</p>
<div class="prose"><h2>Prochaines étapes</h2>${steps3()}<div class="callout info" role="note"><span aria-hidden="true">i</span><p>Connectez-vous à votre espace client avec l’email utilisé pour le paiement : votre référence « RLV-… » et votre adresse de réception s’y trouvent. Ajoutez la ligne « c/o Relève · Réf. RLV-… » sous le nom de votre société.</p></div></div>
<div class="hero-actions"><a class="btn btn-primary" href="/espace/">Accéder à mon espace</a><a class="btn btn-ghost" href="/reexpedition-courrier-numerique/">Faire suivre mon courrier</a></div></div></section>`;
  emit(p, layout({ p, title: 'Merci pour votre abonnement | Relève', desc: 'Votre abonnement Relève est confirmé.', body, ld: [orgLd], index: false }), { index: false });
}
function steps3() { return `<ol class="steps-list"><li><span>Souscrivez un service de réexpédition auprès de La Poste vers votre adresse Relève.</span></li><li><span>Signez la procuration pour la réception de vos recommandés.</span></li><li><span>Ajoutez vos règles par expéditeur dans votre espace client.</span></li></ol>`; }

const legal = (p, title, h1, inner) => {
  const body = `<section class="page-hero"><div class="wrap page-body"><h1>${h1}</h1><div class="prose">${inner}</div></div></section>`;
  emit(p, layout({ p, title: `${title} | Relève`, desc: `${h1} du site Relève.`, body, ld: [orgLd], index: false }), { index: false });
};



const TBD = '<span class="tbd">[à compléter]</span>';
const LG = (k) => (cfg.legal && cfg.legal[k] && String(cfg.legal[k]).trim()) ? esc(String(cfg.legal[k]).trim()) : TBD;
const UPDATED = '15 octobre 2026';
const MAIL = esc(cfg.contactEmail);
const ADDR = esc((cfg.receptionAddress || []).join(', '));

legal('/mentions-legales/', 'Mentions légales', 'Mentions légales', `
<p class="muted">Dernière mise à jour : ${UPDATED}.</p>
<h2>Éditeur du site</h2>
<p>Le site <strong>releve-courrier.com</strong> est édité par :<br>
Dénomination ou nom : ${LG('editor')}<br>
Statut : ${LG('status')}<br>
SIREN : ${LG('siren')} · SIRET : ${LG('siret')} · Code APE : ${LG('ape')}<br>
Activité commencée le ${LG('startDate')}<br>${cfg.legal && cfg.legal.capital ? `Capital social : ${esc(cfg.legal.capital)}<br>` : ''}
N° de TVA intracommunautaire : ${LG('vat')}<br>
Adresse : Relève Courrier, ${ADDR}<br>
Email : <a href="mailto:${MAIL}">${MAIL}</a><br>
Téléphone : ${LG('phone')}</p>
<p>Directeur de la publication : ${LG('director')}.</p>
<h2>Hébergement et prestataires techniques</h2>
<ul>
<li><strong>Hébergement du site</strong> : Netlify, Inc., 512 2nd Street, Suite 200, San Francisco, CA 94107, États-Unis. <a href="https://www.netlify.com" rel="noopener">netlify.com</a></li>
<li><strong>Base de données et stockage des fichiers</strong> : Supabase, Inc., hébergés dans l’Union européenne (Francfort, Allemagne).</li>
<li><strong>Paiement en ligne</strong> : Stripe Payments Europe, Ltd., 1 Grand Canal Street Lower, Dublin 2, Irlande. Relève ne conserve aucune donnée de carte bancaire.</li>
<li><strong>Nom de domaine et messagerie</strong> : Hostinger International Ltd.</li>
<li><strong>Polices de caractères</strong> : Google Fonts (Google Ireland Limited).</li>
</ul>
<h2>Propriété intellectuelle</h2>
<p>Les textes, graphismes, logos et éléments du site sont la propriété de l’éditeur ou utilisés avec autorisation. Toute reproduction, représentation ou réutilisation, totale ou partielle, sans accord écrit préalable est interdite.</p>
<h2>Données personnelles et cookies</h2>
<p>Le traitement des données personnelles est décrit dans la <a href="/confidentialite/">politique de confidentialité</a>. Le site n’utilise pas de cookie publicitaire ni de traceur de mesure d’audience ; seul le navigateur du client connecté conserve une session technique dans son espace client.</p>
<h2>Responsabilité</h2>
<p>L’éditeur s’efforce de fournir des informations exactes et à jour, sans garantie d’exhaustivité. Les informations du site ne constituent pas un conseil juridique, fiscal ou comptable. L’éditeur ne saurait être tenu responsable de l’usage fait de ces informations, ni du contenu des sites tiers vers lesquels le site renvoie.</p>
<h2>Droit applicable</h2>
<p>Le site est soumis au droit français. Pour toute question ou signalement de contenu : <a href="mailto:${MAIL}">${MAIL}</a>.</p>`);

legal('/cgv/', 'Conditions générales de vente', 'Conditions générales de vente', `
<p class="muted">Version du ${UPDATED}.</p>
<h2>1. Identité du prestataire</h2>
<p>Les présentes conditions générales de vente (« CGV ») régissent les services proposés sous la marque <strong>Relève</strong> par ${LG('editor')}, ${LG('status')}, SIREN ${LG('siren')}, dont l’adresse est ${ADDR} (« Relève »). Contact : <a href="mailto:${MAIL}">${MAIL}</a>.</p>
<p>Elles s’appliquent à toute souscription à un abonnement effectuée sur le site releve-courrier.com par un client, professionnel ou consommateur (« le Client »). La souscription vaut acceptation sans réserve des CGV, que le Client reconnaît avoir lues avant son paiement.</p>

<h2>2. Description du service</h2>
<p>Relève reçoit à son adresse le courrier postal destiné au Client (adressé « c/o Relève » avec la référence client), l’ouvre, le numérise en PDF, puis le traite selon la consigne du Client : mise à disposition dans l’espace client, envoi par email, envoi par API et webhook (formule Entreprise), réexpédition de l’original ou destruction.</p>
<ul>
<li><strong>Délai de numérisation</strong> : au plus tard 24 heures ouvrées après la réception du pli par Relève. Il s’agit d’un objectif de service, hors jours fériés et fermetures exceptionnelles.</li>
<li><strong>Destruction</strong> : l’original papier est détruit après numérisation, sauf si le Client a demandé sa réexpédition ou sa conservation. Une attestation de destruction numérotée, établie par Relève (et non par un organisme tiers), est mise à disposition dans l’espace client. Elle ne vise aucun niveau de sécurité normalisé.</li>
<li><strong>Conservation des copies numériques</strong> : 12 mois (Essentiel), 5 ans (Pro) ou 10 ans (Entreprise) à compter de la réception du pli. Passé ce délai, les copies sont supprimées automatiquement.</li>
<li><strong>Quota</strong> : chaque formule inclut un nombre de plis par mois (30, 150 ou 600). Les plis supplémentaires sont facturés au tarif indiqué sur la page <a href="/tarifs/">Tarifs</a>.</li>
</ul>
<p>Relève <strong>n’est pas une société de domiciliation</strong> : l’adresse c/o Relève ne peut pas servir de siège social ni d’adresse d’immatriculation. La copie numérique est une copie : elle n’a pas valeur d’archivage probant certifié.</p>

<h2>3. Mandat donné à Relève</h2>
<p>En souscrivant, le Client donne à Relève mandat exprès de réceptionner, d’ouvrir, de lire pour les besoins de la numérisation et du classement, de numériser, de transmettre, de détruire ou de réexpédier le courrier qui lui est adressé, conformément à ses consignes. Le Client garantit être habilité à donner ce mandat, y compris, pour une société, au nom de celle-ci, et pour tout courrier adressé à des tiers dont il serait mandataire.</p>
<p>Relève traite le courrier de façon confidentielle, dans le respect du secret des correspondances. L’accès aux contenus est limité aux personnes autorisées, et aucun contenu n’est utilisé à d’autres fins que l’exécution du service.</p>

<h2>4. Courrier exclu</h2>
<p>Ne sont pas pris en charge : les colis et envois volumineux, les produits dangereux, illicites ou périssables, ainsi que le courrier adressé à une personne non couverte par l’abonnement. Les chèques, moyens de paiement, pièces d’identité, titres, actes et documents originaux à valeur juridique ne sont jamais détruits : ils sont conservés ou réexpédiés au Client selon la procédure convenue. Relève peut refuser ou retourner à l’expéditeur tout courrier non conforme.</p>
<p>Les lettres recommandées sont signées par Relève au nom du Client, qui en autorise expressément la réception. Le délai légal de retrait court à compter de la présentation à l’adresse de Relève, et non de la date de consultation par le Client.</p>

<h2>5. Prix et facturation</h2>
<p>Les prix sont indiqués en euros. <strong>TVA non applicable, art. 293 B du CGI</strong> : le prix affiché est le prix à payer. Les tarifs applicables sont ceux affichés sur le site au jour de la souscription. Relève peut les modifier ; toute modification est notifiée au Client par email au moins 30 jours avant son application et ne s’applique qu’au renouvellement suivant.</p>
<p>Le paiement s’effectue par carte bancaire via la plateforme sécurisée Stripe, à la souscription puis à chaque échéance (mensuelle ou annuelle). Une facture est mise à disposition par Stripe et dans le portail de facturation. En cas d’échec de paiement, Relève peut suspendre le service après relance, et le résilier si l’impayé persiste.</p>
<p>Pour les clients professionnels, tout retard de paiement entraîne de plein droit des pénalités calculées sur la base de trois fois le taux d’intérêt légal, ainsi qu’une indemnité forfaitaire de 40 € pour frais de recouvrement (articles L. 441-10 et D. 441-5 du Code de commerce).</p>

<h2>6. Durée, renouvellement et résiliation</h2>
<p>L’abonnement est conclu pour un mois ou un an selon la formule choisie, et se renouvelle tacitement pour une durée identique. Le Client peut le résilier à tout moment depuis son espace client (portail de facturation) ou par email. La résiliation prend effet à la fin de la période de facturation en cours ; le service reste disponible jusqu’à cette date. Aucun remboursement au prorata n’est dû pour la période en cours, sauf disposition légale contraire.</p>
<p>À la fin de l’abonnement, le courrier reçu ensuite n’est plus traité. Le Client dispose de 30 jours pour télécharger ses documents ; passé ce délai, ses données sont supprimées, sauf obligation légale de conservation. Relève peut résilier l’abonnement pour manquement grave du Client (usage illicite, impayé, courrier exclu répété), après mise en demeure restée sans effet pendant 8 jours.</p>

<h2>7. Droit de rétractation des consommateurs</h2>
<p>Lorsque le Client est un consommateur (personne physique agissant à des fins étrangères à son activité professionnelle), il dispose d’un délai de <strong>14 jours</strong> à compter de la souscription pour se rétracter, sans avoir à motiver sa décision, en écrivant à <a href="mailto:${MAIL}">${MAIL}</a>, en indiquant sa référence client et sa volonté de se rétracter.</p>
<p>Le Client consommateur demande expressément que le service commence dès la souscription. S’il se rétracte, il paie la part du service déjà fournie jusqu’à la communication de sa décision, calculée au prorata du prix de l’abonnement (article L. 221-25 du Code de la consommation) ; le surplus est remboursé sous 14 jours par le même moyen de paiement. Le droit de rétractation ne s’applique pas aux clients professionnels, sauf si le contrat n’entre pas dans le champ de leur activité principale et que leur effectif est de cinq salariés au plus.</p>

<h2>8. Responsabilité</h2>
<p>Relève est tenue d’une obligation de moyens. Elle n’est responsable que des dommages directs, certains et prévisibles résultant d’un manquement à ses obligations, notamment en cas de perte, de destruction non demandée ou de divulgation d’un pli sous sa garde. Sa responsabilité est plafonnée, pour les clients professionnels, au montant des sommes payées par le Client au cours des 12 derniers mois, et exclut les préjudices indirects (perte d’exploitation, de chance, d’image, de clientèle). Ces limites ne s’appliquent pas en cas de faute lourde ou dolosive, ni pour les dommages corporels, ni à l’égard des consommateurs lorsque la loi l’interdit.</p>
<p>Relève n’est pas responsable des retards ou de l’indisponibilité résultant d’un cas de force majeure, d’une défaillance du réseau postal, d’un prestataire tiers ou d’une information erronée communiquée par le Client. Le Client reste responsable du contenu de son courrier et de l’exactitude de la consigne qu’il donne, et doit informer ses expéditeurs de son adresse.</p>

<h2>9. Données personnelles</h2>
<p>Pour les contenus du courrier numérisé, Relève agit comme sous-traitant du Client, qui est responsable de traitement ; pour les données de gestion de l’abonnement, Relève est responsable de traitement. Les modalités, les destinataires, les durées de conservation et les droits des personnes sont précisés dans la <a href="/confidentialite/">politique de confidentialité</a>. Un accord de sous-traitance (article 28 du RGPD) est disponible sur demande à <a href="mailto:${MAIL}">${MAIL}</a>.</p>

<h2>10. Réclamations et médiation</h2>
<p>Toute réclamation peut être adressée à <a href="mailto:${MAIL}">${MAIL}</a>. Relève s’engage à répondre sous 15 jours. Le Client consommateur peut recourir gratuitement au médiateur de la consommation dont relève Relève : ${LG('mediator')}, ainsi qu’à la plateforme européenne de règlement en ligne des litiges.</p>

<h2>11. Modification des CGV</h2>
<p>Relève peut modifier les CGV à tout moment. Les CGV applicables sont celles en vigueur à la date de la souscription ou du dernier renouvellement ; les modifications sont notifiées par email 30 jours avant leur entrée en vigueur, et le Client peut résilier avant cette date.</p>

<h2>12. Droit applicable et juridiction</h2>
<p>Les CGV sont soumises au droit français. En cas de litige avec un client professionnel, et à défaut d’accord amiable, les tribunaux du ressort de Versailles sont seuls compétents. Pour un consommateur, les règles légales de compétence s’appliquent.</p>`);


legal('/confidentialite/', 'Politique de confidentialité', 'Politique de confidentialité', `
<p class="muted">Dernière mise à jour : ${UPDATED}.</p>
<h2>1. Qui est responsable de vos données ?</h2>
<p>${LG('editor')}, ${ADDR}, exploite le service Relève. Contact pour toute question sur vos données : <a href="mailto:${MAIL}">${MAIL}</a>.</p>
<p>Relève a deux rôles distincts :</p>
<ul>
<li><strong>Responsable de traitement</strong> pour les données de gestion de votre compte et de votre abonnement (identité, coordonnées, facturation, connexion).</li>
<li><strong>Sous-traitant</strong> (article 28 du RGPD) pour le contenu de votre courrier : vous restez responsable de traitement des données que contiennent vos documents, et Relève ne les traite que sur vos instructions.</li>
</ul>
<h2>2. Données traitées, finalités et bases légales</h2>
<div class="tablewrap"><table><thead><tr><th scope="col">Données</th><th scope="col">Finalité</th><th scope="col">Base légale</th></tr></thead><tbody>
<tr><td>Nom, société, email, téléphone, adresse de facturation, formule, préférences de traitement</td><td>Gérer l’abonnement et fournir le service</td><td>Exécution du contrat</td></tr>
<tr><td>Données de paiement (traitées par Stripe ; Relève ne voit pas le numéro de carte)</td><td>Encaissement, facturation</td><td>Exécution du contrat</td></tr>
<tr><td>Courrier reçu et numérisé : expéditeur, type, montant, échéance, références, contenu du PDF</td><td>Numériser, classer, transmettre, détruire ou réexpédier le courrier</td><td>Exécution du contrat (Relève agit pour votre compte)</td></tr>
<tr><td>Email de connexion, jeton de session</td><td>Authentifier l’accès à l’espace client</td><td>Exécution du contrat, sécurité</td></tr>
<tr><td>Factures et pièces comptables</td><td>Obligations comptables et fiscales</td><td>Obligation légale</td></tr>
<tr><td>Messages envoyés à l’adresse de contact</td><td>Répondre à vos demandes</td><td>Intérêt légitime</td></tr>
</tbody></table></div>
<h2>3. Destinataires et sous-traitants</h2>
<p>Vos données sont accessibles aux seules personnes autorisées de Relève et à ces prestataires, choisis pour leurs garanties :</p>
<ul>
<li><strong>Supabase</strong> : base de données, authentification et stockage des PDF, hébergés dans l’Union européenne (Francfort).</li>
<li><strong>Stripe</strong> : paiement et facturation des abonnements.</li>
<li><strong>Netlify</strong> : hébergement du site (pages publiques, sans contenu de courrier).</li>
<li><strong>Hostinger</strong> : nom de domaine et messagerie (envoi des emails de service).</li>
<li><strong>Google Fonts</strong> : chargement des polices du site ; votre adresse IP est transmise à Google à cette occasion.</li>
</ul>
<p>Relève ne vend pas vos données et ne les utilise ni pour de la publicité ni pour entraîner des modèles d’intelligence artificielle. Certains prestataires (Stripe, Netlify, Google) peuvent traiter des données hors de l’Union européenne ; ces transferts sont encadrés par les clauses contractuelles types de la Commission européenne ou le cadre de protection des données UE–États-Unis.</p>
<h2>4. Durées de conservation</h2>
<ul>
<li><strong>Copies numériques du courrier</strong> : 12 mois (Essentiel), 5 ans (Pro) ou 10 ans (Entreprise) à compter de la réception, puis suppression automatique.</li>
<li><strong>Original papier</strong> : détruit après numérisation, sauf réexpédition ou conservation demandée.</li>
<li><strong>Données de compte</strong> : pendant l’abonnement, puis 30 jours après sa fin pour vous permettre de récupérer vos documents, avant suppression.</li>
<li><strong>Factures</strong> : 10 ans (obligation comptable).</li>
<li><strong>Messages de contact</strong> : 3 ans à compter du dernier échange.</li>
</ul>
<h2>5. Sécurité et confidentialité</h2>
<p>Les PDF sont stockés dans un espace privé, accessibles uniquement via un lien temporaire à usage unique pour le client concerné. Chaque client ne peut consulter que ses propres plis (contrôle d’accès au niveau de la base de données). Les échanges sont chiffrés (HTTPS), la connexion se fait par lien envoyé par email sans mot de passe, et les clés d’API de la formule Entreprise sont stockées sous forme chiffrée irréversible. Le courrier est traité dans le respect du secret des correspondances.</p>
<h2>6. Vos droits</h2>
<p>Vous disposez des droits d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité de vos données, ainsi que du droit de définir des directives sur leur sort après votre décès. Pour les exercer : <a href="mailto:${MAIL}">${MAIL}</a>. Nous répondons sous un mois. Si les données concernées figurent dans le courrier d’un de nos clients, nous vous orienterons vers ce client, responsable de traitement.</p>
<p>Vous pouvez introduire une réclamation auprès de la CNIL : <a href="https://www.cnil.fr" rel="noopener">cnil.fr</a> (3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07).</p>
<h2>7. Cookies et traceurs</h2>
<p>Le site n’utilise ni cookie publicitaire ni outil de mesure d’audience. Une donnée technique (jeton de session) est enregistrée dans le navigateur lors de la connexion à l’espace client, strictement nécessaire à son fonctionnement et exemptée de consentement.</p>
<h2>8. Accord de sous-traitance</h2>
<p>Les clients qui le souhaitent peuvent obtenir un accord de sous-traitance (DPA) détaillant les mesures de sécurité et les sous-traitants ultérieurs : <a href="mailto:${MAIL}">${MAIL}</a>.</p>`);

/* ---------- Espace client et opérateur (non indexés) ---------- */
const SB_URL = cfg.supabase.url;
function appShell(mode, title, intro) {
  return `<section class="page-hero"><div class="wrap"><p class="eyebrow">${mode === 'admin' ? 'Opérateur' : 'Espace client'}</p><h1>${title}</h1><p class="lead">${intro}</p></div></section>
<section class="tight"><div class="wrap"><div id="app" data-mode="${mode}" data-sb-url="${SB_URL}" data-sb-key="${cfg.supabase.publishableKey}" data-portal-url="${cfg.portalUrl || ''}" data-address="${esc((cfg.receptionAddress || []).join('|'))}"><noscript><p class="note">JavaScript est nécessaire pour accéder à votre espace.</p></noscript></div></div></section>`;
}
emit('/espace/', layout({ p: '/espace/', title: 'Espace client | Relève', desc: 'Accédez à vos plis numérisés, à vos attestations de destruction et à votre abonnement.', body: appShell('client', 'Mon espace client', 'Retrouvez vos plis numérisés, vos attestations de destruction et votre abonnement.'), ld: [orgLd], index: false, scripts: [ESPACE_FILE] }), { index: false });
emit('/espace/admin/', layout({ p: '/espace/admin/', title: 'Espace opérateur | Relève', desc: 'Dépôt des plis numérisés.', body: appShell('admin', 'Espace opérateur', 'Déposez les plis numérisés dans l’espace de chaque client.'), ld: [orgLd], index: false, scripts: [ESPACE_FILE], cur: '/espace/' }), { index: false });

/* 404 */
write('404.html', layout({ p: '/404.html', title: 'Page introuvable | Relève', desc: 'Cette page n’existe pas.', index: false, body: `<section class="page-hero"><div class="wrap page-body"><p class="eyebrow">Erreur 404</p><h1>Cette page est introuvable</h1><p class="lead">Le lien est peut-être ancien. Reprenez depuis l’accueil ou consultez nos formules.</p><div class="hero-actions"><a class="btn btn-primary" href="/">Accueil</a><a class="btn btn-ghost" href="/tarifs/">Tarifs</a></div></div></section>`, ld: [orgLd] }));

/* ---------- Fichiers techniques ---------- */
const urls = [...new Set(sitemap)].sort((a, b) => a.length - b.length);
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${DATE}</lastmod></url>`).join('\n')}\n</urlset>\n`);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
write('favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#4A31C2"/><circle cx="32" cy="32" r="20" fill="none" stroke="#fff" stroke-width="3.5" stroke-dasharray="6 5"/><text x="32" y="40" text-anchor="middle" font-family="Arial,sans-serif" font-size="24" font-weight="700" fill="#fff">R</text></svg>`);
write('site.webmanifest', JSON.stringify({ name: BRAND, short_name: BRAND, lang: 'fr', start_url: '/', display: 'browser', background_color: '#F1F2EC', theme_color: '#4A31C2', icons: [{ src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }] }));
write('llms.txt', `# ${BRAND}

> ${BRAND} reçoit le courrier papier des entreprises et des particuliers (réexpédié à son adresse), l'ouvre, le numérise en PDF avec texte reconnu sous 24 heures ouvrées, puis le détruit, avec une attestation de destruction, ou le réexpédie. Les documents sont livrés par email, dans un espace client ou, avec la formule Entreprise, par API et webhook à des outils et agents IA. Service pour la France.

## Services
${['/numerisation-courrier-entreprise/', '/scan-courrier-par-email/', '/dematerialisation-courrier-agents-ia/', '/destruction-courrier-confidentiel/', '/reexpedition-courrier-numerique/'].map((x) => `- [${LABEL[x]}](${SITE}${x})`).join('\n')}

## Tarifs (TVA non applicable, art. 293 B du CGI)
- Essentiel : 9 €/mois (90 €/an), 30 plis/mois
- Pro : 29 €/mois (290 €/an), 150 plis/mois
- Entreprise : 89 €/mois (890 €/an), 600 plis/mois, API et webhooks
- [Détail des tarifs](${SITE}/tarifs/)

## Pour qui
${['/pour/tpe-independants/', '/pour/cabinets-comptables-juridiques/', '/pour/entreprises-en-teletravail/'].map((x) => `- [${LABEL[x]}](${SITE}${x})`).join('\n')}

## Ressources
${['/guides/dematerialiser-courrier-papier/', '/guides/automatiser-traitement-facture-papier-agent-ia/', '/guides/recommande-absent-que-faire/', '/faq/'].map((x) => `- [${LABEL[x]}](${SITE}${x})`).join('\n')}

## Limites
- ${BRAND} n'est pas une domiciliation : le siège social reste à l'adresse du client.
- Les chèques, cartes bancaires, pièces d'identité et actes originaux ne sont jamais détruits.
- Un scan est une copie : pas d'archivage à valeur probante certifiée.
`);
write('_headers', `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' ${SB_URL}; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
/espace/*
  X-Robots-Tag: noindex, nofollow
/assets/*
  Cache-Control: public, max-age=31536000, immutable
/*.svg
  Cache-Control: public, max-age=86400
/*.png
  Cache-Control: public, max-age=86400
/sitemap.xml
  Cache-Control: public, max-age=3600
`);
write('.htaccess', `# Équivalent de _headers / _redirects pour un hébergement Apache / LiteSpeed (Hostinger)
ErrorDocument 404 /404.html
DirectoryIndex index.html
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}/$1 [R=301,L]
RewriteCond %{HTTP_HOST} ^www\\.(.+)$ [NC]
RewriteRule ^(.*)$ https://%1/$1 [R=301,L]
RewriteRule ^tarif/?$ /tarifs/ [R=301,L]
RewriteRule ^prix/?$ /tarifs/ [R=301,L]
RewriteRule ^agents-ia/?$ /dematerialisation-courrier-agents-ia/ [R=301,L]
<IfModule mod_headers.c>
Header always set X-Content-Type-Options "nosniff"
Header always set X-Frame-Options "DENY"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
Header always set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' ${SB_URL}; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
<FilesMatch "\\.(css|js)$">
Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>
<If "%{REQUEST_URI} =~ m#^/espace/#">
Header set X-Robots-Tag "noindex, nofollow"
</If>
</IfModule>
`);
write('_redirects', `/index.html / 301!\n/tarif /tarifs/ 301\n/tarifs /tarifs/ 301\n/prix /tarifs/ 301\n/agents-ia /dematerialisation-courrier-agents-ia/ 301\n`);
console.log(`OK ${urls.length} pages indexables → ${OUT}/  (site: ${SITE})`);
