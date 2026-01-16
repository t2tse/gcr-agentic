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

### Deployment Command to Cloud Run
```bash
gcloud run deploy checkmate \
  --source . \
  --project ${GOOGLE_CLOUD_PROJECT_ID} \
  --region ${GOOGLE_CLOUD_REGION} \
  --allow-unauthenticated \
  --set-env-vars GCP_PROJECT_ID=${GOOGLE_CLOUD_PROJECT_ID},GCP_REGION=${GOOGLE_CLOUD_REGION},FIRESTORE_DATABASE_ID=my-personal-assistant,GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID},APP_HOST=https://checkmate-${GOOGLE_CLOUD_PROJECT_NUMBER}.us-central1.run.app
```
