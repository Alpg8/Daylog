# Daylog Separated Projects

This folder contains three standalone code paths split from the monorepo:

- `daylog-app` (Expo/React Native mobile app)
- `daylog-data` (Prisma schema, migrations, seeds)
- `daylog-website` (Next.js web app)

## Suggested GitHub Repo Mapping

- `daylog-app` -> `github.com/<org>/daylog-app`
- `daylog-data` -> `github.com/<org>/daylog-data`
- `daylog-website` -> `github.com/<org>/daylog-website`

## Important Path Relationship

`daylog-website` references `../daylog-data` for Prisma schema and generated client.
Keep `daylog-website` and `daylog-data` as sibling folders if you use the current setup.

## First-Time Setup

### 1) Data project

```bash
cd daylog-data
npm install
npm run db:generate
```

### 2) Website project

```bash
cd ../daylog-website
npm install
npm run dev
```

### 3) App project

```bash
cd ../daylog-app
npm install
npm run start -- --web
```

## Optional: Initialize each as its own git repo

```bash
cd daylog-app && git init
cd ../daylog-data && git init
cd ../daylog-website && git init
```
