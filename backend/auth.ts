import { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { getAllRows, appendRow, SHEETS, SHEET_HEADERS, generateId } from '@/backend/sheets'

const SUPER_ADMIN_EMAIL = 'povmesa97@gmail.com'

export const authOptions: AuthOptions = {
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
              params: {
                prompt: 'select_account',
                access_type: 'offline',
                response_type: 'code',
              },
            },
          }),
        ]
      : []),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('INVALID_INPUT')
        }

        const users = await getAllRows(SHEETS.Users)
        const user = users.find(
          (u) => u.email.toLowerCase().trim() === credentials.email.toLowerCase().trim()
        )

        if (!user || !user.password) {
          throw new Error('INVALID_CREDENTIALS')
        }

        if (user.active !== 'true') {
          throw new Error('ACCOUNT_INACTIVE')
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) {
          throw new Error('INVALID_CREDENTIALS')
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as 'ADMIN' | 'STAFF',
          preferredLanguage: user.preferredLanguage || 'km',
          numeralSystem: user.numeralSystem || 'western',
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        if (!user.email) return false
        const email = user.email.toLowerCase().trim()
        const users = await getAllRows(SHEETS.Users)
        const dbUser = users.find(
          (u) => u.email.toLowerCase().trim() === email
        )

        if (dbUser) {
          // Existing user - check if active
          if (dbUser.active !== 'true') return false
          // Attach DB fields to user object for JWT callback
          ;(user as any).id = dbUser.id
          ;(user as any).role = dbUser.role
          ;(user as any).preferredLanguage = dbUser.preferredLanguage || 'km'
          ;(user as any).numeralSystem = dbUser.numeralSystem || 'western'
          return true
        }

        // Auto-provision: only the super admin email gets auto-created
        if (email === SUPER_ADMIN_EMAIL) {
          const id = generateId()
          const now = new Date().toISOString()
          const headers = SHEET_HEADERS[SHEETS.Users]
          await appendRow(SHEETS.Users, [
            id,
            user.name || 'Mesa Pov',
            email,
            '', // no password needed for Google OAuth
            'ADMIN',
            'km',
            'western',
            'true',
            now,
            now,
          ])
          ;(user as any).id = id
          ;(user as any).role = 'ADMIN'
          ;(user as any).preferredLanguage = 'km'
          ;(user as any).numeralSystem = 'western'
          return true
        }

        // Unknown Google account - deny access
        return false
      }
      return true
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = (user as any).id || user.id
        token.role = (user as any).role
        token.preferredLanguage = (user as any).preferredLanguage
        token.numeralSystem = (user as any).numeralSystem
      }

      if (trigger === 'update' && session?.preferredLanguage) {
        token.preferredLanguage = session.preferredLanguage
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as 'ADMIN' | 'STAFF'
        session.user.preferredLanguage = (token.preferredLanguage as string) || 'km'
        session.user.numeralSystem = (token.numeralSystem as string) || 'western'
      }
      return session
    },
  },
  pages: {
    signIn: '/',
    error: '/',
  },
  secret: process.env.NEXTAUTH_SECRET || 'karaoke-stock-fallback-secret-2026',
}
