# Voice Notes → Google Sheets

Voice record on iPhone → Claude extracts notes → pushes to Google Sheets, auto-routed by project.

---

## Setup (20 min total)

### Step 1 — Google Apps Script (5 min)

1. Open the Google Sheet you want to use (or create a new one).
2. Click **Extensions → Apps Script**.
3. Delete everything in the editor and paste the entire contents of `google-apps-script.js`.
4. Click **Save** (disk icon).
5. Click **Run → testWrite** to verify it creates a "General" tab with a test row.
6. Click **Deploy → New deployment**.
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Click **Deploy**, authorize when prompted.
8. **Copy the web app URL** — you'll need this in Step 3.

---

### Step 2 — Deploy to Vercel (5 min)

```bash
# Push this folder to a new GitHub repo
cd voice-notes
git init
git add .
git commit -m "init"
git remote add origin https://github.com/YOUR_USERNAME/voice-notes.git
git push -u origin main
```

Then go to [vercel.com](https://vercel.com), click **Add New Project**, import the repo.

---

### Step 3 — Set Environment Variables in Vercel (2 min)

In your Vercel project → **Settings → Environment Variables**, add:

| Key | Value |
|-----|-------|
| `ANTHROPIC_API_KEY` | Your key from console.anthropic.com |
| `GOOGLE_SHEETS_WEBHOOK` | The URL from Step 1 |

Redeploy after adding variables.

---

### Step 4 — Add to iPhone Home Screen (2 min)

1. Open Safari on your iPhone.
2. Go to your Vercel URL (e.g. `https://voice-notes-abc.vercel.app`).
3. Tap the **Share** icon → **Add to Home Screen**.
4. Name it "Voice Notes".

Now it lives on your home screen like an app.

---

## How to use

1. Tap the app icon.
2. Tap the **record button**.
3. Talk. Start with the project name if you want auto-routing:
   - *"This is for SPS — I was thinking about the franchise deck..."*
   - *"Pickleball Body — need to update the quiz flow..."*
   - *"Roof leads — called the contact, he said..."*
4. Tap **stop**.
5. Claude extracts bullets + action items.
6. Tap **↗ push to sheets** to save.

---

## Adding / changing projects

Tap **⚙ projects** in the top right to add or remove project names the app listens for. You'll also want to add matching entries in the `PROJECT_MAP` in the Apps Script if you add new ones.

---

## Project routing logic

Claude detects the project from context — it doesn't need exact wording. "SPS", "paving stones", "sustainable paving" all route to the SPS tab. If no project is detected, it goes to **General**.

The Apps Script creates new tabs automatically if a new project name comes through that isn't in the map.
