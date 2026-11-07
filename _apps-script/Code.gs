/**
 * Contactformulier praktijknoemiejacobs.be
 * ----------------------------------------
 * Ontvangt het contactformulier van de website en stuurt een e-mail met alle
 * gegevens naar de praktijk. Er wordt niets anders bewaard dan die e-mail.
 *
 * Installatie (eenmalig):
 *  1. Ga naar https://script.google.com (ingelogd met het Google Workspace-account van de praktijk)
 *     → Nieuw project. Geef het een naam, bv. "Contactformulier website".
 *  2. Vervang de inhoud van Code.gs door dit bestand en sla op.
 *  3. Kies bovenaan de functie "test" en klik op Uitvoeren. Geef de gevraagde toestemmingen.
 *     → Er komt een testmail binnen op ONTVANGER.
 *  4. Implementeren → Nieuwe implementatie → type "Web-app":
 *       - Uitvoeren als: Ik
 *       - Wie heeft toegang: Iedereen
 *     Kopieer de web-app-URL (eindigt op /exec) en plak die in index.html bij APPS_SCRIPT_URL.
 *
 * Na een wijziging aan deze code: Implementeren → Implementaties beheren → bewerken (potlood)
 * → Versie: "Nieuwe versie" → Implementeren. De URL blijft dan dezelfde.
 */

const ONTVANGER = 'info@praktijknoemiejacobs.be';
const ONDERWERP = 'Nieuw bericht via praktijknoemiejacobs.be';
const MAX_LENGTE = 5000;           // maximum aantal tekens per veld

// Formuliervelden: [naam in het formulier, label in de e-mail, verplicht]
const VELDEN = [
  ['naam',          'Naam',                                   true],
  ['email',         'E-mail',                                 true],
  ['gsm',           'Gsm-nummer',                             true],
  ['geboortedatum', 'Geboortedatum',                          true],
  ['woonplaats',    'Woonplaats',                             true],
  ['verwijzing',    'Hoe terechtgekomen / doorverwezen door', true],
  ['bericht',       'Hulpvraag',                              true],
];

/** Wordt aangeroepen wanneer de website het formulier verstuurt. */
function doPost(e) {
  try {
    const p = (e && e.parameter) || {};

    // Honeypot: echte bezoekers zien dit veld niet. Is het ingevuld, dan is het spam.
    // We antwoorden "ok" zodat de spambot niets merkt, maar versturen niets.
    if (p._honey) return antwoord({ ok: true });

    const gegevens = {};
    for (const [sleutel, label, verplicht] of VELDEN) {
      const waarde = String(p[sleutel] || '').trim().slice(0, MAX_LENGTE);
      if (verplicht && !waarde) return antwoord({ ok: false, fout: 'Veld ontbreekt: ' + label });
      gegevens[sleutel] = waarde;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gegevens.email)) {
      return antwoord({ ok: false, fout: 'Ongeldig e-mailadres' });
    }

    // Lukt het versturen niet, dan gooit MailApp een fout en krijgt de bezoeker
    // op de website de foutmelding (met het advies om rechtstreeks te mailen).
    stuurMail(gegevens);
    return antwoord({ ok: true });
  } catch (fout) {
    console.error(fout);
    return antwoord({ ok: false, fout: 'Versturen mislukt' });
  }
}

/** Eenvoudige controle in de browser: de web-app-URL openen toont "ok". */
function doGet() {
  return antwoord({ ok: true, info: 'Contactformulier actief' });
}

function stuurMail(gegevens) {
  const rijen = VELDEN.map(([sleutel, label]) =>
    '<tr><td style="padding:6px 12px 6px 0;vertical-align:top;color:#555;white-space:nowrap;"><strong>' +
    escapeHtml(label) + '</strong></td><td style="padding:6px 0;vertical-align:top;">' +
    escapeHtml(gegevens[sleutel]).replace(/\n/g, '<br>') + '</td></tr>'
  ).join('');

  const tekst = VELDEN.map(([sleutel, label]) => label + ': ' + gegevens[sleutel]).join('\n\n');

  MailApp.sendEmail({
    to: ONTVANGER,
    subject: ONDERWERP + ' — ' + gegevens.naam,
    replyTo: gegevens.email,      // "Beantwoorden" mailt rechtstreeks naar de cliënt
    name: 'Website praktijk',
    body: tekst,
    htmlBody:
      '<div style="font-family:Arial,sans-serif;font-size:14px;color:#222;">' +
      '<p>Er is een nieuw bericht binnengekomen via het contactformulier.</p>' +
      '<table style="border-collapse:collapse;">' + rijen + '</table>' +
      '<p style="color:#888;font-size:12px;margin-top:24px;">Klik op "Beantwoorden" om rechtstreeks te antwoorden.</p>' +
      '</div>',
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function antwoord(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- Test ---------- */

/** Voer dit uit in de editor om de e-mail te testen. */
function test() {
  const res = doPost({ parameter: {
    naam: 'Test Persoon', email: ONTVANGER, gsm: '0470 00 00 00', geboortedatum: '01/01/1990',
    woonplaats: 'Merksplas', verwijzing: 'Test via Apps Script', bericht: 'Dit is een testbericht.\nTweede regel.',
  }});
  console.log(res.getContent());
}
