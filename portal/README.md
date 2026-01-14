# Portal

This is the frontend portal for Checkmate and Stash.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Deployment Command
```bash
gcloud run deploy portal \
  --source . \
  --project ${GOOGLE_CLOUD_PROJECT_ID} \
  --region ${GOOGLE_CLOUD_REGION} \
  --allow-unauthenticated \
  --set-build-env-vars NEXT_PUBLIC_FIREBASE_API_KEY=${NEXT_PUBLIC_FIREBASE_API_KEY},NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN},NEXT_PUBLIC_FIREBASE_PROJECT_ID=${NEXT_PUBLIC_FIREBASE_PROJECT_ID},NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET},NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID},NEXT_PUBLIC_FIREBASE_APP_ID=${NEXT_PUBLIC_FIREBASE_APP_ID},NEXT_PUBLIC_CHECKMATE_API=${NEXT_PUBLIC_CHECKMATE_API},NEXT_PUBLIC_STASH_API=${NEXT_PUBLIC_STASH_API}
```
