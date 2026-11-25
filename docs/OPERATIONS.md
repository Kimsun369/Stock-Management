# Production Operations & Maintenance Manual

Venue Stock & Customer Leftovers Management System  
Target Deployment: Vercel (Region: `sin1` Singapore)  
Database: Google Sheets API v4  
Primary Timezone: `Asia/Phnom_Penh` (UTC+7)

---

## 1. Safe Clearing of Seed / Demo Data

Before handing over the live system to the venue client, demo transactions and mock data must be cleared while keeping schema headers and master configurations intact.

### ⚠️ Golden Rules for Google Sheets
1. **NEVER DELETE OR RENAME ANY ROW 1 (HEADERS).**
   - The application dynamically looks up column coordinates by matching Row 1 text.
   - Deleting Row 1 will cause runtime errors across all operations.
2. **NEVER DELETE TABS.**
   - All 10 tabs (`Users`, `Products`, `Categories`, `Suppliers`, `StockTransactions`, `StockAdjustments`, `CustomerRecords`, `CustomerItems`, `CustomerCollections`, `PurchaseRecords`, `AuditLogs`, `Settings`) must exist.

### Steps to Clear Mock Data
1. Open the connected Google Sheet.
2. For each of the following **transactional tabs**, select rows from **Row 2 downwards** and press `Delete` (clear contents, do not delete Row 1):
   - `StockTransactions`
   - `StockAdjustments`
   - `CustomerRecords`
   - `CustomerItems`
   - `CustomerCollections`
   - `PurchaseRecords`
   - `AuditLogs`
3. For `Products`:
   - If test products were created, clear rows from Row 2 down, or input the real venue drinks and menu items.
4. For `Users`:
   - Keep the verified administrator account. Remove any test staff accounts.
5. For `Categories` & `Suppliers`:
   - Keep or customize the venue's actual drink categories (Beer, Wine, Spirits, Mixers, Soft Drinks, Tobacco, Snacks) and beverage distributors.
6. For `Settings`:
   - Ensure Row 2 has `ID: default` and your venue's business settings.

---

## 2. Required Environment Variables

All variables must be configured in Vercel under **Project Settings > Environment Variables**:

| Variable Name | Required | Purpose | Example / Notes |
|---|---|---|---|
| `NEXTAUTH_SECRET` | **YES** | 32+ char cryptographic random secret for JWT encryption | Generate via `openssl rand -base64 32` |
| `NEXTAUTH_URL` | **YES** | Public canonical URL of the deployed application | `https://your-domain.vercel.app` (must match domain) |
| `GOOGLE_SHEET_ID` | **YES** | Google Spreadsheet ID from the URL | `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | **YES** | Service account email with Editor rights to the Sheet | `stock-manager@project-id.iam.gserviceaccount.com` |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | **YES** | Service account RSA private key in PEM format | `"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"` (preserve `\n`) |
| `GOOGLE_CLIENT_ID` | **YES** | Google OAuth 2.0 Web Client ID for Google login | `*.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | **YES** | Google OAuth 2.0 Web Client Secret | Client secret from Google Cloud Console |
| `SETUP_SECRET` | Recommended | Protects initial setup endpoint `/api/setup` | Secure random string |
| `HEALTH_TOKEN` | Recommended | Secret token for external uptime monitoring | Secure random string passed in `x-health-token` |
| `BUSINESS_DAY_START_HOUR` | Optional | Hour when venue operations roll to next day | Defaults to `5` (05:00 AM Cambodia time) |

---

## 3. Google Cloud OAuth & Permissions Setup

1. **Service Account Permissions**:
   - The email in `GOOGLE_SERVICE_ACCOUNT_EMAIL` must be shared on the Google Sheet as **Editor**.
2. **Google OAuth 2.0 Client**:
   - Under Google Cloud Console > APIs & Services > Credentials > OAuth 2.0 Client IDs:
   - **Authorized JavaScript origins**:
     - `https://your-domain.vercel.app`
   - **Authorized redirect URIs**:
     - `https://your-domain.vercel.app/api/auth/callback/google`

---

## 4. Automatic Backup & Recovery Strategy

Since Google Sheets serves as the database, native Google Drive versioning and automated backups provide complete disaster recovery.

### Method A: Native Version History (Instant Rollback)
1. In Google Sheets, navigate to **File > Version history > See version history**.
2. Name significant versions (e.g., "Pre-Launch Baseline", "End of Month November").
3. To rollback, select any snapshot and click **Restore this version**.

### Method B: Automated Nightly Backup via Google Apps Script
Add this script to the Sheet via **Extensions > Apps Script** to automatically snapshot the database every night at 06:00 AM into a private backup folder:

```javascript
function nightlySpreadsheetBackup() {
  const sourceSheet = SpreadsheetApp.getActiveSpreadsheet();
  const backupFolderId = "YOUR_GOOGLE_DRIVE_BACKUP_FOLDER_ID";
  const folder = DriveApp.getFolderById(backupFolderId);
  const dateStr = Utilities.formatDate(new Date(), "Asia/Phnom_Penh", "yyyy-MM-dd_HHmm");
  const copyName = "Backup_" + sourceSheet.getName() + "_" + dateStr;
  DriveApp.getFileById(sourceSheet.getId()).makeCopy(copyName, folder);
}
```
*Create a Time-driven trigger for this function to run daily between 5:00 AM and 6:00 AM.*

---

## 5. Deployment Verification Checklist

- [ ] `vercel.json` deployed with region `sin1` (Singapore, lowest latency to Cambodia).
- [ ] NextAuth secret is set and has high entropy.
- [ ] Google OAuth redirect URI matches the exact Vercel production domain.
- [ ] Service account has `Editor` permission on the Google Sheet.
- [ ] Health check endpoint `/api/health` returns HTTP 200 with `status: "healthy"`.
- [ ] Row 1 headers verified across all 10 sheet tabs.
