// Contenu éditorial de Relève. Une entrée = une page indexable.
export const PLANS = [
  { id: 'essentiel', name: 'Essentiel', for: 'Particuliers et indépendants', month: 9, year: 90, quota: 30, extra: '0,50 €',
    feat: ['Numérisation sous 24 h ouvrées', 'Envoi du PDF par email', 'Espace client, archives 12 mois', 'Destruction attestée après scan', '1 utilisateur'] },
  { id: 'pro', name: 'Pro', for: 'TPE, cabinets et associations', month: 29, year: 290, quota: 150, extra: '0,35 €', reco: true,
    feat: ['Tout Essentiel, plus :', 'Classement automatique par dossier, recherche plein texte', 'Règles par expéditeur', 'Réexpédition des originaux sur demande', 'Archives 5 ans, 5 utilisateurs'] },
  { id: 'entreprise', name: 'Entreprise', for: 'PME et équipes qui utilisent des agents IA', month: 89, year: 890, quota: 600, extra: '0,25 €',
    feat: ['Tout Pro, plus :', 'API et webhooks à chaque pli', 'Extraction structurée : montant, échéance, IBAN…', 'Accès par API pour vos agents IA', 'Archives 10 ans, utilisateurs illimités'] },
];

export const MODES = {
  email: { sub: 'Consigne : recevoir par email', steps: [
    { t: 'Réception', time: '08/10 · 09:42', d: "Relève de la boîte aux lettres. L'enveloppe est photographiée fermée, vous êtes notifié." },
    { t: 'Ouverture et numérisation', time: '08/10 · 11:15', d: 'Ouvert par l’exploitant, scanné recto-verso en 300 dpi, texte reconnu.', tag: 'Sous 24 h ouvrées' },
    { t: 'Vos règles', time: '08/10 · 11:15', d: 'Règle « Factures fournisseurs » appliquée automatiquement.' },
    { t: 'Envoi par email', time: '08/10 · 11:16', d: 'PDF de 3 pages envoyé à compta@atelier-morel.fr, copie dans votre espace.' },
    { t: 'Destruction attestée', time: '08/10 · 17:30', d: 'Original détruit. Attestation DST-2026-0412 ajoutée à votre espace.', tag: 'Original détruit' }] },
  espace: { sub: 'Consigne : mise à disposition', steps: [
    { t: 'Réception', time: '08/10 · 09:42', d: "Relève de la boîte aux lettres. L'enveloppe est photographiée fermée, vous êtes notifié." },
    { t: 'Ouverture et numérisation', time: '08/10 · 11:15', d: 'Ouvert par l’exploitant, scanné recto-verso en 300 dpi, texte reconnu.', tag: 'Sous 24 h ouvrées' },
    { t: 'Vos règles', time: '08/10 · 11:15', d: 'Classement automatique : Factures › Énergie › 2026.' },
    { t: "Dépôt dans l'espace", time: '08/10 · 11:16', d: 'Pli disponible dans votre espace client, consultable par vos collaborateurs.' },
    { t: 'Destruction attestée', time: '08/10 · 17:30', d: 'Original détruit. Attestation DST-2026-0412 ajoutée à votre espace.', tag: 'Original détruit' }] },
  api: { sub: 'Consigne : agents IA via API', steps: [
    { t: 'Réception', time: '08/10 · 09:42', d: "Relève de la boîte aux lettres. L'enveloppe est photographiée fermée, vous êtes notifié." },
    { t: 'Ouverture et numérisation', time: '08/10 · 11:15', d: 'Scan 300 dpi, puis extraction : expéditeur, montant, échéance, références.', tag: 'Sous 24 h ouvrées' },
    { t: 'Vos règles', time: '08/10 · 11:15', d: 'Règle « Tout le courrier → agent comptable » appliquée.' },
    { t: 'Transmis à vos agents', time: '08/10 · 11:16', d: 'Données structurées et PDF envoyés à votre webhook. Réponse reçue : 200 OK.' },
    { t: 'Destruction attestée', time: '08/10 · 17:30', d: 'Original détruit. Attestation DST-2026-0412 ajoutée à votre espace.', tag: 'Original détruit' }] },
  reexp: { sub: "Consigne : réexpédition de l'original", steps: [
    { t: 'Réception', time: '08/10 · 09:42', d: "Relève de la boîte aux lettres. L'enveloppe est photographiée fermée, vous êtes notifié." },
    { t: 'Ouverture et numérisation', time: '08/10 · 11:15', d: "Copie numérique réalisée avant l'envoi, pour que vous n'attendiez pas le facteur.", tag: 'Sous 24 h ouvrées' },
    { t: 'Vos règles', time: '08/10 · 11:15', d: "Règle « Contrats signés → renvoyer l'original » appliquée." },
    { t: 'Réexpédition', time: '08/10 · 16:00', d: 'Original mis sous pli et confié à La Poste en lettre suivie. Numéro de suivi dans votre espace.' },
    { t: 'Original conservé', time: '—', d: "Pas de destruction : vous recevez l'original, la copie numérique reste disponible.", tag: 'Original renvoyé', warn: true }] },
  detruire: { sub: 'Consigne : destruction sans ouverture', steps: [
    { t: 'Réception', time: '08/10 · 09:42', d: "L'enveloppe est photographiée fermée. Vous voyez l'expéditeur avant toute action." },
    { t: "Pas d'ouverture", time: '—', d: "Le pli n'est pas ouvert ni numérisé.", skip: true },
    { t: 'Vos règles', time: '08/10 · 09:43', d: 'Règle « Publicités et prospectus → destruction » appliquée.' },
    { t: 'Rien à livrer', time: '—', d: "Seule la photo de l'enveloppe apparaît dans votre espace.", skip: true },
    { t: 'Destruction attestée', time: '08/10 · 17:30', d: 'Détruit sans ouverture. Attestation DST-2026-0412.', tag: 'Détruit fermé' }] },
};
export const MODE_LABELS = { email: 'Recevoir par email', espace: 'Déposer dans mon espace', api: 'Envoyer à mes agents IA', reexp: "Réexpédier l'original", detruire: 'Détruire sans ouvrir' };

export const FAQ = {
  arrivee: ['Comment mon courrier arrive-t-il chez Relève ?', "Après la souscription, vous retrouvez votre adresse de réception et votre référence client dans votre espace client. Deux possibilités : souscrire un service de réexpédition auprès de La Poste vers cette adresse, ou communiquer directement l'adresse à vos expéditeurs. Ajoutez toujours la ligne « c/o Relève · Réf. RLV-… » sous votre nom pour que le pli soit rattaché à votre compte."],
  original: ["Que devient l'original papier ?", "Il est détruit juste après la numérisation et une attestation de destruction est ajoutée à votre espace. Si vous choisissez la réexpédition, l'original vous est renvoyé au lieu d'être détruit. Les documents de valeur (chèques, moyens de paiement, pièces d'identité, actes originaux) ne sont jamais détruits."],
  delai: ['Quel est le délai de numérisation ?', "24 heures ouvrées à partir de la réception, du lundi au vendredi hors jours fériés. Un pli reçu le vendredi après la relève est numérisé le lundi."],
  recommandes: ['Les lettres recommandées sont-elles prises en charge ?', "Oui, avec la procuration La Poste que vous signez à l'inscription. Nous retirons vos recommandés, puis l'avis de réception et le contenu sont numérisés comme un pli ordinaire."],
  domiciliation: ['Relève est-il une domiciliation ?', "Non. Vous conservez votre adresse officielle (siège social ou domicile) ; seul votre courrier nous est réexpédié pour être traité. Relève ne peut pas servir d'adresse de siège social."],
  quota: ['Que se passe-t-il si je dépasse mon nombre de plis ?', "Les plis au-delà du quota sont facturés à l'unité, au tarif indiqué dans votre formule (de 0,25 € à 0,50 €). Vous pouvez changer de formule à tout moment depuis votre espace."],
  resiliation: ['Puis-je résilier quand je veux ?', "Oui. En formule mensuelle, la résiliation prend effet à la fin du mois en cours. Pensez à mettre fin en même temps à votre service de réexpédition La Poste."],
  valeur: ['Les scans ont-ils une valeur juridique ?', "Un scan est une copie : sa force probante dépend du document et de l'usage que vous en faites. Relève ne propose pas d'archivage à valeur probante certifiée. Pour les actes, titres et contrats dont vous devez conserver l'original, choisissez la réexpédition de l'original."],
  rgpd: ['Mes données sont-elles protégées ?', "Les fichiers sont chiffrés au repos et en transit, hébergés dans l'Union européenne, et les dates de réception, de numérisation, d'envoi et de destruction sont visibles dans votre espace. Un accord de traitement des données (RGPD) est signé avec chaque client professionnel. La durée de conservation dépend de votre formule, et vous pouvez demander l'export ou la suppression de vos données."],
  ia: ['Puis-je connecter mes agents IA à mon courrier ?', "Oui, avec la formule Entreprise : un webhook vous notifie à chaque nouveau pli et une API donne accès au PDF et aux données extraites (expéditeur, type, montant, échéance, références). Vous gardez la main sur ce que chaque agent peut lire."],
  valeurs: ['Que faites-vous des chèques et des pièces d’identité ?', "Ils ne sont jamais détruits. Le pli est numérisé, signalé dans votre espace, puis réexpédié en lettre suivie à l'adresse que vous indiquez."],
  confidentiel: ['Mon courrier peut-il rester fermé ?', "Oui. Vous pouvez demander que les plis portant la mention « Personnel » ou « Confidentiel », ou venant d'expéditeurs que vous désignez, ne soient jamais ouverts. Ils sont alors réexpédiés fermés ou détruits fermés, selon votre choix."],
  paiement: ['Comment se passe le paiement ?', "Le paiement par carte ou prélèvement SEPA se fait sur une page sécurisée Stripe. Relève ne voit ni ne stocke vos coordonnées bancaires. Une facture (TVA non applicable, art. 293 B du CGI) est envoyée à chaque échéance."],
};

const L = (path, label) => `<a href="${path}">${label}</a>`;
const li = (arr) => `<ul>${arr.map((x) => `<li>${x}</li>`).join('')}</ul>`;
const steps = (arr) => `<ol class="steps-list">${arr.map((x) => `<li><span>${x}</span></li>`).join('')}</ol>`;
const table = (head, rows) => `<div class="tablewrap"><table><thead><tr>${head.map((h) => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const valuables = `<div class="callout" role="note"><span aria-hidden="true">⚠</span><p><strong>Jamais détruits :</strong> chèques, cartes bancaires, pièces d'identité, cartes Vitale et actes originaux. Ils sont numérisés, signalés dans votre espace et réexpédiés en lettre suivie à l'adresse que vous indiquez.</p></div>`;

export const PAGES = [
  {
    path: '/numerisation-courrier-entreprise/', kind: 'service', service: 'Numérisation de courrier professionnel',
    title: "Numérisation de courrier d'entreprise | Relève",
    desc: "Relève ouvre, scanne en PDF et classe le courrier papier de votre société sous 24 h ouvrées. Envoi par email, espace client ou API. Dès 9 € HT/mois.",
    h1: 'Numérisation de courrier pour les entreprises', eyebrow: 'Service principal',
    lead: "Relève ouvre, scanne et classe le courrier papier de votre société, puis le met à votre disposition en PDF avec texte recherchable. Plus de tri au bureau, plus de plis oubliés dans un tiroir.",
    faq: ['delai', 'original', 'recommandes', 'valeur'],
    related: ['/scan-courrier-par-email/', '/dematerialisation-courrier-agents-ia/', '/reexpedition-courrier-numerique/', '/tarifs/'],
    body: `
<h2>Quels courriers numérisons-nous ?</h2>
<p>Tout le courrier postal de votre entreprise, quel que soit l'expéditeur :</p>
${li(['factures fournisseurs, relevés et avis d’échéance', 'courriers administratifs : impôts, URSSAF, greffe, caisses de retraite', 'courriers de banques et d’assurances', 'contrats, avenants et courriers d’avocats', 'lettres recommandées, avec la procuration La Poste'])}
<h2>Un scan fait pour être lu, classé et retrouvé</h2>
${li(['recto-verso en couleur, 300 dpi', 'un fichier PDF par pli, avec texte reconnu (OCR) pour la recherche plein texte', "photo de l'enveloppe fermée, pour garder l'expéditeur et le cachet de la poste", 'nom de fichier lisible : date, expéditeur, type de document'])}
<h2>Le parcours d'un pli, de la boîte aux lettres au PDF</h2>
${steps(['<strong>Réception.</strong> La boîte aux lettres est relevée chaque jour ouvré, l’enveloppe est photographiée.', '<strong>Ouverture et numérisation</strong> par l’exploitant, au plus tard 24 heures ouvrées après la réception.', '<strong>Application de vos règles</strong> : qui reçoit quoi, où classer, quoi ne jamais ouvrir.', '<strong>Livraison</strong> par email, dans votre espace client ou vers vos outils.', '<strong>Destruction attestée</strong> de l’original, avec attestation horodatée, ou réexpédition si vous le demandez.'])}
${valuables}
<h2>Pourquoi numériser son courrier professionnel</h2>
${li(["Vous n'avez plus besoin d'être sur place pour ouvrir le courrier.", 'Vos équipes retrouvent un document en quelques secondes, par expéditeur ou par mot-clé.', 'La comptabilité reçoit les factures le jour même, sans attendre une pochette.', 'Les échéances (impôts, assurances, loyers) ne dépendent plus de la présence d’une personne au bureau.'])}
<p class="muted">Vous voulez connecter ce flux à vos outils ? Voyez le <a href="/dematerialisation-courrier-agents-ia/">courrier papier pour agents IA</a>.</p>`,
  },
  {
    path: '/scan-courrier-par-email/', kind: 'service', service: 'Scan de courrier par email',
    title: 'Scan de courrier par email : PDF sous 24 h | Relève',
    desc: "Recevez chaque courrier scanné par email, en PDF avec texte recherchable, à la ou aux adresses de votre choix. Règles par expéditeur, lien sécurisé en option.",
    h1: 'Recevoir son courrier scanné par email', eyebrow: 'Envoi personnalisé',
    lead: "Chaque pli arrive dans la bonne boîte mail, au format PDF, sans que personne n'ait à l'ouvrir. Les factures vont à la comptabilité, l'administratif au dirigeant, les publicités à la destruction.",
    faq: ['delai', 'rgpd', 'confidentiel', 'paiement'],
    related: ['/numerisation-courrier-entreprise/', '/pour/tpe-independants/', '/pour/cabinets-comptables-juridiques/', '/tarifs/'],
    body: `
<h2>Des règles d'envoi par expéditeur</h2>
<p>À l'inscription vous choisissez une consigne par défaut. Ensuite, vous la précisez par expéditeur ou par type de document :</p>
${table(['Si le courrier est…', 'Alors Relève…'], [['Une facture fournisseur', 'envoie le PDF à compta@votre-societe.fr'], ['Un courrier des impôts ou de l’URSSAF', 'envoie le PDF au dirigeant et à l’expert-comptable'], ['Un contrat à signer', 'envoie le PDF, puis réexpédie l’original'], ['De la publicité', 'détruit sans ouvrir']])}
<h2>PDF joint ou lien sécurisé</h2>
<p>Par défaut le PDF est joint à l'email. Pour les documents sensibles, activez l'envoi d'un lien sécurisé : le fichier reste dans votre espace client et n'est pas copié dans les boîtes mail.</p>
<h2>Plusieurs destinataires, une seule source de vérité</h2>
${li(['une adresse email de réception des scans, distincte de celle du compte', 'copie systématique dans votre espace client', 'en formule Pro : règles par expéditeur et classement par dossier', 'date d’envoi visible dans votre espace'])}
<h2>Mise en place en quelques minutes</h2>
${steps(['Choisissez une formule sur la page <a href="/tarifs/">tarifs</a>.', 'Indiquez l’adresse qui doit recevoir les scans lors du paiement.', 'Faites suivre votre courrier vers Relève : le guide est sur la page <a href="/reexpedition-courrier-numerique/">réexpédition</a>.', 'Recevez vos premiers PDF dès le lendemain ouvré de la réception.'])}`,
  },
  {
    path: '/dematerialisation-courrier-agents-ia/', kind: 'service', service: 'Courrier papier pour agents IA',
    title: 'Courrier papier pour agents IA : API et données | Relève',
    desc: "Rendez votre courrier lisible par vos agents IA : PDF avec OCR, données extraites (expéditeur, montant, échéance), webhook et API à chaque nouveau pli.",
    h1: 'Donner votre courrier papier à vos agents IA', eyebrow: 'Pour vos agents IA',
    lead: "Un agent IA ne lit pas une enveloppe. Relève transforme chaque pli en document et en données structurées que vos agents peuvent consulter, classer et traiter.",
    faq: ['ia', 'rgpd', 'valeur', 'delai'],
    related: ['/guides/automatiser-traitement-facture-papier-agent-ia/', '/numerisation-courrier-entreprise/', '/pour/entreprises-en-teletravail/', '/tarifs/'],
    body: `
<h2>Le courrier papier, dernier trou dans l'automatisation</h2>
<p>Vos factures, relevés et courriers administratifs arrivent encore en papier. Tant qu'ils restent dans une boîte aux lettres, vos agents IA ne peuvent ni les lire, ni relancer, ni payer, ni classer. Relève comble ce trou : le papier entre d'un côté, de la donnée sort de l'autre.</p>
<h2>Ce que reçoivent vos agents</h2>
${li(['le PDF du pli, avec texte reconnu', 'le type de document, l’expéditeur, la date d’émission', 'les montants, échéances, références de contrat ou de facture, IBAN quand ils figurent sur le document', 'l’état du pli : numérisé, envoyé, original détruit, certificat de destruction'])}
<div class="two">
<div class="prose"><h2>Un webhook à chaque pli, une API pour l'historique</h2>${li(['webhook signé envoyé dès que le pli est numérisé', 'API pour retrouver un pli, son PDF et ses données', 'clé d’API personnelle, régénérable à tout moment depuis votre espace', 'lien de téléchargement du PDF valable quelques minutes'])}</div>
<pre class="code" aria-label="Exemple de données transmises pour un pli"><span class="k">{</span>
  <span class="k">"pli":</span> <span class="v">"RLV-2026-104582"</span>,
  <span class="k">"numerise_le":</span> <span class="v">"2026-10-08T11:15:00+02:00"</span>,
  <span class="k">"expediteur":</span> <span class="v">"Fournisseur d'électricité"</span>,
  <span class="k">"type":</span> <span class="v">"facture"</span>,
  <span class="k">"montant_ttc":</span> <span class="n">184.36</span>,
  <span class="k">"echeance":</span> <span class="v">"2026-10-23"</span>,
  <span class="k">"confiance":</span> <span class="n">0.97</span>,
  <span class="k">"pdf":</span> <span class="v">"…/plis/RLV-2026-104582.pdf"</span>,
  <span class="k">"original":</span> <span class="v">"detruit"</span>
<span class="k">}</span></pre>
</div>
<h2>Un humain reste dans la boucle</h2>
<p>Les données sont relevées par notre équipe puis contrôlées, mais une erreur reste possible. Chaque champ renvoie vers le PDF d'origine, et vous pouvez exiger une validation humaine avant qu'un agent agisse (paiement, résiliation, réponse à une administration).</p>
<h2>Cas d'usage</h2>
${li(['<strong>Agent comptable :</strong> rapproche chaque facture papier du bon de commande et prépare le paiement.', '<strong>Agent juridique :</strong> suit les délais des courriers d’huissiers, d’avocats et d’administrations.', '<strong>Agent assistant :</strong> prévient le dirigeant, rédige la réponse et la met en brouillon.'])}
<p class="muted">Disponible avec la formule Entreprise. Voir aussi notre guide : <a href="/guides/automatiser-traitement-facture-papier-agent-ia/">automatiser le traitement d'une facture papier avec un agent IA</a>.</p>`,
  },
  {
    path: '/destruction-courrier-confidentiel/', kind: 'service', service: 'Destruction de courrier confidentiel',
    title: 'Destruction de courrier confidentiel avec attestation | Relève',
    desc: "Après numérisation, l'original est détruit et vous recevez une attestation de destruction horodatée. Destruction sans ouverture possible.",
    h1: 'Destruction de courrier confidentiel, avec attestation', eyebrow: 'Destruction attestée',
    lead: "Le papier ne traîne pas. Une fois le pli numérisé, l'original est détruit le jour même et vous recevez l'attestation de sa destruction dans votre espace.",
    faq: ['original', 'valeurs', 'confidentiel', 'rgpd'],
    related: ['/numerisation-courrier-entreprise/', '/reexpedition-courrier-numerique/', '/pour/cabinets-comptables-juridiques/', '/faq/'],
    body: `
<h2>Trois façons de détruire</h2>
${table(['Situation', 'Ouverture', 'Numérisation', 'Destruction'], [['Courrier normal', 'Oui', 'Oui', 'Après le scan, le jour même'], ['Publicité et prospectus', 'Non', 'Non', 'Détruit fermé'], ['Pli « Personnel » ou « Confidentiel »', 'Selon votre règle', 'Selon votre règle', 'Fermé : réexpédié ou détruit fermé'], ['Contrat ou acte à conserver en original', 'Oui', 'Oui', 'Aucune : l’original vous est renvoyé']])}
<h2>Comment l'original est détruit</h2>
${li(['destruction du papier par Relève, sans niveau de sécurité normalisé (pas de certification DIN 66399)', 'destruction par lot, après contrôle de la qualité du scan', 'attestation de destruction horodatée (DST-AAAA-NNNN), établie par Relève et non par un organisme tiers, ajoutée à votre espace', 'dates de réception, numérisation, envoi et destruction visibles dans votre espace'])}
<h2>Un original détruit n'est jamais « perdu »</h2>
<p>Avant la destruction, un opérateur vérifie que le PDF est complet et lisible. Un lot n'est détruit qu'après ce contrôle. Vous pouvez aussi demander la conservation de certains plis pendant une durée fixée.</p>
${valuables}
<h2>La destruction, un geste RGPD</h2>
<p>Moins de papier conservé, c'est moins de données personnelles exposées. Vous fixez la durée de conservation des fichiers numériques dans votre espace, et vous pouvez les exporter ou les supprimer à tout moment.</p>`,
  },
  {
    path: '/reexpedition-courrier-numerique/', kind: 'service', service: 'Réexpédition de courrier vers un service de numérisation',
    title: 'Faire suivre son courrier vers un service de scan | Relève',
    desc: "Comment faire suivre votre courrier professionnel vers Relève : réexpédition La Poste, changement d'adresse, procuration pour les recommandés. Mode d'emploi.",
    h1: 'Faire suivre son courrier vers Relève', eyebrow: 'Mise en route',
    lead: "Votre adresse officielle ne change pas. Votre courrier est simplement redirigé vers Relève, qui le numérise puis le détruit ou vous le renvoie.",
    faq: ['arrivee', 'domiciliation', 'recommandes', 'resiliation'],
    related: ['/guides/recommande-absent-que-faire/', '/numerisation-courrier-entreprise/', '/tarifs/', '/faq/'],
    body: `
<h2>Deux façons de recevoir votre courrier chez nous</h2>
<div class="grid g2">
<div class="item"><h3>Réexpédition La Poste</h3><p>Vous souscrivez un service de réexpédition de courrier auprès de La Poste (offre pour les professionnels) vers l'adresse Relève. Tout votre courrier suit, sans toucher à vos expéditeurs. Renseignez-vous auprès de La Poste sur les conditions, la durée et les délais de mise en place.</p></div>
<div class="item"><h3>Changement d'adresse de courrier</h3><p>Vous communiquez l'adresse Relève à vos principaux expéditeurs (banque, assurances, fournisseurs, organismes). Plus durable, mais plus long à mettre en place : mieux vaut cumuler les deux au début.</p></div>
</div>
<h2>Mise en route en 5 étapes</h2>
${steps(['Souscrivez une formule sur la page <a href="/tarifs/">tarifs</a>.', 'Connectez-vous à votre <a href="/espace/">espace client</a> pour retrouver votre adresse de réception et votre référence client.', 'Ajoutez la ligne « c/o Relève · Réf. RLV-… » sous le nom de votre société.', 'Signez la procuration La Poste pour que nous puissions retirer vos recommandés.', 'Définissez vos règles : qui reçoit quoi, ce qui est réexpédié, ce qui est détruit.'])}
<div class="callout info" role="note"><span aria-hidden="true">i</span><p><strong>Relève n'est pas une domiciliation.</strong> Votre siège social et votre adresse légale restent inchangés. Nous traitons uniquement le courrier qui nous est réexpédié.</p></div>
<h2>Que se passe-t-il pendant la transition ?</h2>
<p>Les plis qui arrivent encore à votre ancienne adresse ne sont pas perdus : la réexpédition les redirige. Ceux qui nous parviennent sans votre référence peuvent être mis en attente le temps de les rattacher à votre compte ; vous en êtes alors informé.</p>`,
  },
  {
    path: '/pour/tpe-independants/', kind: 'service', service: 'Numérisation de courrier pour TPE et indépendants',
    title: 'Numérisation de courrier pour TPE et indépendants | Relève',
    desc: "Indépendant, artisan, gérant de TPE : ne triez plus votre courrier. Relève le scanne, l'envoie à votre comptable et détruit l'original. Dès 9 € HT/mois.",
    h1: 'Courrier numérisé pour TPE et indépendants', eyebrow: 'Pour qui : TPE et indépendants',
    lead: "Vous passez vos journées chez vos clients ou sur les routes. Le courrier s'entasse, et une échéance manquée coûte plus cher que l'abonnement.",
    faq: ['delai', 'recommandes', 'resiliation', 'quota'],
    related: ['/scan-courrier-par-email/', '/tarifs/', '/guides/dematerialiser-courrier-papier/', '/pour/entreprises-en-teletravail/'],
    body: `
<h2>Ce que ça change au quotidien</h2>
${li(['Les factures arrivent chez votre comptable le jour même, sans que vous les touchiez.', 'Les courriers des impôts et de l’URSSAF vous sont signalés avec leur échéance.', 'Plus de déplacement pour récupérer un recommandé.', 'Votre domicile ou votre atelier n’est plus encombré de papier.'])}
<h2>La formule adaptée</h2>
<p>Un indépendant reçoit en général moins de 30 plis par mois : la formule <strong>Essentiel</strong> (9 €/mois) suffit. Si vous voulez classement automatique et règles par expéditeur, la formule <strong>Pro</strong> (29 €/mois, 150 plis) est faite pour les TPE.</p>
<h2>Un exemple de réglage</h2>
${table(['Expéditeur', 'Action'], [['Fournisseurs', 'PDF au cabinet comptable, original détruit'], ['Impôts, URSSAF', 'PDF à vous et au cabinet, original détruit'], ['Banque, assurances', 'PDF dans votre espace, original détruit'], ['Publicité', 'Détruit sans ouverture'], ['Contrats signés', 'PDF, puis original réexpédié']])}
<p class="muted">Détail du fonctionnement : <a href="/numerisation-courrier-entreprise/">numérisation de courrier d'entreprise</a>.</p>`,
  },
  {
    path: '/pour/cabinets-comptables-juridiques/', kind: 'service', service: 'Numérisation de courrier pour cabinets comptables et juridiques',
    title: 'Courrier numérisé pour cabinets comptables | Relève',
    desc: "Cabinets comptables et juridiques : le courrier de vos clients en PDF classé par dossier, avec règles, traçabilité et plis laissés fermés sur demande.",
    h1: 'Courrier numérisé pour cabinets comptables et juridiques', eyebrow: 'Pour qui : cabinets',
    lead: "Vos clients vous envoient des pochettes de papier. Relève reçoit le courrier, le numérise et le classe par dossier avant qu'il n'atteigne votre bureau.",
    faq: ['confidentiel', 'rgpd', 'valeur', 'quota'],
    related: ['/destruction-courrier-confidentiel/', '/dematerialisation-courrier-agents-ia/', '/tarifs/', '/faq/'],
    body: `
<h2>Un flux de courrier par dossier client</h2>
${li(['une règle de traitement par client ou par expéditeur', 'classement automatique par dossier et par type de document', 'PDF avec texte recherchable pour retrouver une pièce par mot-clé', 'jusqu’à 5 utilisateurs en formule Pro, illimité en formule Entreprise'])}
<h2>Confidentialité et traçabilité</h2>
<p>Le courrier est ouvert par l'exploitant de Relève, tenu au secret de la correspondance. Les plis marqués « Personnel » ou « Confidentiel », ou venant d'expéditeurs que vous désignez, restent fermés. Les dates de réception, de numérisation, d'envoi et de destruction sont visibles dans votre espace.</p>
<div class="callout info" role="note"><span aria-hidden="true">i</span><p><strong>Secret professionnel :</strong> si votre profession y est soumise, définissez avec nous les règles de traitement avant de rediriger le courrier. Un accord de traitement des données (RGPD) est signé avec chaque cabinet.</p></div>
<h2>Pour les cabinets qui automatisent</h2>
<p>Avec la formule Entreprise, un webhook et une API donnent à vos outils ou à vos agents IA accès aux plis et à leurs données extraites. Voir <a href="/dematerialisation-courrier-agents-ia/">courrier papier pour agents IA</a>.</p>`,
  },
  {
    path: '/pour/entreprises-en-teletravail/', kind: 'service', service: 'Gestion du courrier papier pour entreprises en télétravail',
    title: 'Gérer son courrier papier en télétravail | Relève',
    desc: "Équipe à distance, pas de bureau, dirigeant en déplacement : le courrier papier arrive chez Relève et vous le recevez en PDF, partagé avec vos équipes.",
    h1: 'Gérer le courrier papier d’une équipe à distance', eyebrow: 'Pour qui : équipes à distance',
    lead: "Quand personne n'est au bureau, personne n'ouvre le courrier. Relève joue ce rôle, tous les jours ouvrés, et le rend accessible à toute l'équipe.",
    faq: ['arrivee', 'ia', 'delai', 'paiement'],
    related: ['/dematerialisation-courrier-agents-ia/', '/scan-courrier-par-email/', '/tarifs/', '/guides/dematerialiser-courrier-papier/'],
    body: `
<h2>Le courrier suit votre équipe, pas l'inverse</h2>
<p>Que votre courrier arrive à l'adresse du siège, au domicile du dirigeant ou dans une boîte aux lettres partagée, il suffit de le faire suivre vers Relève. Les plis sont numérisés au plus tard 24 heures ouvrées après leur réception.</p>
<h2>Un espace partagé et des règles claires</h2>
${li(['chaque rôle reçoit ce qui le concerne : finance, juridique, direction', 'les documents sont classés et recherchables, accessibles de n’importe où', 'les originaux qui doivent être conservés sont réexpédiés à l’adresse que vous indiquez', 'l’historique complet est consultable : qui a reçu quel pli, quand'])}
<h2>Prêt pour l'automatisation</h2>
<p>Les équipes à distance sont souvent celles qui utilisent déjà des agents IA. La formule Entreprise leur donne accès au courrier par API : voir <a href="/dematerialisation-courrier-agents-ia/">courrier papier pour agents IA</a>.</p>`,
  },
  {
    path: '/guides/dematerialiser-courrier-papier/', kind: 'article',
    title: 'Dématérialiser son courrier papier : guide en 6 étapes',
    desc: "Passer du courrier papier au tout numérique en 6 étapes : inventaire, originaux à garder, adresse de réception, norme de scan, classement, conservation.",
    h1: 'Dématérialiser son courrier papier : méthode en 6 étapes', eyebrow: 'Guide',
    lead: "Passer au courrier numérique ne consiste pas seulement à acheter un scanner. Voici l'ordre dans lequel s'y prendre pour ne rien perdre en route.",
    faq: ['original', 'valeur'], related: ['/numerisation-courrier-entreprise/', '/guides/', '/tarifs/'],
    body: `
<h2>1. Faire l'inventaire de votre courrier</h2>
<p>Pendant un mois, notez les types de courriers reçus : factures, administratif, banque, assurances, publicité, juridique. Vous saurez ce qui doit être traité, ce qui peut être détruit sans ouverture, et le volume mensuel à prévoir.</p>
<h2>2. Décider quels originaux conserver</h2>
<p>Certains documents doivent rester en papier, ou vous voudrez les garder pour sécurité. À titre indicatif :</p>
${table(['Type de document', 'Original à garder ?'], [['Facture fournisseur', 'Le scan suffit en général ; vérifiez avec votre expert-comptable'], ['Courrier administratif courant', 'Le scan suffit en général'], ['Contrat signé à la main', 'Souvent oui, si l’enjeu est important'], ['Acte notarié, titre de propriété, statuts', 'Oui'], ['Chèque, carte bancaire, pièce d’identité', 'Oui, jamais détruits'], ['Publicité', 'Non']])}
<h2>3. Choisir comment le courrier arrive chez le service de numérisation</h2>
<p>Réexpédition La Poste pour tout faire suivre d'un coup, et changement d'adresse auprès de vos principaux expéditeurs pour le long terme. Détail dans notre page <a href="/reexpedition-courrier-numerique/">réexpédition</a>.</p>
<h2>4. Fixer un standard de scan</h2>
${li(['recto-verso, couleur, 300 dpi', 'PDF avec texte reconnu (OCR)', 'un fichier par pli, avec la photo de l’enveloppe', 'nommage : date, expéditeur, type'])}
<h2>5. Organiser le classement et les destinataires</h2>
<p>Décidez qui reçoit quoi : la comptabilité reçoit les factures, le dirigeant les courriers des administrations. Une règle par expéditeur évite les relais manuels.</p>
<h2>6. Définir les durées de conservation</h2>
<p>Les durées légales de conservation varient selon le type de document (les pièces comptables, par exemple, se conservent plusieurs années). Demandez confirmation à votre expert-comptable, puis paramétrez la durée dans votre espace. Un scan est une copie : sa valeur probante dépend du document et de l'usage.</p>`,
  },
  {
    path: '/guides/automatiser-traitement-facture-papier-agent-ia/', kind: 'article',
    title: 'Automatiser une facture papier avec un agent IA',
    desc: "De l'enveloppe au paiement : comment un agent IA peut traiter une facture papier numérisée, avec extraction des données, contrôle humain et sécurité.",
    h1: 'Automatiser le traitement d’une facture papier avec un agent IA', eyebrow: 'Guide',
    lead: "Une facture qui arrive par la poste peut être lue, contrôlée et préparée au paiement sans ressaisie. Le workflow, étape par étape, et les garde-fous à prévoir.",
    faq: ['ia', 'valeur'], related: ['/dematerialisation-courrier-agents-ia/', '/guides/', '/tarifs/'],
    body: `
<h2>Le workflow en six temps</h2>
${steps(['<strong>Le pli est numérisé</strong> et un webhook prévient votre système.', '<strong>L’agent lit les données extraites</strong> : fournisseur, numéro de facture, montant, échéance, IBAN.', '<strong>Il rapproche la facture</strong> d’une commande ou d’un contrat connu.', '<strong>Il signale les écarts</strong> : montant inhabituel, IBAN différent de l’habitude, doublon.', '<strong>Un humain valide</strong> les cas à risque, l’agent prépare le paiement ou l’écriture comptable.', '<strong>L’agent archive</strong> la facture et son PDF, et l’original papier est détruit.'])}
<h2>Les garde-fous indispensables</h2>
${li(['<strong>IBAN modifié :</strong> toute facture dont l’IBAN diffère de l’historique doit passer par un humain, c’est le schéma classique de la fraude au virement.', '<strong>Seuil de montant :</strong> au-delà d’un montant fixé, validation obligatoire.', '<strong>Indice de confiance :</strong> en dessous d’un seuil, l’extraction est relue par une personne.', '<strong>Droits limités :</strong> l’agent lit les factures, mais ne peut pas payer seul.', '<strong>Trace :</strong> chaque décision renvoie vers le PDF d’origine.'])}
<h2>Ce que l'agent ne doit pas faire seul</h2>
<p>Résilier un contrat, répondre à un contrôle fiscal, contester une facture : ces actes engagent l'entreprise. L'agent prépare, l'humain décide.</p>
<p class="muted">Les données extraites sont disponibles avec la formule Entreprise : voir <a href="/dematerialisation-courrier-agents-ia/">courrier papier pour agents IA</a>.</p>`,
  },
  {
    path: '/guides/recommande-absent-que-faire/', kind: 'article',
    title: 'Recommandé en votre absence : que faire ? | Relève',
    desc: "Avis de passage, délai de retrait, procuration La Poste : gérer une lettre recommandée quand vous n'êtes pas sur place, en entreprise ou en particulier.",
    h1: 'Lettre recommandée en votre absence : que faire ?', eyebrow: 'Guide',
    lead: "Un recommandé ignoré peut faire courir un délai contre vous. Voici comment ne pas le manquer quand personne n'est là pour le recevoir.",
    faq: ['recommandes', 'arrivee'], related: ['/reexpedition-courrier-numerique/', '/guides/', '/tarifs/'],
    body: `
<h2>Ce qui se passe quand vous êtes absent</h2>
<p>Le facteur dépose un avis de passage. Le recommandé est alors à retirer dans un bureau ou un point de retrait, généralement dans un délai de 15 jours (vérifiez le délai indiqué sur l'avis). Passé ce délai, le pli retourne à l'expéditeur.</p>
<h2>Pourquoi c'est un risque</h2>
<p>Certains courriers font courir des délais : mise en demeure, contrôle, résiliation, courrier d'une administration. Ne pas aller le chercher ne suspend pas ces délais.</p>
<h2>La solution : la procuration</h2>
<p>La Poste permet de désigner un mandataire pour retirer votre courrier, recommandés compris, avec une procuration. Avec Relève, vous signez cette procuration à l'inscription : nous retirons le recommandé, nous numérisons l'avis de réception et le contenu, et vous recevez le tout comme un pli ordinaire.</p>
<h2>Que faire à réception du PDF ?</h2>
${steps(['Lisez le courrier et repérez la date limite éventuelle.', 'Transmettez-le à la personne concernée : comptable, avocat, dirigeant.', 'Si l’original est nécessaire, demandez sa réexpédition depuis votre espace.'])}`,
  },
];

// Pages spéciales gérées par le générateur : /, /tarifs/, /faq/, /guides/, /merci/, légales, 404.
