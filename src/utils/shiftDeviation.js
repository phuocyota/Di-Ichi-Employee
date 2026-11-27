// Cùng công thức với backend (work-shift-time.ts) và HRM: giờ Việt Nam +07:00, ca qua đêm kết thúc hôm sau.
const MINUTE_MS = 60000

/** Lý do check-in muộn / check-out sớm tối đa 500 ký tự (backend kiểm tra lại). */
export const ATTENDANCE_REASON_MAX = 500

const vnTimestamp = (date, time) => Date.parse(`${date}T${time}:00+07:00`)

export const shiftBounds = (shift) => {
  const start = vnTimestamp(shift.date, shift.start)
  let end = vnTimestamp(shift.date, shift.end)
  if (end <= start) end += 24 * 60 * MINUTE_MS
  return { start, end }
}

/** Muộn khi `floor((giờ check-in - giờ bắt đầu)/1 phút) >= 1`. */
export const isLateCheckIn = (shift, nowMs) => Math.floor((nowMs - shiftBounds(shift).start) / MINUTE_MS) >= 1

/** Sớm khi `ceil((giờ kết thúc - giờ check-out)/1 phút) >= 1`. */
export const isEarlyCheckOut = (shift, nowMs) => Math.ceil((shiftBounds(shift).end - nowMs) / MINUTE_MS) >= 1

/** Lý do gần nhất nhân viên đã gửi cho loại check (`check-in` | `check-out`) của ca. */
export const latestReason = (shift, type) =>
  [...(shift.checks || [])].reverse().find((check) => check.type === type && check.reason)?.reason || ''

/** Backend báo thiếu lý do (giờ máy lệch với máy chủ nên UI chưa hỏi lý do). */
export const isMissingReasonError = (error, type) => {
  const message = error?.response?.data?.message
  if (error?.response?.status !== 400 || typeof message !== 'string') return false
  return message.includes(type === 'check-in' ? 'lý do check-in muộn' : 'lý do check-out sớm')
}
