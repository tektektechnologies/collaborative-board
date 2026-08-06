const CLIENT_ID_STORAGE_KEY = 'collaborative-board:clientId'
const DISPLAY_NAME_STORAGE_KEY = 'collaborative-board:displayName'

/** Stable per-tab id (survives refresh via sessionStorage). */
export function getOrCreateClientId(): string {
  const existing = sessionStorage.getItem(CLIENT_ID_STORAGE_KEY)
  if (existing) return existing

  const clientId = crypto.randomUUID()
  sessionStorage.setItem(CLIENT_ID_STORAGE_KEY, clientId)
  return clientId
}

/** Friendly label derived once per tab, e.g. "Guest a3f2". */
export function getOrCreateDisplayName(clientId: string): string {
  const existing = sessionStorage.getItem(DISPLAY_NAME_STORAGE_KEY)
  if (existing) return existing

  const displayName = `Guest ${clientId.slice(0, 4)}`
  sessionStorage.setItem(DISPLAY_NAME_STORAGE_KEY, displayName)
  return displayName
}
