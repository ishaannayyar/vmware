# VMware Renewal Readiness Assessment

A self-contained, client-facing assessment tool that scores an organization's
suitability for a VMware exit based on cost pressure, technical lock-in
(NSX/vSAN/Tanzu), workload risk, organizational readiness, and timing.

No backend, no database, no build step. Pure HTML/CSS/JS — all scoring runs
in the visitor's browser.

## Deploy on GitHub Pages (free, ~2 minutes)

1. Create a new repository on GitHub (e.g. `exit-signal`).
2. Upload these three files to the repo root: `index.html`, `style.css`, `script.js`.
3. Go to **Settings → Pages**.
4. Under **Source**, select **Deploy from a branch**, branch = `main`, folder = `/ (root)`.
5. Save. Your tool will be live in a minute or two at:
   `https://<your-username>.github.io/exit-signal/`

That URL is what you send to clients.

## Before you send it to anyone

Open `script.js` and change this line near the top:

```js
const ADVISOR_EMAIL = "you@yourfirm.com";
```

to your real email. That's what the "Email my result →" button on the
results screen sends to (via a `mailto:` link — no server, no data storage,
the client's own email client opens with the summary pre-filled).

## Customizing the questions or scoring

Everything lives in `script.js`:

- **`SECTIONS`** — the full question bank. Each question has a `category`
  (`cost`, `lockin`, `risk`, `readiness`, `timing`, or `null` for
  informational-only) and `options` with `points` (0–4 scale).
- **`WEIGHTS`** — how much each category counts toward the final 0–100 score.
  Currently: cost 25%, lock-in 30%, risk 20%, readiness 15%, timing 10%.
- **`getTier()`** — the three score bands and their copy (0–44 / 45–74 / 75–100).
- **`buildRecommendation()`** — the narrative text shown per tier, plus the
  two conditional call-outs for low lock-in or low readiness scores.
- **`buildPlatformSuggestions()`** — simple rule-based logic that recommends
  Proxmox, Nutanix, Hyper-V, OpenShift, Azure VMware Solution, or "stay on
  VMware" depending on the NSX/vSAN/Tanzu/cloud-strategy/budget answers.

Adding a question: add an entry to the relevant section's `questions` array
with a unique `id`, assign it a `category`, and give each option a `points`
value. The scoring engine picks it up automatically — no other code changes
needed.

## What it doesn't do (by design)

- No data is stored or sent anywhere unless the visitor clicks "Email my
  result" — at which point it's just their own email client, addressed to you.
- No client-side tracking/analytics included. Add your own (e.g. Plausible,
  Fathom, or GA4) by dropping a script tag in `index.html` if you want
  completion-rate visibility.
- Figures and category weights are a defensible starting model, not a
  certified scoring standard — recalibrate the weights/points if your own
  client engagements suggest different priorities.
