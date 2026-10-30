import { google, sheets_v4 } from 'googleapis'
import fs from 'fs'
import path from 'path'

// ─── Types ───────────────────────────────────────────────────────────────────

export type SheetRow = Record<string, string>

// ─── Sheet Names ─────────────────────────────────────────────────────────────

export const SHEETS = {
  Users: 'Users',
  Categories: 'Categories',
  Suppliers: 'Suppliers',
  Products: 'Products',
  StockTransactions: 'StockTransactions',
  CustomerRecords: 'CustomerRecords',
  CustomerItems: 'CustomerItems',
  CollectionTransactions: 'CollectionTransactions',
  AdjustmentRequests: 'AdjustmentRequests',
  PurchaseRecords: 'PurchaseRecords',
  AuditLogs: 'AuditLogs',
  AppSettings: 'AppSettings',
} as const

export type SheetName = (typeof SHEETS)[keyof typeof SHEETS]

// ─── Sheet Headers (defines column order) ────────────────────────────────────

export const SHEET_HEADERS: Record<SheetName, string[]> = {
  Users: ['id', 'name', 'email', 'password', 'role', 'preferredLanguage', 'numeralSystem', 'active', 'createdAt', 'updatedAt'],
  Categories: ['id', 'name', 'nameKm', 'description', 'active', 'createdAt', 'updatedAt', 'agreedPurchasePrice'],
  Suppliers: ['id', 'name', 'nameKm', 'contactPerson', 'phone', 'email', 'address', 'notes', 'active', 'createdAt', 'updatedAt'],
  Products: ['id', 'sku', 'name', 'nameKm', 'categoryId', 'brand', 'unit', 'purchaseCost', 'sellingPrice', 'physicalStock', 'reservedStock', 'minStock', 'defaultSupplierId', 'description', 'descriptionKm', 'active', 'createdAt', 'updatedAt', 'altUnit', 'conversionRate'],
  StockTransactions: ['id', 'productId', 'type', 'quantity', 'previousBalance', 'resultingBalance', 'unitCost', 'currency', 'reference', 'reason', 'notes', 'recordedByUserId', 'createdAt'],
  CustomerRecords: ['id', 'recordNumber', 'customerName', 'customerPhone', 'normalizedPhone', 'status', 'storageLocation', 'notes', 'recordedByUserId', 'createdAt', 'updatedAt'],
  CustomerItems: ['id', 'recordId', 'productId', 'productName', 'originalQuantity', 'collectedQuantity', 'remainingQuantity', 'unit', 'createdAt', 'updatedAt'],
  CollectionTransactions: ['id', 'recordId', 'itemId', 'productId', 'quantityCollected', 'staffUserId', 'notes', 'createdAt'],
  AdjustmentRequests: ['id', 'productId', 'currentQuantity', 'requestedChange', 'reason', 'notes', 'status', 'submittedByUserId', 'reviewedByUserId', 'reviewNotes', 'createdAt', 'reviewedAt'],
  PurchaseRecords: ['id', 'productId', 'supplierId', 'quantity', 'unitCost', 'totalAmount', 'currency', 'exchangeRate', 'invoiceNumber', 'purchaseDate', 'createdAt'],
  AuditLogs: ['id', 'actorId', 'actorName', 'action', 'entityType', 'entityId', 'details', 'createdAt'],
  AppSettings: ['key', 'value', 'updatedAt'],
}

// ─── Local Storage Fallback Helpers (for local dev when Google creds are pending) ────

const LOCAL_DATA_DIR = path.join(process.cwd(), '.data', 'sheets')

function ensureLocalDataDir() {
  if (!fs.existsSync(LOCAL_DATA_DIR)) {
    fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true })
  }
}

function getLocalFilePath(sheetName: SheetName) {
  ensureLocalDataDir()
  return path.join(LOCAL_DATA_DIR, `${sheetName}.json`)
}

function readLocalSheet(sheetName: SheetName): SheetRow[] {
  const filePath = getLocalFilePath(sheetName)
  if (!fs.existsSync(filePath)) {
    return []
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw) as SheetRow[]
  } catch {
    return []
  }
}

function writeLocalSheet(sheetName: SheetName, rows: SheetRow[]): void {
  const filePath = getLocalFilePath(sheetName)
  fs.writeFileSync(filePath, JSON.stringify(rows, null, 2), 'utf-8')
}

// ─── Check Configuration ─────────────────────────────────────────────────────

export function isGoogleSheetsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  )
}

// ─── Singleton Auth Client ────────────────────────────────────────────────────

let _sheetsClient: sheets_v4.Sheets | null = null

function getSheetsClient(): sheets_v4.Sheets {
  if (_sheetsClient) return _sheetsClient

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!email || !key) {
    throw new Error('Missing Google Service Account credentials.')
  }

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  _sheetsClient = google.sheets({ version: 'v4', auth })
  return _sheetsClient
}

function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID
  if (!id) throw new Error('Missing GOOGLE_SHEET_ID environment variable.')
  return id
}

// ─── Retry Helper ────────────────────────────────────────────────────────────

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 500): Promise<T> {
  let lastError: unknown
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (err: any) {
      lastError = err
      if (err?.response?.status === 429 || err?.code === 429) {
        const wait = delayMs * Math.pow(2, i) + Math.random() * 200
        await new Promise((r) => setTimeout(r, wait))
        continue
      }
      throw err
    }
  }
  throw lastError
}

// ─── Core Sheet Operations ────────────────────────────────────────────────────

// In-memory cache with 5-second TTL to avoid Google Sheets 429 quota exhaustion
const rowCache = new Map<string, { timestamp: number; data: SheetRow[] }>()
const CACHE_TTL_MS = 5000

export function invalidateCache(sheetName?: SheetName) {
  if (sheetName) {
    rowCache.delete(sheetName)
  } else {
    rowCache.clear()
  }
}

/**
 * Get all data rows from a sheet as an array of key-value objects.
 */
export async function getAllRows(sheetName: SheetName): Promise<SheetRow[]> {
  if (!isGoogleSheetsConfigured()) {
    return readLocalSheet(sheetName)
  }

  const cached = rowCache.get(sheetName)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data
  }

  return withRetry(async () => {
    const sheets = getSheetsClient()
    const spreadsheetId = getSpreadsheetId()

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:ZZ`,
    })

    const rows = response.data.values ?? []
    if (rows.length < 2) {
      rowCache.set(sheetName, { timestamp: Date.now(), data: [] })
      return []
    }

    const headers = (rows[0] as string[]).map((h) => h.trim())
    const expectedHeaders = SHEET_HEADERS[sheetName] || []
    const result = rows
      .slice(1)
      .filter((row) => (row as string[]).some(Boolean))
      .map((row) => {
        const obj: SheetRow = {}
        headers.forEach((header, i) => {
          obj[header] = (row as string[])[i] ?? ''
        })
        expectedHeaders.forEach((h) => {
          if (obj[h] === undefined) {
            obj[h] = ''
          }
        })
        return obj
      })

    rowCache.set(sheetName, { timestamp: Date.now(), data: result })
    return result
  })
}

/**
 * Append a new row to the sheet.
 */
export async function appendRow(sheetName: SheetName, values: string[]): Promise<void> {
  if (!isGoogleSheetsConfigured()) {
    const headers = SHEET_HEADERS[sheetName]
    const rowObj: SheetRow = {}
    headers.forEach((h, i) => {
      rowObj[h] = values[i] ?? ''
    })
    const existing = readLocalSheet(sheetName)
    existing.push(rowObj)
    writeLocalSheet(sheetName, existing)
    return
  }

  await withRetry(async () => {
    const sheets = getSheetsClient()
    const spreadsheetId = getSpreadsheetId()

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:A`,
      valueInputOption: 'RAW',
      requestBody: { values: [values] },
    })
  })
  invalidateCache(sheetName)
}

/**
 * Update a specific row by 1-based sheet row index (row 1 = header, row 2 = first data row).
 */
export async function updateRow(sheetName: SheetName, rowIndex: number, values: string[]): Promise<void> {
  if (!isGoogleSheetsConfigured()) {
    const dataIndex = rowIndex - 2
    const headers = SHEET_HEADERS[sheetName]
    const rowObj: SheetRow = {}
    headers.forEach((h, i) => {
      rowObj[h] = values[i] ?? ''
    })
    const existing = readLocalSheet(sheetName)
    if (dataIndex >= 0 && dataIndex < existing.length) {
      existing[dataIndex] = rowObj
      writeLocalSheet(sheetName, existing)
    }
    return
  }

  await withRetry(async () => {
    const sheets = getSheetsClient()
    const spreadsheetId = getSpreadsheetId()

    const range = `${sheetName}!A${rowIndex}:${columnLetter(values.length)}${rowIndex}`
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: { values: [values] },
    })
  })
  invalidateCache(sheetName)
}

/**
 * Find the 1-based row index of the first row where column=value.
 * Returns -1 if not found.
 */
export async function findRowIndex(
  sheetName: SheetName,
  colName: string,
  value: string
): Promise<number> {
  const rows = await getAllRows(sheetName)
  const headers = SHEET_HEADERS[sheetName]
  const colIdx = headers.indexOf(colName)
  if (colIdx === -1) return -1

  const matchingIdx = rows.findIndex((row) => row[colName] === value)
  if (matchingIdx === -1) return -1

  return matchingIdx + 2 // +1 for header row, +1 for 0-based to 1-based
}

/**
 * Update a specific field in a row by row ID.
 */
export async function updateRowById(
  sheetName: SheetName,
  id: string,
  updates: Partial<SheetRow>
): Promise<void> {
  const rows = await getAllRows(sheetName)
  const idx = rows.findIndex((r) => r.id === id)
  if (idx === -1) throw new Error(`Row with id ${id} not found in ${sheetName}`)

  const updatedRow: Record<string, string> = { ...rows[idx], ...updates, updatedAt: new Date().toISOString() }
  const headers = SHEET_HEADERS[sheetName]
  const values = headers.map((h) => updatedRow[h] ?? '')
  await updateRow(sheetName, idx + 2, values)
}

/**
 * Get a single row by ID.
 */
export async function getRowById(sheetName: SheetName, id: string): Promise<SheetRow | null> {
  const rows = await getAllRows(sheetName)
  return rows.find((r) => r.id === id) ?? null
}

// ─── Sheet Initialization ─────────────────────────────────────────────────────

/**
 * Creates all required sheet tabs with header rows if they don't already exist.
 */
export async function initializeSheets(): Promise<void> {
  if (!isGoogleSheetsConfigured()) {
    ensureLocalDataDir()
    for (const [name] of Object.entries(SHEET_HEADERS) as [SheetName, string[]][]) {
      const filePath = getLocalFilePath(name)
      if (!fs.existsSync(filePath)) {
        writeLocalSheet(name, [])
      }
    }
    return
  }

  const sheets = getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  const meta = await withRetry(() => sheets.spreadsheets.get({ spreadsheetId }))
  const existingSheetTitles = (meta.data.sheets ?? []).map((s) => s.properties?.title ?? '')
  const existingSheetsLower = new Map<string, string>()
  existingSheetTitles.forEach((title) => existingSheetsLower.set(title.toLowerCase(), title))

  const requests: sheets_v4.Schema$Request[] = []
  const sheetsToAdd: { name: SheetName; headers: string[] }[] = []

  for (const [name, headers] of Object.entries(SHEET_HEADERS) as [SheetName, string[]][]) {
    const existingTitle = existingSheetsLower.get(name.toLowerCase())
    if (!existingTitle) {
      requests.push({
        addSheet: { properties: { title: name } },
      })
      sheetsToAdd.push({ name, headers })
    } else if (existingTitle !== name) {
      // Rename existing sheet to match exact casing (e.g. 'categories' -> 'Categories')
      const sheetObj = meta.data.sheets?.find((s) => s.properties?.title === existingTitle)
      if (sheetObj?.properties?.sheetId !== undefined) {
        requests.push({
          updateSheetProperties: {
            properties: {
              sheetId: sheetObj.properties.sheetId,
              title: name,
            },
            fields: 'title',
          },
        })
      }
    }
  }

  if (requests.length > 0) {
    await withRetry(() =>
      sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests },
      })
    )

    for (const { name, headers } of sheetsToAdd) {
      await appendRow(name, headers)
    }
  }

  for (const [name, headers] of Object.entries(SHEET_HEADERS) as [SheetName, string[]][]) {
    const response = await withRetry(() =>
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${name}!1:1`,
      })
    )
    const existingHeaders = (response.data.values?.[0] as string[] | undefined)?.map((h) => h.trim())
    if (!existingHeaders || existingHeaders.length === 0) {
      await appendRow(name, headers)
    } else {
      const missingHeaders = headers.filter((h) => !existingHeaders.includes(h))
      if (missingHeaders.length > 0) {
        const newHeaderRow = [...existingHeaders, ...missingHeaders]
        const lastCol = columnLetter(newHeaderRow.length)
        await withRetry(() =>
          sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${name}!A1:${lastCol}1`,
            valueInputOption: 'RAW',
            requestBody: { values: [newHeaderRow] },
          })
        )
      }
    }
  }
}

// ─── App Settings Helpers ─────────────────────────────────────────────────────

export async function getSetting(key: string, defaultValue = ''): Promise<string> {
  const rows = await getAllRows(SHEETS.AppSettings)
  const row = rows.find((r) => r.key === key)
  return row?.value || defaultValue
}

export async function setSetting(key: string, value: string): Promise<void> {
  const rows = await getAllRows(SHEETS.AppSettings)
  const idx = rows.findIndex((r) => r.key === key)
  const now = new Date().toISOString()
  if (idx === -1) {
    await appendRow(SHEETS.AppSettings, [key, value, now])
  } else {
    const rowIndex = idx + 2
    await updateRow(SHEETS.AppSettings, rowIndex, [key, value, now])
  }
}

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await getAllRows(SHEETS.AppSettings)
  const settings: Record<string, string> = {
    defaultLanguage: 'km',
    defaultCurrency: 'USD',
    exchangeRateUsdKhr: '4100',
    numeralSystem: 'western',
    lowStockGlobalThreshold: '5',
  }
  for (const row of rows) {
    if (row.key) settings[row.key] = row.value
  }
  return settings
}

// ─── Audit Log Helper ─────────────────────────────────────────────────────────

export async function appendAuditLog(params: {
  actorId: string
  actorName: string
  action: string
  entityType: string
  entityId?: string
  details?: string
}): Promise<void> {
  const id = generateId()
  const now = new Date().toISOString()
  await appendRow(SHEETS.AuditLogs, [
    id,
    params.actorId,
    params.actorName,
    params.action,
    params.entityType,
    params.entityId ?? '',
    params.details ?? '',
    now,
  ])
}

// ─── ID Generation ───────────────────────────────────────────────────────────

export function generateId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 9)
  return `${timestamp}${random}`
}

export function generateReceiptNumber(): string {
  const year = new Date().getFullYear()
  const seq = Math.floor(1000 + Math.random() * 9000)
  return `CLR-${year}-${seq}`
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function columnLetter(n: number): string {
  let result = ''
  while (n > 0) {
    n--
    result = String.fromCharCode(65 + (n % 26)) + result
    n = Math.floor(n / 26)
  }
  return result
}

