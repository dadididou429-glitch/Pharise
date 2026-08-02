# Pharis — Product Blueprint (Sell + Monetize)

## Vision
Pharis is a real-time open-pharmacy finder: local curated data where available, OpenStreetMap worldwide, community confirmations, and a path for pharmacies to pay for visibility/trust.

## Dual goal
1. **Monetize** while on free infrastructure (Firebase free tier, static hosting).
2. **Build a sellable asset**: clean product, legal pages, measurable usage, clear revenue model.

## Revenue model (phase order)
| Priority | Product | Who pays | Free-tier friendly |
|----------|---------|----------|--------------------|
| 1 | Verified / Featured pharmacy badge | Pharmacy owner | Yes (manual payment first) |
| 2 | AdMob banners (after Play) | Advertisers | Yes |
| 3 | User Pro (no ads + alerts) | End user | Later |

### Verified badge (first money)
- Badge on card + detail sheet
- Optional boost in sort (featured first among same distance band)
- Owner contacts you via WhatsApp/email → you set `featured: true` / `verified: true` in data or Firestore
- Price suggestion (Algeria start): monthly modest fee or annual discount

## Technical north star
- Short term: stable PWA (current stack) + legal + featured flags + analytics events
- Medium term: Vite + React + TypeScript, modular data, strict Firestore rules
- Store: TWA or Capacitor wrapper for Google Play

## Free-tier limits (respect)
- Firestore reads/writes: cache aggressively, prefer local data
- Auth: admin only
- Hosting: static files (Firebase Hosting / Cloudflare Pages / Netlify)
- No heavy server required for v1 monetization

## KPIs to track (for buyers & for you)
- Weekly active users
- Emergency mode opens
- Call / directions taps
- Pharmacy submissions
- Reports resolved
- Paying pharmacies (count + MRR)

## Play Store checklist
- [x] Privacy policy URL
- [x] Terms URL
- [ ] Real contact email on legal pages
- [ ] 512 icon + feature graphic + screenshots
- [ ] Content rating questionnaire
- [ ] Signed AAB
- [ ] Data safety form (location, optional)

## Positioning (one line)
“Find open pharmacies near you — fast, multilingual, emergency-ready.”
