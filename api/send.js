// Vercel serverless function: sends the site's three forms (Kurzanfrage chat,
// Kontakt, Bewerbung) through Resend.
//
// Environment (Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY  required. Without it the function answers 503
//                   "not_configured" and the page falls back to a prepared
//                   e-mail in the visitor's own mail program.
//   MAIL_FROM       sender on a domain verified in Resend,
//                   e.g. "OXYGEN Lüftungsbau <website@oxygen-lueftungsbau.de>"
//   MAIL_TO         inbox for enquiries (default info@oxygen-lueftungsbau.de)
//
// Testing before the domain is verified: MAIL_FROM=onboarding@resend.dev and
// MAIL_TO=the Resend account's own address. Resend allows nothing else from
// that sender, so the visitor's receipt is refused and only logged. Remove
// both variables once the domain is verified, or enquiries miss info@.
//
// The visitor gets a short receipt that never repeats what they typed, so
// the form cannot be used to send arbitrary text to a third party's address.

const RESEND_URL = 'https://api.resend.com/emails';
const KINDS = {
  chat: { subject: 'Kurzanfrage über die Website', receipt: 'Ihre Anfrage' },
  kontakt: { subject: 'Kontaktanfrage über die Website', receipt: 'Ihre Anfrage' },
  bewerbung: { subject: 'Bewerbung über die Website', receipt: 'Ihre Bewerbung' },
};
const MAX_FIELDS = 20;
const MAX_VALUE = 5000;
const MAX_FILES = 3;
const MAX_FILE_BYTES = 3 * 1024 * 1024;      // total; Vercel caps a request body at 4.5 MB
const FILE_EXT = /\.(pdf|docx?|odt|jpe?g|png)$/i;
const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/;
const MIN_FILL_MS = 2500;                     // faster than this is a bot

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);

async function resend(key, mail) {
  const r = await fetch(RESEND_URL, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify(mail),
  });
  if (!r.ok) throw new Error('resend ' + r.status + ' ' + (await r.text()).slice(0, 300));
  return r.json();
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method' }); }

  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(503).json({ error: 'not_configured' });
  const from = process.env.MAIL_FROM || 'OXYGEN Lüftungsbau <website@oxygen-lueftungsbau.de>';
  const to = process.env.MAIL_TO || 'info@oxygen-lueftungsbau.de';

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'body' });

  const kind = KINDS[body.kind];
  if (!kind) return res.status(400).json({ error: 'kind' });

  // Spam traps: a hidden field people never see, and a minimum time on the
  // form. A bot gets the same "ok" a person would, so it learns nothing.
  if (clean(body.website, 200) || !(Number(body.elapsed) >= MIN_FILL_MS)) return res.status(200).json({ ok: true });

  const fields = (Array.isArray(body.fields) ? body.fields : []).slice(0, MAX_FIELDS)
    .map(f => [clean(f && f[0], 80), clean(f && f[1], MAX_VALUE)])
    .filter(f => f[0] && f[1]);
  if (!fields.length) return res.status(400).json({ error: 'empty' });

  const replyTo = clean(body.replyTo, 200);
  const hasReply = EMAIL.test(replyTo);

  const files = Array.isArray(body.attachments) ? body.attachments : [];
  if (files.length > MAX_FILES) return res.status(413).json({ error: 'files' });
  let total = 0;
  const attachments = [];
  for (const f of files) {
    const filename = clean(f && f.filename, 120).replace(/[\\/]/g, '_');
    const content = String(f && f.content || '');
    if (!FILE_EXT.test(filename) || !/^[A-Za-z0-9+/=]+$/.test(content)) return res.status(400).json({ error: 'file_type' });
    total += Math.floor(content.length * 3 / 4);
    attachments.push({ filename, content });
  }
  if (total > MAX_FILE_BYTES) return res.status(413).json({ error: 'file_size' });

  const subject = kind.subject + (body.topic ? ' – ' + clean(body.topic, 120) : '');
  const rows = fields.map(([k, v]) => `<tr><th align="left" valign="top" style="padding:6px 16px 6px 0;color:#585857;font-weight:600">${esc(k)}</th><td style="padding:6px 0;white-space:pre-wrap">${esc(v)}</td></tr>`).join('');
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#141414">
<p style="margin:0 0 16px"><strong>${esc(subject)}</strong></p>
<table cellspacing="0" cellpadding="0" style="border-collapse:collapse">${rows}</table>
${attachments.length ? `<p style="margin:16px 0 0;color:#585857">Anhänge: ${attachments.map(a => esc(a.filename)).join(', ')}</p>` : ''}
<p style="margin:24px 0 0;color:#8a8a88;font-size:13px">Gesendet über das Formular auf oxygen-lueftungsbau.de</p>
</div>`;
  const text = fields.map(([k, v]) => k + ': ' + v).join('\n\n') + '\n\n—\nGesendet über das Formular auf oxygen-lueftungsbau.de';

  try {
    await resend(key, { from, to: [to], subject, html, text, ...(hasReply ? { reply_to: replyTo } : {}), ...(attachments.length ? { attachments } : {}) });
  } catch (e) {
    console.error(e.message);
    return res.status(502).json({ error: 'send' });
  }

  if (hasReply) {
    const receipt = `Guten Tag,

vielen Dank – ${kind.receipt} ist bei uns eingegangen. Wir melden uns so schnell wie möglich bei Ihnen.

Für dringende Anliegen erreichen Sie uns telefonisch unter 06323 9129790 (Mo–Fr).

Freundliche Grüße
OXYGEN Lüftungsbau GmbH & Co. KG
In den Seewiesen 6, 67480 Edenkoben
www.oxygen-lueftungsbau.de`;
    try {
      await resend(key, {
        from, to: [replyTo], reply_to: to, subject: 'Eingangsbestätigung: ' + kind.receipt,
        text: receipt,
        html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#141414;white-space:pre-line">${esc(receipt)}</div>`,
      });
    } catch (e) {
      // the enquiry itself arrived; a failed receipt is logged, not reported
      console.error('receipt', e.message);
    }
  }
  return res.status(200).json({ ok: true });
};
