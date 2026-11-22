import { api } from './api.js'

const unwrap = (response) => response.data?.data ?? response.data

// Danh tính, cơ sở và giờ chấm công do backend xác định từ token; client không gửi body.
export const getMyTodayShifts = async (signal) => unwrap(await api.get('/work-shifts/me/today', { signal }))

export const checkInShift = async (assignmentId) =>
  unwrap(await api.post(`/work-shifts/me/assignments/${encodeURIComponent(assignmentId)}/check-in`))

export const checkOutShift = async (assignmentId) =>
  unwrap(await api.post(`/work-shifts/me/assignments/${encodeURIComponent(assignmentId)}/check-out`))
