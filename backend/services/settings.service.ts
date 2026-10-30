import { getSettings, setSetting, appendAuditLog } from '@/backend/sheets'

export async function getSystemSettings(): Promise<Record<string, string>> {
  return getSettings()
}

export async function updateSystemSettings(
  settings: Record<string, string>,
  userId: string,
  userName: string
): Promise<Record<string, string>> {
  for (const [key, val] of Object.entries(settings)) {
    await setSetting(key, String(val))
  }

  await appendAuditLog({
    actorId: userId,
    actorName: userName,
    action: 'SETTINGS_UPDATED',
    entityType: 'AppSetting',
    details: `Updated system settings: ${Object.keys(settings).join(', ')}`,
  })

  return getSettings()
}

