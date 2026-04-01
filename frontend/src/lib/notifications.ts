export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return await Notification.requestPermission()
}

export async function notify(title: string, options?: NotificationOptions) {
  const permission = await ensureNotificationPermission()
  if (permission !== 'granted') return

  const reg = await navigator.serviceWorker.getRegistration()
  if (reg && 'showNotification' in reg) {
    await reg.showNotification(title, options)
    return
  }

  // Fallback (when SW isn't ready)
  new Notification(title, options)
}

