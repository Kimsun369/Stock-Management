# KaraokeStock — Dynamic Stock & Customer Leftover Management System

Production-ready, fully bilingual (**Khmer ភាសាខ្មែរ** and **English**) stock and customer leftover management web application for karaoke and lounge businesses in Cambodia.

Built for **$0 / month zero-cost deployment** on Vercel using **Google Sheets** as the real-time cloud database.

---

## 1. Clean Architecture (`frontend/` and `backend/`)

The project is structured with strict separation of concerns into dedicated `frontend/` and `backend/` directories:

```text
├── backend/                        # Backend architecture & services
│   ├── sheets.ts                   # Google Sheets real-time DB engine ($0 cost)
│   ├── types.ts                    # Core domain entities, enums, interfaces
│   ├── auth.ts                     # NextAuth configuration (Google OAuth & Credentials)
│   ├── phone.ts                    # Cambodian phone normalization & Khmer digits
│   └── services/
│       ├── inventory.service.ts    # Physical, reserved, available stock & ledger
│       ├── leftovers.service.ts    # Customer leftover items, receipts & collections
│       ├── products.service.ts     # Bilingual products CRUD & SKU verification
│       ├── categories.service.ts   # Category management with safety guards
│       ├── suppliers.service.ts    # Suppliers & vendor tracking
│       ├── adjustments.service.ts  # Discrepancy adjustment requests & admin approval
│       ├── dashboard.service.ts    # Real-time metrics calculation & Recharts data
│       ├── reports.service.ts      # Multi-table reports & CSV export with UTF-8 BOM
│       ├── staff.service.ts        # Admin staff management & role enforcement
│       └── settings.service.ts     # System settings (currency, language, numerals)
│
├── frontend/                       # Frontend architecture & components
│   ├── components/
│   │   ├── layout/                 # Sidebar (navy #172554), Topbar, Shell
│   │   ├── ui/                     # Button, Input, Select, Modal, Badge, StatCard
│   │   ├── dashboard/              # Operations dashboard & Recharts visualizations
│   │   ├── products/               # Product catalog, stock alerts, Add/Edit modal
│   │   ├── categories/             # Category management view
│   │   ├── inventory/              # Physical/Reserved/Available ledger, In, Out, Return
│   │   ├── leftovers/              # Customer registry, Khmer phone lookup, Collect modal
│   │   ├── suppliers/              # Vendor management view
│   │   ├── purchase-costs/         # Historical purchase invoices & weighted cost
│   │   ├── adjustments/            # Adjustment request form & Admin review dialogs
│   │   ├── reports/                # Tabular reports & CSV download
│   │   ├── staff/                  # Admin staff accounts management
│   │   ├── audit-logs/             # Immutable audit trail with translated actions
│   │   ├── settings/               # Currency (USD/KHR), exchange rate, numerals
│   │   └── customer-receipt.tsx    # Printable bilingual receipt (80mm POS & A4)
│
├── messages/                       # Complete bilingual translations (307 keys each)
│   ├── en.json                     # English interface strings
│   └── km.json                     # Natural, professional Khmer strings
│
├── app/                            # Next.js App Router routing layer
│   ├── api/                        # HTTP API route endpoints delegating to backend/
│   ├── dashboard/                  # Dashboard pages delegating to frontend/
│   ├── login/                      # Login page (Credentials + Google OAuth)
│   ├── layout.tsx                  # Root layout with Kantumruy Pro & Inter fonts
│   └── globals.css                 # Tailwind CSS & Khmer typography rules
│
└── scripts/                        # Automated tests & verification tools
    ├── check-i18n.js               # Translation key parity verification (en.json vs km.json)
    ├── test-phone.js               # Cambodian phone & Khmer digits normalization test
    └── test-backend.ts             # End-to-end backend integration & business rules test
```

---

## 2. Zero-Dollar ($0 / Month) Google Sheets Deployment

This application is engineered specifically to eliminate expensive database hosting fees:

1. **Free Database**: Uses Google Sheets API v4 with a Google Cloud Service Account. Google provides 300 requests/minute free forever.
2. **Free Hosting**: Deploys directly to Vercel's Free Hobby plan.
3. **Automatic Sheet Provisioning**: The backend automatically checks and creates all 12 sheet tabs with headers when initialized:
   - `Users`
   - `Categories`
   - `Suppliers`
   - `Products`
   - `StockTransactions`
   - `CustomerRecords`
   - `CustomerItems`
   - `CollectionTransactions`
   - `AdjustmentRequests`
   - `PurchaseRecords`
   - `AuditLogs`
   - `AppSettings`
4. **Local Fallback**: During local development or before Google credentials are added, the app automatically runs on local storage in `.data/` without crashing.

---

## 3. Environment Variables Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set the following variables:

```env
# NextAuth Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-32-character-random-secret"

# Google Sheets Database (Free $0 / month)
GOOGLE_SHEET_ID="your-google-sheet-id-from-url"
GOOGLE_SERVICE_ACCOUNT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Optional: Google OAuth for Staff Login
NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED="false"
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Initial Admin Bootstrap Seed Credentials
SETUP_SECRET="random-setup-secret-string"
INITIAL_ADMIN_EMAIL="admin@karaokestock.com"
INITIAL_ADMIN_PASSWORD="AdminPassword123!"
INITIAL_ADMIN_NAME="System Administrator (អ្នកគ្រប់គ្រង)"
```

### How to set up Google Service Account ($0 Free):
1. Go to [Google Cloud Console](https://console.cloud.google.com).
2. Create a free project (e.g. `Karaoke-Stock`).
3. Enable **Google Sheets API**.
4. Go to **APIs & Services > Credentials > Create Credentials > Service Account**.
5. Create a key (JSON format) and copy `client_email` and `private_key`.
6. Create a blank Google Sheet in Google Drive.
7. Click **Share** on the Google Sheet and add the Service Account email as **Editor**.
8. Copy the spreadsheet ID from the URL (`https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`).

---

## 4. Key Workflows & Business Rules

### 4.1 Stock Accounting Formula
$$\text{Available Stock} = \text{Physical On-Hand Stock} - \text{Reserved Customer-Held Stock}$$
- **Stock Out**: Enforces that available stock is sufficient before dispensing drinks or room items. Customer-owned held items are never sold or consumed by others.
- **Customer Leftovers**: When a guest leaves unfinished drinks, the quantity is reserved (`reservedStock += qty`), reducing available stock without altering physical inventory.
- **Customer Collection**: When the customer returns and retrieves their drinks, the reservation is released (`reservedStock -= qty`) and the customer record updates (`remainingQuantity -= qty`). It does NOT add back to business sellable stock because the items were already customer property.
- **Eligible Returns**: Unopened, sealed drinks returned from rooms are added back to available inventory with an immutable ledger entry.

### 4.2 Cambodian Phone & Khmer Digits
Accepts input in any of these formats and normalizes automatically:
- Local format: `012 345 678`
- International format: `+855 12 345 678`
- Khmer Unicode numerals: `០១២ ៣៤៥ ៦៧៨` or `+៨៥៥ ១២ ៣៤៥ ៦៧៨`

### 4.3 Printable Bilingual Receipt
Printable via desktop and 80mm POS receipt printers:
- Bilingual Khmer & English side-by-side
- Receipt number (e.g. `CLR-2026-1001`), date, customer name, phone, locker location
- List of items, quantities, and units
- Customer and staff signature lines
- 30-day storage policy terms

### 4.4 Excel-Compatible CSV Export
All CSV exports start with the **UTF-8 Byte Order Mark (`\uFEFF`)**, ensuring Khmer script renders perfectly without encoding artifacts when opened in Microsoft Excel.

---

## 5. Development & Testing Commands

```bash
# Run unit tests for phone normalization (Latin, Khmer digits, +855)
pnpm test-phone

# Run translation parity verification (checks en.json and km.json match 100%)
pnpm check-i18n

# Run end-to-end backend integration & stock calculation test
pnpm exec tsx scripts/test-backend.ts

# Start development server
pnpm dev
```

---

## 6. Initial Admin & Seed Login

Default seeded accounts:
- **Admin**: `admin@karaokestock.com` / `AdminPassword123!` (Full Admin access to all 15 modules)
- **Staff**: `staff@karaokestock.com` / `StaffPassword123!` (Operations access to Inventory, Stock In/Out, Leftovers, Returns)
# Stock-Management
