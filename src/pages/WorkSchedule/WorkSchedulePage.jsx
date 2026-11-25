import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Clock, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { Badge } from '../../components/Common/Badge.jsx'
import { Button } from '../../components/Common/Button.jsx'
import { Card } from '../../components/Common/Card.jsx'
import { getMySchedule } from '../../services/workShiftApi.js'
import { cn } from '../../utils/cn.js'

const DATE_FORMAT = 'YYYY-MM-DD'
const weekdayLabels = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']

// Tuần bắt đầu từ thứ 2.
const startOfWeek = (value) => {
  const date = dayjs(value)
  return date.subtract((date.day() + 6) % 7, 'day').startOf('day')
}

const formatClock = (value) => (value ? dayjs(value).format('HH:mm') : '')

const getErrorMessage = (error, t) => {
  if (error.response?.status === 401) return t('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
  const message = error.response?.data?.error?.message || error.response?.data?.message
  if (error.response?.status === 403 && (!message || message === 'Bạn không có quyền truy cập')) {
    return t('Tài khoản chưa được cấp quyền xem lịch làm việc. Vui lòng liên hệ quản trị viên.')
  }
  if (message) return Array.isArray(message) ? message.map((item) => t(item)).join(' ') : t(message)
  if (!error.response) return t('Không thể kết nối máy chủ. Vui lòng thử lại.')
  return t('Không tải được lịch làm việc.')
}

const attendanceStatus = (shift, today) => {
  const record = shift.attendance
  if (record?.checkIn && record?.checkOut) return { label: 'Đã check-out', tone: 'green' }
  if (record?.checkIn) return { label: 'Đã check-in', tone: 'amber' }
  if (shift.date < today) return { label: 'Không chấm công', tone: 'rose' }
  if (shift.date === today) return { label: 'Hôm nay', tone: 'orange' }
  return { label: 'Sắp tới', tone: 'slate' }
}

export const WorkSchedulePage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(dayjs()))
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const range = useMemo(
    () => ({ from: weekStart.format(DATE_FORMAT), to: weekStart.add(6, 'day').format(DATE_FORMAT) }),
    [weekStart],
  )

  const load = useCallback(
    async (signal) => {
      setLoading(true)
      setError('')
      try {
        setData(await getMySchedule(range, signal))
      } catch (cause) {
        if (signal?.aborted) return
        setData(null)
        setError(getErrorMessage(cause, t))
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [range, t],
  )

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  const today = data?.today || dayjs().format(DATE_FORMAT)
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = weekStart.add(index, 'day')
        const key = date.format(DATE_FORMAT)
        return {
          key,
          label: weekdayLabels[date.day()],
          display: date.format('DD/MM'),
          shifts: (data?.assignments || []).filter((shift) => shift.date === key),
        }
      }),
    [data, weekStart],
  )
  const totalShifts = data?.assignments?.length || 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold text-orange-600">Di-Ichi Employee Portal</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950 md:text-3xl">{t('Lịch làm việc')}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            {t('Tuần {{from}} - {{to}}: {{count}} ca làm.', {
              from: weekStart.format('DD/MM/YYYY'),
              to: weekStart.add(6, 'day').format('DD/MM/YYYY'),
              count: totalShifts,
            })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" disabled={loading} onClick={() => setWeekStart((current) => current.subtract(7, 'day'))} aria-label={t('Tuần trước')}>
            <ChevronLeft size={18} aria-hidden="true" />
          </Button>
          <Button variant="secondary" disabled={loading} onClick={() => setWeekStart(startOfWeek(dayjs()))}>
            {t('Tuần này')}
          </Button>
          <Button variant="secondary" disabled={loading} onClick={() => setWeekStart((current) => current.add(7, 'day'))} aria-label={t('Tuần sau')}>
            <ChevronRight size={18} aria-hidden="true" />
          </Button>
          <Button variant="secondary" disabled={loading} onClick={() => load()}>
            <RefreshCw size={18} aria-hidden="true" />
            {t('Tải lại')}
          </Button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {days.map((day) => (
          <Card key={day.key} className={cn('rounded-lg p-4', day.key === today && 'ring-2 ring-orange-300')}>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-black text-slate-950">{t(day.label)}</p>
              <p className="text-xs font-bold text-slate-400">{day.display}</p>
            </div>
            <div className="mt-3 space-y-2">
              {loading && !data ? (
                <p className="text-xs font-semibold text-slate-400">{t('Đang tải...')}</p>
              ) : day.shifts.length ? (
                day.shifts.map((shift) => {
                  const status = attendanceStatus(shift, today)
                  return (
                    <div key={shift.id} className="rounded-lg border border-orange-100 bg-orange-50/50 p-3">
                      <p className="text-sm font-black text-slate-900">{shift.shiftName || t('Ca làm')}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs font-bold text-slate-600">
                        <Clock size={13} aria-hidden="true" />
                        {shift.start} - {shift.end}
                      </p>
                      <div className="mt-2">
                        <Badge tone={status.tone}>{t(status.label)}</Badge>
                      </div>
                      {shift.attendance?.checkIn && (
                        <p className="mt-2 text-xs font-semibold text-slate-500">
                          {t('Vào {{checkIn}}', { checkIn: formatClock(shift.attendance.checkIn) })}
                          {shift.attendance.checkOut ? ` · ${t('Ra {{checkOut}}', { checkOut: formatClock(shift.attendance.checkOut) })}` : ''}
                        </p>
                      )}
                      {(shift.canCheckIn || shift.canCheckOut) && (
                        <button
                          className="mt-2 text-xs font-black text-orange-600 hover:text-orange-700"
                          type="button"
                          onClick={() => navigate('/cham-cong')}
                        >
                          {shift.canCheckIn ? t('Đi tới check-in') : t('Đi tới check-out')}
                        </button>
                      )}
                    </div>
                  )
                })
              ) : (
                <p className="text-xs font-semibold text-slate-400">{t('Không có ca')}</p>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
