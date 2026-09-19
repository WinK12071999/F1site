module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    res.status(501).json({ error: 'no-mail' });
    return;
  }

  var body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (err) {
      res.status(400).json({ error: 'Invalid JSON' });
      return;
    }
  }
  body = body || {};

  if (String(body.honey || body._honey || '').trim()) {
    res.status(200).json({ ok: true });
    return;
  }

  var name = cleanLine(body.name);
  var email = cleanLine(body.email).toLowerCase();
  var organization = cleanLine(body.organization);
  var service = cleanLine(body.service);
  var budget = cleanLine(body.budget);
  var message = String(body.message || '').replace(/\r/g, '').trim();

  if (!name || !message || !isValidEmail(email)) {
    res.status(400).json({ error: 'Invalid fields' });
    return;
  }

  try {
    await forwardInquiry({
      name: name,
      email: email,
      organization: organization,
      service: service,
      budget: budget,
      message: message,
      _subject: 'New project inquiry — F1site',
      _template: 'table',
      _captcha: 'false'
    });
  } catch (err) {
    res.status(502).json({ error: 'Send failed' });
    return;
  }

  try {
    await sendBrandedEmail(email, name);
  } catch (err) {
    // Inquiry already reached the studio.
  }

  res.status(200).json({ ok: true });
};

function cleanLine(value) {
  return String(value || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function thankYouText(name) {
  return [
    'F1SITE',
    'Message received',
    '',
    'Thank you for reaching out, ' + name + '.',
    '',
    "We've received your message and will be in touch as soon as possible.",
    '',
    'projects@f1site.com',
    '+1 343-462-6045',
    '',
    '— The F1site studio'
  ].join('\n');
}

function thankYouHtml(name) {
  var safeName = escapeHtml(name);
  var logo = 'https://f1site.com/logos/f1-logo-transparent.png';
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Thank you</title></head>' +
    '<body style="margin:0;padding:0;background:#050506;">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#050506;">' +
    '<tr><td align="center" style="padding:48px 16px;">' +
    '<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;">' +
    '<tr><td align="center" style="padding:0 0 28px;">' +
    '<img src="' + logo + '" width="132" alt="F1site" style="display:block;width:132px;height:auto;border:0;">' +
    '</td></tr>' +
    '<tr><td align="center" style="padding:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:#edd296;">Message received</td></tr>' +
    '<tr><td align="center" style="padding:0 0 18px;font-family:Georgia,\'Times New Roman\',Times,serif;font-size:46px;line-height:0.95;color:#f6f1e8;">Thank you</td></tr>' +
    '<tr><td align="center" style="padding:0 28px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.65;color:#cfc8bb;">Thank you for reaching out, ' + safeName + '. We\'ve received your message and will be in touch as soon as possible.</td></tr>' +
    '<tr><td align="center" style="padding:0 0 28px;"><div style="width:48px;height:1px;background:#edd296;opacity:0.55;"></div></td></tr>' +
    '<tr><td align="center" style="padding:0 0 8px;font-family:Georgia,\'Times New Roman\',Times,serif;font-size:18px;color:#f6f1e8;">The F1site studio</td></tr>' +
    '<tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#9a9388;">' +
    '<a href="mailto:projects@f1site.com" style="color:#edd296;text-decoration:none;">projects@f1site.com</a><br>' +
    '<a href="tel:+13434626045" style="color:#cfc8bb;text-decoration:none;">+1 343-462-6045</a><br>' +
    'Worldwide' +
    '</td></tr>' +
    '</table></td></tr></table></body></html>';
}

async function forwardInquiry(fields) {
  var body = new URLSearchParams();
  Object.keys(fields).forEach(function (key) {
    if (fields[key] != null && fields[key] !== '') body.set(key, String(fields[key]));
  });

  var response = await fetch('https://formsubmit.co/ajax/projects@f1site.com', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body: body
  });

  if (!response.ok) {
    throw new Error('Formsubmit ' + response.status);
  }
}

async function sendBrandedEmail(to, name) {
  var from = process.env.CONTACT_FROM || 'F1site <projects@f1site.com>';
  var response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: from,
      to: [to],
      reply_to: 'projects@f1site.com',
      subject: 'Thank you for reaching out — F1site',
      html: thankYouHtml(name),
      text: thankYouText(name)
    })
  });

  if (!response.ok) {
    throw new Error('Resend ' + response.status);
  }
}
