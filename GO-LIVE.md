# DexaFit Vancouver (WA): go-live steps

Same process as Scottsdale. The Acuity calendar and Google Tag Manager are already built in. Meta tracking runs through GTM (part 5).

## 1. GoHighLevel (Vancouver sub-account)
Follow **GHL-SETUP.md** steps 1–3:
- Create a Private Integration (View + Edit Contacts) and copy the **token**.
- Copy the **Location ID**.
- Turn **Allow Duplicate Contact** off.

## 2. Cloudflare Pages
1. **Workers & Pages → Create → Pages** (*not* a Worker; the address must end in `.pages.dev`) → **Import an existing Git repository** → `dexavancouver`.
2. Settings:

   | Field | Value |
   | --- | --- |
   | Production branch | `main` |
   | Framework preset | None |
   | Build command | *(empty)* |
   | Build output directory | `site` |
   | Root directory | *(empty)* |

3. **Save and Deploy.**
4. **Settings → Variables and Secrets** (Production):

   | Name | Value |
   | --- | --- |
   | `GHL_TOKEN` | token, set as type **Secret** |
   | `GHL_LOCATION_ID` | Location ID |
   | `ALLOWED_ORIGINS` | your `https://….pages.dev` address, with no trailing `/` |
   | `GHL_SOURCE` | `Facebook \| DexaFit Vancouver` |
   | `GHL_TAGS` | `location:vancouver,source:meta-ads` |

5. **Deployments → ⋯ → Retry deployment.**

## 3. Test on the pages.dev address
1. **`/api/lead` opens without a "not found" page.** That means the relay is deployed.
2. **`/` and `/new-client/` show the right headline and price.**
3. **A full run through the funnel creates one GHL contact.** It should have Source `Facebook | DexaFit Vancouver`, the tags `location:vancouver`, `source:meta-ads`, `dexafit-vancouver`, `funnel-partial`, `funnel-complete` and, if ticked, `sms-consent`, plus a consent note.
4. **The booking page shows the Acuity calendar** with your name, email and phone filled in.
5. **GTM Preview (Tag Assistant)** shows the container loading on every page, then `funnel_lead` when the calendar page opens after the form. Meta Test Events should show `Lead` at that moment (see part 5).
6. **After a test booking, Acuity's redirect opens `/thank-you`.** The contact gets `funnel-booked`, and GTM shows `funnel_schedule`.

## 4. Domain (GoDaddy DNS)
1. **In Cloudflare:** Pages project → **Custom domains** → **Set up a custom domain** → `vancouver.dexafitoffers.com`.
2. **In GoDaddy:** **My Products → dexafitoffers.com → DNS**. Edit the existing `vancouver` record if there is one, otherwise **Add New Record**:

   | Type | Name | Value | TTL |
   | --- | --- | --- | --- |
   | CNAME | `vancouver` | your project's `….pages.dev` address (without `https://`) | 1/2 Hour |

   Remove any forwarding on `vancouver`.
3. **Wait for "Active"**, then re-test on the real domain.

## Acuity settings (in Acuity, not here)
1. **Redirect after booking (important):** in Acuity's scheduling-page / appointment-type settings, find the option to **send clients to a custom URL after they schedule**. Set it to:
   `https://vancouver.dexafitoffers.com/thank-you`.
   After booking, the thank-you page opens full-window, tags the GHL contact `funnel-booked` with the right offer, and pushes `funnel_schedule` (Meta Schedule via GTM).
   **Test it once:** book a real test appointment. If the thank-you page doesn't appear, tell Claude.
2. **Don't also turn on Acuity's own Facebook Pixel integration** while the redirect works. Meta would get every booking twice. Use it only as a fallback if the redirect can't be set up.
3. **Coupon and price:** the page tells people to use `NEWCLIENT20` for 20% off. That code must exist in Acuity for appointment type `78175279`. 20% off $159 is **$127.20**, but the page and ads say **$127**. Either set a fixed $32 discount (→ $127) or change the copy to $127.20.

## 5. Meta tracking through GTM (container `GTM-5QGRHDDQ`)
There's no Pixel code in the site, so Meta only gets what the GTM container sends. In GTM (**Tags** / **Triggers**), check this:

1. **PageView:** a Meta Pixel base tag firing on **All Pages** (Initialization or Page View). This is probably what's there already.
2. **Lead:** a Meta event tag `Lead` on a **Custom Event** trigger with event name `funnel_lead`.
   - Not on "page URL contains book" (it would count refreshes and direct visits).
   - Not on a form-submit trigger (the form has no normal submit, so it won't fire reliably).
   - For deduplication with a future Conversions API, set the event ID to a Data Layer Variable `event_id`.
3. **Schedule:** a Meta event tag `Schedule` on Custom Event `funnel_schedule` (event ID: `event_id` as above).
4. **Only one Pixel:** don't also add a Meta Pixel to the site or through Acuity, or every event is counted twice.
5. **Publish the container** (Submit → Publish), then check with GTM **Preview** + Meta **Test Events**.

If someone else manages the container, send them points 2–3.

## Still needed from the client
- **Privacy policy text:** it must mention SMS, GoHighLevel, and Meta/Google tracking.
- **Contact email and cancellation policy** for the thank-you page (left off for now).
- **Logo file** (a text logo is generated for now).
