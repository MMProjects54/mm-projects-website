# MM Projects website

A fast, static website for MM Projects (Glasgow), with a simple editing dashboard (Pages CMS).

```
content/      ← all words, photos lists, services, reviews and settings (edited through the dashboard)
images/       ← photos, logo and icons
src/          ← design and code (you don't need to touch this)
.pages.yml    ← tells the dashboard which boxes to show
public/       ← the finished website, created automatically by Netlify
```

## How it works

You edit in the dashboard at **app.pagescms.org**. Your changes are saved to GitHub, Netlify rebuilds the site, and it's live about 1–2 minutes later.

## One-time setup (about 20 minutes, on a laptop)

**1. Put the site on GitHub**
1. Create a free account at **github.com**.
2. Click **+ → New repository**. Name it `mm-projects-website`, choose **Private**, and click **Create repository**.
3. Click **"uploading an existing file"**. Open the unzipped `mm-projects` folder, select everything inside it and drag it into the browser. Click **Commit changes**.
   - The file `.pages.yml` is hidden on Macs. In Finder, press **Cmd + Shift + .** (full stop) to show it, and make sure it's included in the upload.

**2. Connect Netlify**
1. In Netlify, click **Add new site → Import an existing project → GitHub** and choose `mm-projects-website`.
2. The settings fill in by themselves (build command `node src/build.mjs`, publish folder `public`). Click **Deploy**.
3. In **Domain management**, connect your domain. You can then delete the old drag-and-drop site.

**3. Open the dashboard**
1. Go to **app.pagescms.org** and sign in with GitHub.
2. When asked, install the Pages CMS GitHub app and give it access to `mm-projects-website`.
3. Open the repository. You'll see six sections on the left: **Project photos, Customer reviews, Website text, Services, Business settings, Privacy notice**.

## Everyday editing

**Change a photo**
1. Open **Project photos** and click the photo you want to change.
2. Click the image box, then **Upload**, and choose a photo from your laptop or phone.
3. Untick **"This is a placeholder image"** and fill in the title and area.
4. Click **Save**. The live site updates in 1–2 minutes.

**Add a photo:** click **Add an item** at the bottom of the gallery list. **Reorder:** drag items up or down. **Remove:** use the item's delete option.

**Add a review:** open **Customer reviews → Add an item**, paste the review word for word, add the name and click **Save**. Only add genuine reviews, with the customer's permission. Leave the star rating empty unless they gave one.

**Change wording:** open **Website text**, find the section (for example *Top of homepage* or *About Us section*), edit and click **Save**.

**Phone, WhatsApp, Instagram, Tally link, colours:** these are under **Business settings**.

## Photo tips
- JPG, about **1600px wide**, under **1 MB**. Phone photos are often 3–5 MB, so shrink them first: on a Mac use Preview → Tools → Adjust Size, on Windows use Photos → Resize, and on iPhone take a screenshot or use a "resize" app.
- The main homepage photo should be wide (landscape). Before & after pairs should be taken from the same spot.
- If a photo appears sideways, rotate it on your device and upload it again.

## If something goes wrong
- If a change breaks something, Netlify won't publish it and your current site stays online. Netlify → **Deploys** shows the message, which names the file and the problem. You can also send that message to Claude.
- Every save is recorded on GitHub, so any earlier version can be restored.

## Tally form
Enquiries come in through Tally (`https://tally.so/r/pbjq9b`), set under **Business settings → Tally forms**. The form keeps its own background colours from Tally. Test it after any change to the form: submit an enquiry with a photo and check it reaches Tally.

## Workflow
Customer finds the website → sends the Tally enquiry (with photos) → you review it → you arrange a site visit → you prepare the quotation in TradieHQ.

## Before launch checklist
- [ ] Test enquiry received through the live site
- [ ] **Business settings → Website address** set to your domain (turns on the sitemap and share previews)
- [ ] Placeholder photos replaced, especially the main homepage photo (a low-resolution crop from the mock-up)
- [ ] About Us and Services text checked: it's a draft, so make sure every line is true for your business
- [ ] Privacy notice checked. It's a plain-English template, not legal advice. Check whether you need to pay the ICO data protection fee.

## Technical notes
- Pages: `index.html`, `services.html`, `privacy.html`, `404.html`. No frameworks or packages; Node 18+ builds it.
- Local preview: `node src/build.mjs`, then `node src/serve.mjs` → http://localhost:8080
- Local SEO: page titles and descriptions, `HomeAndConstructionBusiness` structured data, semantic headings, alt text. No fake reviews or ratings.
- Accessibility: skip link, keyboard-operable menu, dialogs, gallery and slider; visible focus; contrast checked; reduced motion respected.
- No Content-Security-Policy header yet. Add one only after testing with the live Tally form.
