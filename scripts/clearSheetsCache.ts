import { invalidateCache, SHEETS } from '@/backend/sheets'

async function main() {
  // Invalidate cache for every sheet defined in the enum
  for (const name of Object.keys(SHEETS) as (keyof typeof SHEETS)[]) {
    invalidateCache(name)
  }
  console.log('✅ Sheet cache cleared')
}

main().catch((e) => {
  console.error('❌ Error clearing cache:', e)
  process.exit(1)
})
