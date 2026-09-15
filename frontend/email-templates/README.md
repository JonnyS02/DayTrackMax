# Email templates

Run `npm run emails:build` in `frontend/` to compile templates to `backend/app/Views/emails`.

Use `npm run emails:watch` to rebuild templates when source files change.

German templates are in `src/de`, English templates in `src/en`. Emails use the user's saved language. The backend fills `{{placeholders}}` with HTML-escaped values before sending.
