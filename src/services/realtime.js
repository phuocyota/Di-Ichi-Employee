import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { api } from './api.js'
import { getAccessToken } from './authSession.js'
import { affectsResources, startUpdates } from './resourceUpdates.js'

export const RESOURCE_EVENT = 'diichi:resources-changed'

// Socket.IO chạy cùng origin với API; token lấy lại ở mỗi lần kết nối để dùng JWT mới nhất.
export function createRealtimeSocket(namespace) {
  const origin = new URL(api.defaults.baseURL, window.location.origin).origin
  return io(`${origin}/${namespace}`, {
    transports: ['websocket'],
    auth: (callback) => callback({ token: getAccessToken() }),
  })
}

export function startResourceUpdates() {
  return startUpdates({
    client: createRealtimeSocket('updates'),
    target: window,
    document,
    eventName: RESOURCE_EVENT,
  })
}

// Mở một kết nối /updates cho toàn bộ phiên đăng nhập (gọi ở MainLayout).
export function useUpdatesConnection() {
  useEffect(() => startResourceUpdates(), [])
}

// Gọi callback khi resource liên quan thay đổi; không chạy chồng và gộp các sự kiện đến trong lúc đang tải.
export function useResourceUpdates(callback, resources = [], enabled = true) {
  const current = useRef(callback)
  const allowed = useRef(resources)
  const canRun = useRef(enabled)
  const pending = useRef(false)
  const running = useRef(false)
  const mounted = useRef(false)
  const pendingChange = useRef(null)
  const drain = useRef(null)

  useEffect(() => {
    current.current = callback
    allowed.current = resources
    canRun.current = enabled
  })

  useEffect(() => {
    mounted.current = true
    const run = async () => {
      if (!mounted.current || !canRun.current || running.current || !pending.current) return
      running.current = true
      pending.current = false
      const change = pendingChange.current
      pendingChange.current = null
      try {
        await current.current(change)
      } catch {
        // Tải lại ngầm thất bại thì giữ dữ liệu đang hiển thị; lần thay đổi sau sẽ thử lại.
      } finally {
        running.current = false
        if (mounted.current && canRun.current && pending.current) void run()
      }
    }
    drain.current = run
    const changed = (event) => {
      if (!affectsResources(event.detail, allowed.current)) return
      pendingChange.current = {
        resync: Boolean(pendingChange.current?.resync || event.detail.resync),
        resources: [...new Set([...(pendingChange.current?.resources || []), ...(event.detail.resources || [])])],
      }
      pending.current = true
      void run()
    }
    window.addEventListener(RESOURCE_EVENT, changed)
    return () => {
      mounted.current = false
      pending.current = false
      pendingChange.current = null
      window.removeEventListener(RESOURCE_EVENT, changed)
    }
  }, [])

  useEffect(() => {
    if (enabled) void drain.current?.()
  }, [enabled])
}
