# ncoo-signup-check

Tiny Vercel function for the North Conway Olive Oil in-store free-mini page
(`ncoliveoil.com/pages/free-mini`). Before signing someone up, the page asks this
function whether the email is **already subscribed** in Klaviyo. If yes, the tablet
shows a "Welcome back" screen instead of issuing a free-mini pass.

- Endpoint: `POST /api/check` with `{"email": "..."}` → `{"subscribed": true|false}`
- Only accepts requests from ncoliveoil.com.
- Returns only true/false. No customer data leaves Klaviyo.
- If this function is down, the page falls back to normal signup.

## Setup (one time)
1. In Klaviyo: Settings → API Keys → Create Private API Key → **Profiles: Read Access**, everything else No Access.
2. In Vercel: import this repo, then Settings → Environment Variables → add
   `KLAVIYO_PRIVATE_KEY` = the key from step 1 (Production). Redeploy.
3. Your endpoint is `https://<project-name>.vercel.app/api/check`.
