# Checkmate API

The backend service for Checkmate, a task management application.

## Description

Checkmate API is built with NestJS and provides task and list management capabilities. The backing database is Firestore.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

This service is deployed to Google Cloud Run.

### Deployment Command
```bash
gcloud run deploy checkmate \
  --source . \
  --project genai-java-cloudrun \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GCP_PROJECT_ID=genai-java-cloudrun,GCP_REGION=us-central1,FIRESTORE_DATABASE_ID=my-personal-assistant,APP_HOST=https://checkmate-437191946001.us-central1.run.app
```

### Service URL
The service is accessible at: `https://checkmate-437191946001.us-central1.run.app`
