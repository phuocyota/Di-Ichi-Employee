import { api } from './api.js'

const unwrap = (response) => response.data?.data ?? response.data

// Danh tính, cơ sở và giờ chấm công do backend xác định từ token; client chỉ gửi ảnh và lý do lệch giờ.
export const getMyTodayShifts = async (signal) => unwrap(await api.get('/work-shifts/me/today', { signal }))

// Check-in bắt buộc kèm ảnh chụp tại chỗ (multipart, trường `photo`); bỏ Content-Type JSON mặc định để trình duyệt tự đặt boundary.
// `reason`: lý do check-in muộn (bắt buộc khi muộn theo giờ máy chủ).
export const checkInShift = async (assignmentId, photo, reason) => {
  const body = new FormData()
  body.append('photo', photo, 'checkin.jpg')
  if (reason?.trim()) body.append('reason', reason.trim())
  return unwrap(
    await api.post(`/work-shifts/me/assignments/${encodeURIComponent(assignmentId)}/check-in`, body, {
      headers: { 'Content-Type': undefined },
      timeout: 30000,
    }),
  )
}

// Ảnh check-in của chính nhân viên (nhị phân, cần Bearer token nên không dùng trực tiếp làm <img src>).
export const getMyAttendancePhoto = async (fileId, signal) =>
  (await api.get(`/work-shifts/me/attendance-photos/${encodeURIComponent(fileId)}`, { responseType: 'blob', signal })).data

// Check-out cũng bắt buộc ảnh chụp tại chỗ (multipart, trường `photo`).
// `reason`: lý do check-out sớm (bắt buộc khi sớm theo giờ máy chủ).
export const checkOutShift = async (assignmentId, photo, reason) => {
  const body = new FormData()
  body.append('photo', photo, 'checkout.jpg')
  if (reason?.trim()) body.append('reason', reason.trim())
  return unwrap(
    await api.post(`/work-shifts/me/assignments/${encodeURIComponent(assignmentId)}/check-out`, body, {
      headers: { 'Content-Type': undefined },
      timeout: 30000,
    }),
  )
}

// Lịch làm của chính nhân viên trong khoảng ngày YYYY-MM-DD (tối đa 62 ngày, giờ Việt Nam).
export const getMySchedule = async ({ from, to }, signal) =>
  unwrap(await api.get('/work-shifts/me/schedule', { params: { from, to }, signal }))
