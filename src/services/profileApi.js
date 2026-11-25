import { api } from './api.js'
import { getAppointments } from './appointmentsApi.js'
import { getPotentialCandidates } from './potentialCandidatesApi.js'
import { getMyTodayShifts } from './workShiftApi.js'

const unwrapData = (response) => response.data?.data ?? response.data

const getBangkokDate = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Bangkok',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date())

/** Hồ sơ nhân viên đang đăng nhập (GET /auth/staff/me). */
export const getMyStaffProfile = async (signal) => unwrapData(await api.get('/auth/staff/me', { signal }))

const getCandidateSummary = async (signal) => unwrapData(await api.get('/potential-candidates/summary', { signal }))

// Phần nào bị chặn theo quyền hoặc lỗi thì trả null để trang vẫn hiển thị hồ sơ.
const settled = (result) => (result.status === 'fulfilled' ? result.value : null)

/**
 * Dữ liệu trang Hồ sơ: hồ sơ là bắt buộc; số liệu ứng viên, lịch hẹn sắp tới,
 * ứng viên mới và ca hôm nay là phụ (backend tự lọc theo Sale phụ trách).
 */
export const getProfileOverview = async (signal) => {
  const [profile, ...rest] = await Promise.allSettled([
    getMyStaffProfile(signal),
    getCandidateSummary(signal),
    getAppointments({ dateFrom: getBangkokDate(), page: 1, size: 5, sortBy: 'scheduledAt', sortOrder: 'asc' }, signal),
    getPotentialCandidates({ page: 1, pageSize: 5, sortBy: 'createdAt', sortOrder: 'desc' }, signal),
    getMyTodayShifts(signal),
  ])
  if (profile.status === 'rejected') throw profile.reason
  const [summary, appointments, candidates, shifts] = rest.map(settled)

  return {
    profile: profile.value,
    summary,
    appointments,
    candidates,
    todayShifts: shifts ? shifts.assignments || [] : null,
  }
}
