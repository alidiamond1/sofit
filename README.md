# SoFit

SoFit is a role-based fitness coaching platform with separate Coach and Client dashboards. It uses Next.js 16, MySQL, Knex, secure cookie sessions, and database-backed profile photos.

## Local setup

Requirements:

- Node.js 20.9 or newer
- A MySQL database

Copy `.env.example` to `.env`, fill in the database details, and then run:

```bash
npm install
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

### 1. Import the repository

In Vercel, choose **Add New > Project**, import `alidiamond1/sofit`, and keep the detected framework as **Next.js**. The default build command `npm run build` and output settings are correct.

### 2. Add environment variables

In **Project Settings > Environment Variables**, add these to Production and Preview:

| Variable | Required | Value |
| --- | --- | --- |
| `DB_HOST` | Yes* | Public hostname of the hosted MySQL server |
| `DB_PORT` | Yes* | Usually `3306` |
| `DB_NAME` | Yes* | MySQL database name |
| `DB_USER` | Yes* | MySQL username |
| `DB_PASSWORD` | Yes* | MySQL password |
| `DATABASE_URL` | Optional* | May replace all five `DB_*` connection variables |
| `DB_SSL` | Recommended | `true` when the provider requires TLS |
| `DB_SSL_REJECT_UNAUTHORIZED` | Recommended | `true`; use `false` only if the provider explicitly requires it |
| `DB_POOL_MAX` | Recommended | `3` for a serverless deployment |
| `SESSION_SECRET` | Yes | A long random secret |
| `NEXT_PUBLIC_APP_URL` | Recommended | Production URL, such as `https://sofit.vercel.app` |

\* Use either `DATABASE_URL` or the individual database connection variables.

Generate `SESSION_SECRET` locally:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Do not copy the local `.env` file into GitHub. It is intentionally ignored.

### 3. Apply database migrations

The database must be reachable from the internet and allow Vercel connections. After linking the local folder to the Vercel project, apply migrations once:

```bash
npx vercel link
npx vercel env run -e production -- npm run db:migrate
```

Run migrations again whenever a new migration file is added. Do not run seeds in production unless demo data is intentionally required.

### 4. Deploy

Deploy from the Vercel dashboard, push to the production branch, or run:

```bash
npx vercel --prod
```

After Vercel assigns the final domain, update `NEXT_PUBLIC_APP_URL` and redeploy. Test login, creating an invite, uploading a profile photo, coach/client messaging, and logout.

## Production notes

- Profile photos are stored in MySQL, so they remain available across Vercel function instances without S3.
- Knex and `mysql2` are kept as server-only packages to avoid dialect bundling errors.
- The connection pool defaults to three connections per function instance.
- Authentication requires `SESSION_SECRET` in production.
- Vercel automatically deploys `main` to Production and other branches as Preview deployments when Git integration is enabled.
