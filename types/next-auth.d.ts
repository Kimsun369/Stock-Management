import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: 'ADMIN' | 'STAFF'
      preferredLanguage: string
      numeralSystem: string
    } & DefaultSession['user']
  }

  interface User {
    id: string
    role: 'ADMIN' | 'STAFF'
    preferredLanguage: string
    numeralSystem: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: 'ADMIN' | 'STAFF'
    preferredLanguage?: string
    numeralSystem?: string
  }
}

