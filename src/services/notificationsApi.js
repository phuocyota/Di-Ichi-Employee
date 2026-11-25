import dayjs from 'dayjs'
import { api } from './api.js'

const unwrapData = (response) => response.data?.data ?? response.data

const typeLabels = {
  info: { category: 'Thông báo', tone: 'orange' },
  appointment: { category: 'Lịch hẹn', tone: 'orange' },
  candidate: { category: 'Ứng viên tiềm năng', tone: 'green' },
  schedule: { category: 'Lịch học', tone: 'amber' },
  system: { category: 'Hệ thống', tone: 'slate' },
}

const formatTime = (value) => {
  const time = dayjs(value)
  if (!time.isValid()) return ''
  if (time.isSame(dayjs(), 'day')) return time.format('HH:mm')
  if (time.isSame(dayjs().subtract(1, 'day'), 'day')) return 'Hôm qua'

  return time.format('DD/MM/YYYY')
}

const mapNotification = (item) => {
  const type = typeLabels[String(item.type || '').toLowerCase()]
  const content = item.content || ''

  return {
    id: item.id,
    title: item.title || '',
    summary: content.length > 120 ? `${content.slice(0, 117)}...` : content,
    content,
    time: formatTime(item.createdAt),
    category: type?.category || item.type || 'Thông báo',
    tone: type?.tone || 'orange',
    targetPath: item.targetPath || '',
    unread: !item.readAt,
  }
}

/** 100 thông báo gần nhất của tài khoản đang đăng nhập (backend lọc theo userId trong JWT). */
export const getMyNotifications = async (signal) => {
  const rows = unwrapData(await api.get('/workspace/notifications', { signal }))
  return Array.isArray(rows) ? rows.map(mapNotification) : []
}

export const markNotificationRead = (notificationId) =>
  api.patch(`/workspace/notifications/${encodeURIComponent(notificationId)}/read`)

export const markAllNotificationsRead = () => api.patch('/workspace/notifications/read-all')
