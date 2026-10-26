# DexaFit Vancouver (WA) – offer funnel

Live site for **vancouver.dexafitoffers.com**, hosted on Cloudflare Pages. Leads go to GoHighLevel.

| URL | Offer |
| --- | --- |
| `/` and `/new-client` | DexaFit DEXA Scan: ~~$159~~ **$127** with code `NEWCLIENT20`, New Client Special |

Each offer folder has `index.html` (landing + form), `book.html` (Acuity booking calendar) and `privacy.html`. The thank-you page is `/thank-you`.

- **Booking:** the Acuity calendar (owner `35741023`, appointment type `78175279`, calendar `12092372`) is embedded on `book.html`. It is pre-filled with the visitor's name, email and phone.
- **Google Tag Manager `GTM-5QGRHDDQ`:** on every page, with the script in `<head>` and the noscript after `<body>`. There is **no Meta Pixel in the page code**: Meta tracking runs through the GTM container.
  - The funnel pushes `funnel_lead` to the dataLayer on the calendar page, once per person who completed the opt-in form. Refreshes and direct visits don't count.
  - It pushes `funnel_schedule` on the thank-you page after a booking.
  - Both carry `funnel` (the offer) and `event_id`.
  - In GTM, fire the Meta **Lead** tag on Custom Event `funnel_lead`, and **Schedule** on `funnel_schedule`. See GO-LIVE.md.
- **Thank-you page `/thank-you`:** address, map and contact. After booking, Acuity redirects here. The page then tags the GHL contact `funnel-booked` and pushes `funnel_schedule`.

## What's here
- `site/`: the website. It's plain HTML/CSS/JS with no build step; Cloudflare's output directory is `site`.
- `functions/api/lead.js`: the lead relay at `/api/lead`. It sends leads to GoHighLevel (contact, tags, consent note) and needs the Cloudflare variables `GHL_TOKEN` and `GHL_LOCATION_ID`. `GHL_SOURCE` (`Facebook | DexaFit Vancouver`) sets the contact source and `GHL_TAGS` (`location:vancouver,source:meta-ads`) adds tags to every lead. After changing a variable, redeploy: variables only apply to new deployments.
- `GO-LIVE.md`: go-live steps.
- `GHL-SETUP.md`: detailed GoHighLevel setup (tags, workflows, testing).

## Still to do before launch
- **GTM container:** check how Meta Lead/Schedule fire (GO-LIVE.md, part 5).
- **Price:** 20% off $159 is $127.20, not $127. Make the Acuity price/coupon and the ad copy agree.
- **In Acuity, set the post-booking redirect** to `https://vancouver.dexafitoffers.com/thank-you`.
- **Client to send:** contact email, cancellation policy and logo. These are left off the thank-you page for now, and a text logo is used.
- **Real privacy policy:** the current one is a placeholder.

## Editing
Edit a file on GitHub and commit. Cloudflare republishes automatically within about a minute.
`site/index.html` (the bare domain) is a copy of `site/new-client/index.html`, so change both.

Generated from the DexaFit funnel template in `davidvmikael/cadenceleads` (`node scripts/build.js --site vancouver.dexafitoffers.com`).
