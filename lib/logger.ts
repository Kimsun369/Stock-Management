/**
 * Production-ready server-side logger with automatic secret masking.
 * Ensures credentials, tokens, private keys, and passwords never appear in production logs.
 */

const SENSITIVE_PATTERNS = [
  /AIza[0-9A-Za-z-_]{35}/g, // Google API keys
  /ya29\.[0-9A-Za-z-_]+/g, // Google OAuth access tokens
  /1\/\/[0-9A-Za-z-_]+/g, // Google OAuth refresh tokens
  /-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/g, // PEM private keys
  /bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, // Bearer tokens
  /"password":\s*"[^"]*"/gi, // JSON password fields
  /password=[^&\s]+/gi, // Query/form password fields
  /"setupSecret":\s*"[^"]*"/gi, // Setup secrets
]

function maskSensitiveData(input: string): string {
  let output = input
  for (const pattern of SENSITIVE_PATTERNS) {
    output = output.replace(pattern, (match) => {
      if (match.length <= 8) return '****'
      return `${match.slice(0, 4)}****${match.slice(-4)}`
    })
  }
  return output
}

function sanitizeArg(arg: any): any {
  if (arg === null || arg === undefined) return arg
  if (typeof arg === 'string') return maskSensitiveData(arg)
  if (arg instanceof Error) {
    return {
      name: arg.name,
      message: maskSensitiveData(arg.message),
      stack: arg.stack ? maskSensitiveData(arg.stack) : undefined,
    }
  }
  if (typeof arg === 'object') {
    try {
      const serialized = JSON.stringify(arg)
      return JSON.parse(maskSensitiveData(serialized))
    } catch {
      return '[Unserializable Object]'
    }
  }
  return arg
}

export const logger = {
  info(message: string, ...args: any[]) {
    const timestamp = new Date().toISOString()
    const sanitizedArgs = args.map(sanitizeArg)
    console.log(`[INFO] [${timestamp}] ${maskSensitiveData(message)}`, ...sanitizedArgs)
  },

  warn(message: string, ...args: any[]) {
    const timestamp = new Date().toISOString()
    const sanitizedArgs = args.map(sanitizeArg)
    console.warn(`[WARN] [${timestamp}] ${maskSensitiveData(message)}`, ...sanitizedArgs)
  },

  error(message: string, ...args: any[]) {
    const timestamp = new Date().toISOString()
    const sanitizedArgs = args.map(sanitizeArg)
    console.error(`[ERROR] [${timestamp}] ${maskSensitiveData(message)}`, ...sanitizedArgs)
  },
}
