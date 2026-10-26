# GoHighLevel setup: Vancouver funnel

**Time:** about 20 minutes, plus optional workflows.
**Where:** everything happens inside the **Vancouver sub-account**, not the agency view.

## How GHL fits in

```
Visitor fills in the funnel → website (/api/lead) → GHL contact (created or updated)
                                                     + offer tag + stage tag
                                                     + consent note
Visitor books in the calendar → calendar sends its own confirmation email
```

- **GHL doesn't need to send anything for the funnel to work.** Visitors book directly on the booking page.
- **GHL's job** is to hold the leads, and optionally follow up with people who don't finish.

---

## Step 1: Create the API key (Private Integration)

1. **Settings** (bottom left) → **Private Integrations** → **Create new Integration**.
   - If you don't see *Private Integrations*, ask the agency owner to enable it for this sub-account.
2. **Name:** `Vancouver funnel`. Description: optional.
3. **Scopes**, tick exactly these two:
   - **View Contacts** (`contacts.readonly`)
   - **Edit Contacts** (`contacts.write`)
4. Click **Create**.
5. **Copy the token right away.** GHL shows it only once.
   - It goes into Cloudflare as `GHL_TOKEN` (see the go-live guide, Part 3).
   - Never paste it into a web page, email or chat. It's like a password to your contacts.
   - **If it ever leaks:** delete the integration, create a new one, update `GHL_TOKEN` in Cloudflare and redeploy.

## Step 2: Copy the Location ID

**Settings → Business Profile** → under *General*, copy the **Location ID**.
It goes into Cloudflare as `GHL_LOCATION_ID`.
(It's also the code after `/location/` in your browser's address bar while you're in the sub-account.)

## Step 3: Set duplicate-contact matching

**Settings → Business Profile** → find **Allow Duplicate Contact** → make sure it's **OFF** → **Save**.

Why: each visitor is sent to GHL up to 3 times (email step → phone step → booked). With duplicates off, GHL matches them by email and phone and updates **one** contact instead of creating three.

## Step 4: Know what arrives

You don't create any of this; it appears automatically with the first real lead.

**Contact fields:** first name, last name, email, phone (`+1…`), and **Source** = `Facebook | DexaFit Vancouver` (Cloudflare variable `GHL_SOURCE`).

**Tags:**

| Tag | Added when |
| --- | --- |
| `location:vancouver` | Every lead (Cloudflare variable `GHL_TAGS`) |
| `source:meta-ads` | Every lead (Cloudflare variable `GHL_TAGS`) |
| `dexafit-vancouver` | Lead came from the Vancouver new client special (DEXA scan, $127) |
| `funnel-partial` | They entered their email (step 3) |
| `funnel-complete` | They entered their phone and accepted the privacy policy (step 4) |
| `funnel-booked` | They booked: the thank-you page after Acuity's redirect adds it. |
| `sms-consent` | They ticked "I agree to receive messages…". **Only text contacts with this tag.** |

Tags accumulate, so a contact who booked has `funnel-partial`, `funnel-complete` **and** `funnel-booked`.

**Note on the contact:** when someone completes the phone step, a note titled *"Funnel lead (…) – consent record"* is added. It holds:
- whether they accepted the privacy policy and agreed to SMS
- the exact consent wording they saw
- the time, IP address, browser and page

It's your proof of SMS consent under US texting law (TCPA). **Don't delete these notes.**

## Step 5: Save a list of funnel leads (optional, 2 min)

1. **Contacts** → **Filters / More filters** → **Tag** → is → `funnel-partial` (every funnel lead has it).
2. **Save as Smart List** → name `Vancouver funnel leads`.

---

## Step 6: Follow-up workflows (optional)

These only contact people who **don't** finish. For each workflow:
- Go to **Automation → Workflows → + Create Workflow → Start from Scratch**.
- In the workflow's **Settings** tab, leave **Allow re-entry** off.
- When it's built, turn the **Draft/Publish** toggle (top right) to **Publish** → **Save**.

### Workflow 1: "Vancouver – left after email" (recommended)
For people who gave their email but never reached the phone step.

1. **Add New Trigger → Contact Tag.**
   - Filter: **Tag Added** → `funnel-partial` → **Save Trigger**.
2. **+ → Wait** → **30 minutes**.
3. **+ → If/Else**
   - Branch "Finished": condition **Contact Tag → Includes** → `funnel-complete` → this branch ends here (no action).
   - **None** branch (didn't finish) → continue below.
4. In the *None* branch: **+ → Send Email**. Example:
   - Subject: `Your new client offer is still waiting`
   - Body: one or two lines on the offer (DEXA scan for $127 with code NEWCLIENT20), plus a button linking to `https://vancouver.dexafitoffers.com/`.
5. **No SMS in this workflow.** These people haven't given SMS consent yet.
6. **Publish → Save.**

### Workflow 2: "Vancouver – didn't book" (build now, publish later)
For people who completed the form but didn't book.

1. **Trigger: Contact Tag → Tag Added** → `funnel-complete`.
2. **+ → Wait** → **1 day**.
3. **+ → If/Else:** branch "Booked" = Contact Tag includes `funnel-booked` → ends. *None* branch → continue.
4. In *None*: **Send Email** with the booking page link `https://vancouver.dexafitoffers.com/book`. Then, for SMS: **+ → If/Else: Contact Tag includes `sms-consent`** → **Send SMS** with the same link. Without the tag, no SMS.
5. **Save, but leave it in Draft.**
   - Publish only after the Acuity redirect is set up and a test booking has given a contact the `funnel-booked` tag.
   - Until then, nobody gets `funnel-booked`, so this would also chase people who **did** book.

> **Alternative if the calendar already writes appointments into GHL:** if bookings from the Vancouver calendar show up as **appointments** in this sub-account (Calendars → Appointments), workflow 2 can check for an upcoming appointment instead of `funnel-booked`. Check after your first test booking.

---

## Step 7: Texting (only if you'll send SMS)

- **A2P 10DLC registration is required** to text US numbers from GHL: **Settings → Phone Numbers → Trust Center**. Approval can take days to weeks, so start now if you'll use SMS.
- **Only text contacts tagged `sms-consent`.**
- **GHL handles "STOP" replies automatically**, setting the contact to Do Not Disturb. Don't override it.

## Step 8: Email deliverability (recommended)

For emails from workflows to land in inboxes, not spam, send from a domain you've authenticated.
**Settings → Email Services** (or *Dedicated Domain*) → set up a sending domain, e.g. `mail.dexafitoffers.com`, and add the DNS records it gives you in GoDaddy.

---

## Step 9: Test (after the site is on Cloudflare)

1. Go through the funnel with your real email and phone, and tick the SMS box.
2. **Contacts:** you appear once (not three times) with these tags:
   - `location:vancouver`, `source:meta-ads`, `dexafit-vancouver`
   - `funnel-partial`
   - `funnel-complete`
   - `sms-consent`
3. **Open the contact → Notes:** the consent record is there.
4. **Test workflow 1:** start the funnel with a different email, stop after the email step, and wait 30 minutes. The reminder should arrive.
5. **Delete your test contacts.**

## Troubleshooting

If no contact appears: in Cloudflare, open your project → **Deployments** → latest → **Functions** → **Real-time logs**, submit the funnel again, and read the error:

| Error in the log | Cause | Fix |
| --- | --- | --- |
| `not configured` | `GHL_TOKEN` or `GHL_LOCATION_ID` missing | Add them in Cloudflare, then **Retry deployment** |
| `GHL … 401` | Token wrong or deleted | Create a new Private Integration token, update `GHL_TOKEN`, redeploy |
| `GHL … 403` | Scopes missing | Edit the integration: tick View Contacts and Edit Contacts |
| `GHL … 400` / `422` | Wrong Location ID | Re-copy it from Business Profile |
| Contact appears, but no tags or note | The tag/note request was rejected (shown in the log) | Send Claude the log line |
| Three contacts per person | Allow Duplicate Contact is on | Step 3 |
