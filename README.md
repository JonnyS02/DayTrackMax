# DayTrack Max

- `frontend/`: React, Tailwind, and the MJML sources
- `backend/`: CodeIgniter 4 API and generated email views

## Local setup

1. Import `backend/database.sql` in phpMyAdmin.
2. Copy the values from `backend/.env.example` into the ignored `backend/.env` and configure the database, sender address, frontend URL, and a private cron key.
3. Set `VITE_APP_BASE_URL` and `VITE_API_BASE_URL` in the ignored `frontend/.env`.

## Frontend

Run these commands from `frontend/`:

- `npm run dev`: start the local frontend
- `npm run build`: build the frontend and copy its deployable files into `backend/public`
- `npm run preview`: preview the production build locally
- `npm run lint`: run ESLint
- `npm run typecheck`: check TypeScript
- `npm run emails:build`: compile MJML directly into `backend/app/Views/emails`
- `npm run emails:watch`: rebuild email views when their MJML sources change

Before a production build, configure `VITE_APP_BASE_URL` with the public application URL and `VITE_API_BASE_URL` with its `/api` URL. For example:

```ini
VITE_APP_BASE_URL=https://example.com/DayTrackMax
VITE_API_BASE_URL=https://example.com/DayTrackMax/api
```

The build keeps `frontend/dist` as an inspectable Vite output and synchronizes its browser files into `backend/public`. The backend `.htaccess` exposes only `/api`, the generated browser assets, and the known React routes; every other path returns 404. Add new screen paths to both `frontend/src/routes.ts` and this allowlist. Email templates remain an independent build step through `npm run emails:build`.

## Backend

Run `composer install` from `backend/`. The API base path is `/api`; the daily reminder endpoint is `POST /api/cron/birthday-reminders` with `Authorization: Bearer <daytrack.cronKey>`.

For deployment, run `npm run build` in `frontend` and then deploy only `backend`. When that directory is placed at `htdocs/DayTrackMax`, the application is available at `/DayTrackMax/`; `/public` is routed internally and never appears in the URL. A virtual host may alternatively use `backend/public` directly as its web root. The server does not need Node.js or the frontend source.