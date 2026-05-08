# Google OAuth Setup

1. Open Google Cloud Console.
2. Create or select the ProgressKit AI platform project.
3. Enable these APIs:
   - Cloud Resource Manager API
   - Cloud Firestore API
4. Go to APIs & Services -> OAuth consent screen.
5. Configure the consent screen.
6. Add these scopes:
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/firebase.readonly`
   - `https://www.googleapis.com/auth/cloud-platform.read-only`
   - `https://www.googleapis.com/auth/datastore`
7. Go to APIs & Services -> Credentials.
8. Create OAuth client ID -> Web application.
9. Add this authorized redirect URI:
   - `http://localhost:3000/api/google/callback`
10. Copy `.env.example` to `.env.local`.
11. Fill in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
12. Restart `npm run dev`.

The connected Google user must have IAM permission on the target Firebase/GCP
project. For Firestore reads, the user needs permissions that allow reading
documents from the selected project.
