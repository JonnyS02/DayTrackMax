# Email templates

Run `npm run emails:build` from the frontend directory to generate production-ready HTML files directly in `backend/app/Views/emails`.

Use `npm run emails:watch` to rebuild templates when source files change.

The backend replaces the escaped `{{placeholders}}` before sending the generated HTML with CodeIgniter's email service.
