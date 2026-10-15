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
  '/destruction-courrier-confidentiel/': 'Destruction certifiée',
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
  description: "Relève reçoit le courrier papier des entreprises et des particuliers, le numérise sous 24 h ouvrées, puis le détruit de façon certifiée ou le réexpédie.",
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
<div><div class="price"><strong>${pl.month} €</strong><span>HT / mois</span></div><p class="price-alt">ou ${eur(pl.year)} HT / an, 2 mois offerts</p></div>
<div class="quota"><span>${pl.quota} plis / mois</span><span>puis ${pl.extra} / pli</span></div>
${features ? `<ul>${pl.feat.map((f) => `<li><span>${f}</span></li>`).join('')}</ul>` : ''}
<div class="plan-cta"><a class="btn ${pl.reco ? 'btn-primary' : 'btn-ghost'}" href="${l.mensuel}" rel="nofollow noopener">Souscrire à ${pl.name} (mensuel)</a><a class="alt" href="${l.annuel}" rel="nofollow noopener">Ou en annuel : ${eur(pl.year)} HT</a></div>
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
    ['/destruction-courrier-confidentiel/', 'Destruction', 'Broyage certifié', 'Après numérisation, ou sans ouverture pour la publicité. Certificat horodaté pour chaque lot.'],
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
<p class="lead">Faites suivre votre courrier à Relève. Chaque pli est ouvert, numérisé sous 24 h ouvrées, envoyé là où vous le voulez (email, espace client ou agents IA), puis détruit de façon certifiée.</p>
<div class="hero-actions"><a class="btn btn-primary" href="/tarifs/">Choisir une formule</a><a class="btn btn-ghost" href="#parcours">Voir le parcours d’un pli</a></div>
<ul class="hero-facts"><li>Numérisé sous 24 h ouvrées</li><li>Original détruit, certificat fourni</li><li>Sans engagement en mensuel</li></ul>
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
<div class="sec-head"><p class="eyebrow">Nos services</p><h2>Une consigne par défaut, des règles par expéditeur</h2><p class="lead">Fixez une consigne générale à l’inscription, puis affinez : les factures vers la comptabilité, l’administratif dans votre espace, les publicités à la broyeuse.</p></div>
<div class="grid g4">${svc.map(([h, e, t, d]) => `<article class="item"><p class="eyebrow">${e}</p><h3><a href="${h}">${t}</a></h3><p>${d}</p><a class="more" href="${h}">En savoir plus</a></article>`).join('')}</div>
<div class="callout" role="note"><span aria-hidden="true">⚠</span><p><strong>Jamais détruits :</strong> chèques, cartes bancaires, pièces d’identité, cartes Vitale et actes originaux. Ils sont numérisés, signalés dans votre espace et réexpédiés en lettre suivie.</p></div>
</div></section>

<section class="band"><div class="wrap two">
<div class="prose"><p class="eyebrow">Pour vos agents IA</p><h2>Le courrier devient une donnée que vos agents peuvent lire</h2><p class="lead">Un PDF ne suffit pas à un agent. Relève extrait les informations utiles de chaque pli et les envoie dans un format structuré.</p>
<ul class="ticks"><li>Expéditeur, type de document, montant, échéance, références de contrat</li><li>Webhook à chaque nouveau pli, API pour retrouver l’historique</li><li>Dépôt automatique dans Google Drive, SharePoint ou votre stockage</li></ul>
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
<p class="note">Prix hors taxes, TVA 20 % en sus. Réexpédition des originaux : frais postaux refacturés au tarif La Poste. <a href="/tarifs/">Comparer les formules en détail</a>.</p>
</div></section>

<section id="securite"><div class="wrap">
<div class="sec-head"><p class="eyebrow">Confidentialité</p><h2>Votre courrier ne traîne nulle part</h2><p class="lead">Le papier reste le moins longtemps possible entre nos mains, et chaque manipulation laisse une trace que vous pouvez consulter.</p></div>
<div class="grid g3">
${[['24 h ouvrées', 'Numérisé dès réception', 'Boîte aux lettres relevée chaque jour ouvré. Votre pli est numérisé au plus tard le jour ouvré suivant.'], ['P-4 · DIN 66399', 'Destruction certifiée', 'Broyage en particules sur place, juste après numérisation. Un certificat horodaté rejoint votre espace.'], ['Opérateur habilité', 'Une seule personne ouvre', 'Opérateur lié par un engagement de confidentialité, local fermé, aucun appareil personnel au poste de numérisation.'], ['Journal d’accès', 'Chaque action est tracée', 'Réception, ouverture, envoi, consultation, destruction : tout est horodaté et visible dans votre espace.'], ['Chiffrement', 'Stockage chiffré', 'Fichiers chiffrés au repos et en transit, hébergés dans l’Union européenne. Vous fixez la durée de conservation.'], ['RGPD', 'Contrat de sous-traitance', 'Un accord de traitement des données est signé avec chaque client professionnel. Export ou suppression sur demande.']].map(([e, t, d]) => `<article class="item"><p class="eyebrow">${e}</p><h3>${t}</h3><p>${d}</p></article>`).join('')}
</div></div></section>

<section id="faq" class="band"><div class="wrap">
<div class="sec-head"><p class="eyebrow">Questions fréquentes</p><h2>Avant de vous lancer</h2></div>
${faqHtml(faqKeys)}
<p class="note"><a href="/faq/">Toutes les questions</a></p>
</div></section>
${ctaBand()}`;
  const ld = [orgLd, siteLd,
    { '@type': 'WebPage', '@id': SITE + '/#webpage', url: SITE + '/', name: 'Numérisation de courrier d’entreprise sous 24 h', isPartOf: { '@id': `${SITE}/#website` }, about: { '@id': ORG_ID }, inLanguage: 'fr-FR', dateModified: DATE },
    { '@type': 'Service', name: 'Numérisation de courrier professionnel', serviceType: 'Numérisation et traitement de courrier', provider: { '@id': ORG_ID }, areaServed: { '@type': 'Country', name: 'France' }, description: 'Réception, ouverture, numérisation sous 24 h ouvrées, envoi personnalisé et destruction certifiée du courrier papier.' },
    faqLd(faqKeys)];
  emit('/', layout({ scripts: [JS_FILE], p: '/', title: 'Numérisation de courrier d’entreprise sous 24 h | Relève', desc: 'Faites suivre votre courrier à Relève : ouverture, scan en PDF sous 24 h ouvrées, envoi par email ou à vos agents IA, destruction certifiée. Dès 9 € HT/mois.', body, ld }));
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
<p class="note">Prix hors taxes ; la TVA (20 %) est calculée et ajoutée au paiement. Réexpédition des originaux : frais postaux refacturés au tarif La Poste en vigueur. Un pli est une enveloppe reçue, quel que soit son nombre de pages.</p></div></section>
<section class="tight"><div class="wrap"><h2>Comparer les formules</h2><div class="gap"></div>
${`<div class="tablewrap"><table><thead><tr><th scope="col">Fonction</th>${PLANS.map((x) => `<th scope="col">${x.name}</th>`).join('')}</tr></thead><tbody>
<tr><td>Prix mensuel HT</td>${PLANS.map((x) => `<td>${x.month} €</td>`).join('')}</tr>
<tr><td>Prix annuel HT</td>${PLANS.map((x) => `<td>${eur(x.year)}</td>`).join('')}</tr>
<tr><td>Plis inclus par mois</td>${PLANS.map((x) => `<td>${x.quota}</td>`).join('')}</tr>
<tr><td>Pli supplémentaire HT</td>${PLANS.map((x) => `<td>${x.extra}</td>`).join('')}</tr>
<tr><td>Numérisation sous 24 h ouvrées</td><td>Oui</td><td>Oui</td><td>Oui</td></tr>
<tr><td>Envoi par email et espace client</td><td>Oui</td><td>Oui</td><td>Oui</td></tr>
<tr><td>Destruction certifiée</td><td>Oui</td><td>Oui</td><td>Oui</td></tr>
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
      { '@type': 'Offer', name: `${pl.name} mensuel`, priceCurrency: 'EUR', price: String(pl.month), priceSpecification: { '@type': 'UnitPriceSpecification', price: pl.month, priceCurrency: 'EUR', unitCode: 'MON', valueAddedTaxIncluded: false }, availability: 'https://schema.org/InStock', url: SITE + p },
      { '@type': 'Offer', name: `${pl.name} annuel`, priceCurrency: 'EUR', price: String(pl.year), priceSpecification: { '@type': 'UnitPriceSpecification', price: pl.year, priceCurrency: 'EUR', unitCode: 'ANN', valueAddedTaxIncluded: false }, availability: 'https://schema.org/InStock', url: SITE + p },
    ],
  }));
  emit(p, layout({ p, title: 'Tarifs numérisation de courrier dès 9 € HT/mois | Relève', desc: 'Trois formules pour numériser votre courrier : Essentiel 9 €, Pro 29 €, Entreprise 89 € HT par mois. Sans engagement en mensuel, 2 mois offerts en annuel.', body, ld: [orgLd, crumbsLd(trail), ...prod, faqLd(faqKeys)] }));
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
legal('/mentions-legales/', 'Mentions légales', 'Mentions légales', `<p class="muted">Informations à compléter avant la mise en ligne définitive.</p><h2>Éditeur du site</h2><p>Dénomination : [à compléter]<br>Forme juridique et capital : [à compléter]<br>SIREN / SIRET : [à compléter]<br>Adresse : Relève Courrier, 2 bis rue Hardy, 78000 Versailles<br>Directeur de la publication : [à compléter]<br>Contact : ${cfg.contactEmail}</p><h2>Hébergement</h2><p>Netlify, Inc., 512 2nd Street, Suite 200, San Francisco, CA 94107, États-Unis.</p>`);
legal('/cgv/', 'Conditions générales de vente', 'Conditions générales de vente', `<p class="muted">Texte à faire valider par un professionnel du droit avant la mise en ligne définitive.</p><h2>Objet</h2><p>Les présentes conditions encadrent l’abonnement au service Relève de réception, numérisation, envoi, destruction ou réexpédition de courrier.</p><h2>Prix et paiement</h2><p>Les prix sont indiqués hors taxes. La TVA applicable est ajoutée au paiement, qui s’effectue par Stripe.</p><h2>Durée et résiliation</h2><p>En formule mensuelle, l’abonnement est sans engagement et la résiliation prend effet à la fin du mois en cours.</p><h2>Responsabilité</h2><p>[à compléter]</p>`);
legal('/confidentialite/', 'Politique de confidentialité', 'Politique de confidentialité', `<p class="muted">Texte à compléter avant la mise en ligne définitive.</p><h2>Données traitées</h2><p>Relève traite les données nécessaires à l’abonnement (identité, coordonnées, facturation) et le contenu du courrier numérisé pour le compte de ses clients, en qualité de sous-traitant.</p><h2>Vos droits</h2><p>Vous pouvez demander l’accès, la rectification, l’export ou la suppression de vos données. Contact : ${cfg.contactEmail}.</p>`);


/* ---------- Espace client et opérateur (non indexés) ---------- */
const SB_URL = cfg.supabase.url;
function appShell(mode, title, intro) {
  return `<section class="page-hero"><div class="wrap"><p class="eyebrow">${mode === 'admin' ? 'Opérateur' : 'Espace client'}</p><h1>${title}</h1><p class="lead">${intro}</p></div></section>
<section class="tight"><div class="wrap"><div id="app" data-mode="${mode}" data-sb-url="${SB_URL}" data-sb-key="${cfg.supabase.publishableKey}" data-portal-url="${cfg.portalUrl || ''}" data-address="${esc((cfg.receptionAddress || []).join('|'))}"><noscript><p class="note">JavaScript est nécessaire pour accéder à votre espace.</p></noscript></div></div></section>`;
}
emit('/espace/', layout({ p: '/espace/', title: 'Espace client | Relève', desc: 'Accédez à vos plis numérisés, à vos certificats de destruction et à votre abonnement.', body: appShell('client', 'Mon espace client', 'Retrouvez vos plis numérisés, vos certificats de destruction et votre abonnement.'), ld: [orgLd], index: false, scripts: [ESPACE_FILE] }), { index: false });
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

> ${BRAND} reçoit le courrier papier des entreprises et des particuliers (réexpédié à son adresse), l'ouvre, le numérise en PDF avec texte reconnu sous 24 heures ouvrées, puis le détruit de façon certifiée ou le réexpédie. Les documents sont livrés par email, dans un espace client ou, avec la formule Entreprise, par API et webhook à des outils et agents IA. Service pour la France.

## Services
${['/numerisation-courrier-entreprise/', '/scan-courrier-par-email/', '/dematerialisation-courrier-agents-ia/', '/destruction-courrier-confidentiel/', '/reexpedition-courrier-numerique/'].map((x) => `- [${LABEL[x]}](${SITE}${x})`).join('\n')}

## Tarifs (hors taxes)
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
