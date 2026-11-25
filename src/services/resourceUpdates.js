// Gom sự kiện /updates và tải bù sau khi kết nối lại; port từ Di_ichi_CRM/src/services/resourceUpdates.js.
export function startUpdates({ client, target, document, timers = globalThis, eventName, onStatus = () => {} }) {
  let active = true
  let watching = false
  let live = false
  let flushTimer
  let watchTimer
  let generation = 0
  const pending = new Set()
  // Báo 'live' khi backend LISTEN sẵn sàng; khác 'live' thì polling dự phòng 30 giây.
  const status = (value) => {
    if (active) onStatus(value)
  }
  const schedule = (resource) => {
    if (!active) return
    pending.add(resource)
    if (flushTimer !== undefined) return
    flushTimer = timers.setTimeout(() => {
      flushTimer = undefined
      if (!active) return
      const resources = [...pending]
      pending.clear()
      target.dispatchEvent(new CustomEvent(eventName, {
        detail: { resources, resync: resources.includes('*') },
      }))
    }, 200)
  }
  const watch = () => {
    if (!active || !client.connected) return
    timers.clearTimeout(watchTimer)
    const attempt = ++generation
    client.timeout(5000).emit('updates:watch', {}, (error, response) => {
      if (!active || !client.connected || attempt !== generation) return
      const result = response?.data ?? response
      watching = !error && result?.ok === true
      live = watching && result.ready === true
      status(live ? 'live' : 'fallback')
      if (watching) schedule('*')
      else watchTimer = timers.setTimeout(watch, 3000)
    })
  }
  const reset = () => {
    generation++
    watching = false
    live = false
    timers.clearTimeout(watchTimer)
  }
  client.on('connect', () => {
    reset()
    watch()
  })
  client.on('resources:changed', (event) => {
    if (watching && /^[a-z][a-z-]{0,63}$/.test(event?.resource || '')) schedule(event.resource)
  })
  client.on('updates:status', (event) => {
    live = watching && event?.ready === true
    status(live ? 'live' : 'fallback')
    if (live) schedule('*')
  })
  client.on('disconnect', () => {
    reset()
    status('fallback')
  })
  client.on('connect_error', () => {
    reset()
    status('fallback')
  })
  const onFocus = () => {
    if (document.hidden) return
    schedule('*')
    if (!client.connected) client.connect()
    else if (!watching) watch()
  }
  const fallback = timers.setInterval(() => {
    if (!document.hidden && !live) onFocus()
  }, 30000)
  target.addEventListener('focus', onFocus)
  document.addEventListener('visibilitychange', onFocus)
  if (client.connected) watch()
  return () => {
    active = false
    reset()
    timers.clearTimeout(flushTimer)
    timers.clearInterval(fallback)
    target.removeEventListener('focus', onFocus)
    document.removeEventListener('visibilitychange', onFocus)
    client.disconnect()
  }
}

// Tên resource là segment đầu của path mutation; API tổng hợp có thể đổi nhiều loại dữ liệu cùng lúc.
const dependencies = {
  workspace: ['schedule', 'attendance-record', 'notification'],
  portal: ['schedule', 'attendance-record', 'homework', 'homework-submission', 'score'],
  'system-settings': ['staff', 'user-account', 'role', 'user-role', 'role-permission', 'branch'],
}

export function affectsResources(change, allowed) {
  if (!change) return false
  if (change.resync || !allowed.length) return true
  return change.resources?.some((resource) =>
    allowed.includes(resource) || dependencies[resource]?.some((item) => allowed.includes(item)),
  ) === true
}
