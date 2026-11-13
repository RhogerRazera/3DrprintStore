# 3DR Print Portfolio

Landing page and content panel built with Next.js, TypeScript, Firebase Authentication, Cloud Firestore, and Firebase Hosting. The site is exported as static files to stay on the Firebase Spark plan.

## Firebase project

- Project: `portfolio-3drprint-2026`
- Hosting: <https://portfolio-3drprint-2026.web.app>
- Admin panel: <https://portfolio-3drprint-2026.web.app/admin/>
- Administrator allowlist: `3drprintstore@gmail.com`

The Firebase Web app config is in the ignored local file `.env.local`. Public Firebase Web config values are expected in a browser app; never add service-account credentials to this project.

## Complete Firestore setup

The Google Cloud Firestore API must be enabled for the project before a database can be created. In Google Cloud Console, enable `firestore.googleapis.com` for project `portfolio-3drprint-2026`, then run:

```bash
firebase firestore:databases:create "(default)" --location southamerica-east1 --edition standard --project portfolio-3drprint-2026
firebase deploy --only firestore:rules --project portfolio-3drprint-2026
```

The database is the default database in São Paulo. It qualifies for Firebase's one free Firestore database per project. The Spark plan includes free quotas for Hosting, Firebase Authentication Google sign-in, and Firestore operations; usage beyond free quotas can be unavailable on Spark.

## Google sign-in and administrator access

The Google provider is enabled and its config is in `firebase.json`. Deploy changes with:

```bash
firebase deploy --only auth --project portfolio-3drprint-2026
```

The panel checks for the verified Google account `3drprintstore@gmail.com`; Firestore Security Rules enforce the same allowlist. Firebase Hosting's default domain is the OAuth redirect domain.

## Admin panel

Open `/admin/` and select **Continuar com Google**. The Landing page tab edits the public copy, navigation labels, hero photos and their alt text, card labels, colors, section content, form copy, and footer. Enter a complete image URL to replace each photo. The Projects tab edits each product, including its title, text, category, and image URL. The Solicitações tab shows requests submitted from the contact form.

Landing page content is stored in `siteContent/home`; project documents are in `products`; contact form submissions are in `inquiries`. The public can read published projects and page content, and submit an inquiry. Only the verified administrator account can edit page content or products or read inquiries.

## Local development

```bash
npm install
npm run dev
```

For a production build and Hosting release:

```bash
npm run deploy
```
