# Logic Calculator Pro 🚛

A full-stack logistics intelligence platform with real authentication, live GPS tracking, and fuel logging.

## Features
- **Real Login** — JWT auth with httpOnly cookies, role-based access (Manager / Driver)
- **Live GPS Tracking** — Drivers broadcast real GPS from their phone, manager sees live dots on world map
- **Fuel Logs** — Drivers log every fuel fill (date, location, litres, cost, efficiency)
- **Fuel Calculator** — Instant cost + CO₂ estimate for any route
- **Fleet Dashboard** — Manager sees all drivers, can search/filter, and track live

## Accounts
| Role    | Username | Password  |
|---------|----------|-----------|
| Manager | admin    | admin123  |
| Driver  | trk001   | pass123   |
| Driver  | trk002   | pass123   |
| Driver  | trk003–8 | pass123   |

## Local Development

```bash
npm install
npm run dev     # starts on http://localhost:3000
```

## Deploy to Render.com (Free)

1. Push this folder to a GitHub repo
2. Go to https://render.com → New → Web Service
3. Connect your GitHub repo
4. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Add Environment Variable:
   - `JWT_SECRET` → any long random string
6. Click **Deploy** → get your live URL in ~2 minutes

## Tech Stack
- **Backend:** Node.js + Express
- **Auth:** JWT tokens in httpOnly cookies
- **GPS:** Browser Geolocation API + real-time polling
- **Frontend:** Vanilla HTML/CSS/JS (no framework, no build step)
- **Deploy:** Render.com (free tier)

## Built by
Adithyan LJ — Data Analyst Portfolio Project
