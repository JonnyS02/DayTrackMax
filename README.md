# DayTrack Max

DayTrack Max is a compact birthday reminder application with a React frontend and a CodeIgniter 4 backend. Users can manage birthdays and individual email reminders, while the backend handles authentication, email verification, password recovery, and scheduled notifications.

**[Try the demo here](https://jonathan-stengl.de/DayTrackMax/test-login)**

- `frontend/`: React, Tailwind, and the MJML sources
- `backend/`: CodeIgniter 4 API and generated email views

## Local setup

1. Import `backend/database.sql` in phpMyAdmin.
2. Copy `backend/.env.example` to `backend/.env` and set the database connection, sender address, frontend URL, and cron key.
3. Set `VITE_APP_BASE_URL` and `VITE_API_BASE_URL` in `frontend/.env`.

## Frontend

Run these commands from `frontend/`:

- `npm run dev`: start the local frontend
- `npm run build`: build the frontend and copy it to `backend/public`
- `npm run preview`: preview the production build locally
- `npm run lint`: run ESLint
- `npm run typecheck`: check TypeScript
- `npm run emails:build`: compile MJML to `backend/app/Views/emails`
- `npm run emails:watch`: rebuild email views when their MJML sources change

For deployment, set the public URLs in `frontend/.env`:

```ini
VITE_APP_BASE_URL=https://example.com/DayTrackMax
VITE_API_BASE_URL=https://example.com/DayTrackMax/api
```

Builds are saved to `frontend/dist` and copied to `backend/public`. Build email templates separately with `npm run emails:build`. Add new page routes to both `frontend/src/routes.ts` and the allowlist in `backend/.htaccess`.

## Backend

Run `composer install` in `backend/`. Schedule a daily `POST /api/cron/birthday-reminders` with the header `X-Cron-Key: <daytrack.cronKey>`.

Set `daytrack.demoAccountEnabled = true`, `daytrack.demoAccountEmail`, and `daytrack.demoAccountPassword` in `backend/.env` to enable the demo account. The daily endpoint creates it in English with sample birthdays and resets it on each run.

Keep the credentials in `frontend/src/demo-account.ts` in sync with the backend configuration and rebuild the frontend after changes.

After building, upload `backend/` to `htdocs/DayTrackMax` to serve the app at `/DayTrackMax/`. Alternatively, use `backend/public` as the web root.
