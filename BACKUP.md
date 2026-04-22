# The Cellar — Backup & Data Protection

## Overview

The Cellar uses a distributed architecture where code and data are stored separately, with multiple layers of protection and recovery.

## Code Backup

**Primary:** GitHub repository (`https://github.com/jaihimself/my-wine`)

All code changes are committed to Git and pushed to GitHub's `main` branch. GitHub serves as the source-of-truth for the application code and configuration.

**Automatic Deployment:** Every `git push` to `main` automatically triggers a deployment to Cloudflare Pages at `cellar.jaihimself.com`.

## Data Backup (Firestore)

**Primary:** Firebase Firestore

All inventory data (bottles, tasting notes, ratings, metadata) lives in Firebase Firestore under the `cellar` collection. Firebase provides:

- **Automatic Backups:** Firebase automatically backs up Firestore data. Google Cloud Platform (GCP) retains backups and manages disaster recovery.
- **Point-in-Time Recovery:** Firestore supports on-demand exports and restoration via the Firebase console or gcloud CLI (if needed for recovery scenarios).
- **Access Control:** Data is protected by Firestore security rules (`firestore.rules`), which restrict writes to the owner's UID only.

**Manual Export (Optional):**

To export Firestore data as a backup:

```bash
gcloud firestore export gs://my-bucket/my-export
```

(Requires GCP project setup and Cloud Storage bucket configured.)

## Deployment & Site Hosting

**Hosting Provider:** Cloudflare Pages

The static site is deployed to Cloudflare Pages, which watches the GitHub `main` branch. On every push:

1. Cloudflare detects the update to `main`.
2. Cloudflare clones the repository and deploys the site.
3. The app becomes live at `cellar.jaihimself.com` (typically within seconds).

**GitHub's Role:** Source control only—not hosting. Cloudflare is the hosting provider.

## Security & Authentication

- **Sign-In:** Google OAuth via Firebase Auth.
- **Data Access:** Firestore rules enforce that only the authenticated owner can write data.
- **HTTPS:** Cloudflare Pages provides SSL/TLS encryption for all traffic to `cellar.jaihimself.com`.

## Recovery Scenarios

| Scenario | Action |
|----------|--------|
| **Lost code (accidental deletion from GitHub)** | Pull from any local clone or restore from GitHub's repository history. |
| **Lost Firestore data** | Request a point-in-time restore from Firebase Console or use a GCP backup. Contact Firebase support if needed. |
| **Site down (Cloudflare issue)** | Check Cloudflare status page. Redeploy by pushing to `main` again, or manually redeploy from Cloudflare dashboard. |
| **Code broken after push** | Revert the commit via Git and push again. Cloudflare redeploys automatically. |

## Best Practices

1. **Always test locally before pushing** (`npx serve .` or `python3 -m http.server 8080`).
2. **Commit early, commit often** to preserve code history.
3. **Bump version in `index.html` footer** with every push (as per `CLAUDE.md`).
4. **Keep Firestore rules up-to-date** and test security rules in staging before deploying.
5. **Monitor Firebase Console** for quota usage and any anomalies.
