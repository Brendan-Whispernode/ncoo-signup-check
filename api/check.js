// POST /api/check  { "email": "someone@example.com" }
// -> { "subscribed": true | false, "previouslySignedUp": true | false }
//
// Answers one question only: is this email already subscribed to
// North Conway Olive Oil marketing emails in Klaviyo?
// The Klaviyo private key lives in the KLAVIYO_PRIVATE_KEY environment
// variable on Vercel and never reaches the browser.

const ALLOWED_ORIGINS = [
  "https://ncoliveoil.com",
  "https://www.ncoliveoil.com",
  "https://north-conway-olive-oil-company.myshopify.com",
];
const EMAIL_RE = /^[^\s@"\\,()<>]+@[^\s@"\\,()<>]+\.[^\s@"\\,()<>]{2,}$/;

function cors(req, res) {
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
  return ALLOWED_ORIGINS.includes(origin);
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return {}; } }
  return {};
}

module.exports = async function handler(req, res) {
  const allowed = cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!allowed) return res.status(403).json({ error: "origin not allowed" });

  const key = process.env.KLAVIYO_PRIVATE_KEY;
  if (!key) return res.status(500).json({ error: "server not configured" });

  const body = await readBody(req);
  const email = String(body.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return res.status(400).json({ error: "invalid email" });
  }

  const url =
    "https://a.klaviyo.com/api/profiles/" +
    "?filter=" + encodeURIComponent(`equals(email,"${email}")`) +
    "&additional-fields%5Bprofile%5D=subscriptions" +
    "&fields%5Bprofile%5D=subscriptions";

  try {
    const r = await fetch(url, {
      headers: {
        Authorization: `Klaviyo-API-Key ${key}`,
        accept: "application/vnd.api+json",
        revision: "2024-10-15",
      },
    });
    if (!r.ok) return res.status(502).json({ error: "klaviyo " + r.status });
    const data = await r.json();
    const profile = (data.data || [])[0];
    const mk = profile?.attributes?.subscriptions?.email?.marketing || {};
    const subscribed = mk.consent === "SUBSCRIBED" && mk.can_receive_email_marketing !== false;
    // Anyone who has ever opted in (still subscribed OR later unsubscribed) is not "new"
    const previouslySignedUp = mk.consent === "SUBSCRIBED" || mk.consent === "UNSUBSCRIBED";
    return res.status(200).json({ subscribed, previouslySignedUp });
  } catch (e) {
    return res.status(502).json({ error: "lookup failed" });
  }
};
