# Progress

Local setup guide for the Next.js app.

## Prerequisites

- Node.js 20+
- npm
- Google Cloud project with Firestore access, if you want to use Google/Firebase features
- Gemini API key, if you want AI metric suggestions/plans

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create your local environment file:

```bash
cp .env.example .env.local
```

3. Fill in `.env.local`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash-preview-09-2025
```

4. Configure Google OAuth:

- Enable Cloud Resource Manager API and Cloud Firestore API.
- Create an OAuth Web application client.
- Add this authorized redirect URI:

```text
http://localhost:3000/api/google/callback
```

See `GOOGLE_OAUTH_SETUP.md` for the full Google setup checklist.

## Run Locally

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Useful Commands

```bash
npm run lint
npm run build
npm run start
```

Use `npm run start` only after `npm run build`.
