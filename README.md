# WCS Referral Lookup - Multi-Location

Search members and pre-fill referral forms for all West Coast Strength locations.

## URLs

Each location has its own URL:
- `/salem` - Salem
- `/keizer` - Keizer
- `/eugene` - Eugene
- `/springfield` - Springfield
- `/clackamas` - Clackamas
- `/milwaukie` - Milwaukie
- `/medford` - Medford

Staff bookmark their location's URL directly.

## Local Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open http://localhost:3000/salem (or any location)

## Configuration

All location settings are in `clubs-config.json`. For each club, configure:

- `referralFormUrl` - The GHL form for referrals (pre-filled)
- `dayOneFormUrl` - The GHL form for Day One booking (pre-filled)
- `manualEntryUrl` - The GHL form for manual entry (blank)

## Deploy to Render

1. Push to GitHub
2. Create new Web Service on Render
3. Build Command: `npm install`
4. Start Command: `npm start`

No environment variables needed - everything is in `clubs-config.json`.
