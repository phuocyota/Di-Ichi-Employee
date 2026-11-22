import { Clock, LogIn, LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '../Common/Badge.jsx'
import { Button } from '../Common/Button.jsx'
import { Card } from '../Common/Card.jsx'

const formatTime = (value) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value))
    : '--:--'

const shiftStatus = (shift, t) => {
  const record = shift.attendance
  if (record?.checkOut) return { label: t('Đã check-out'), tone: 'green' }
  if (record?.checkIn) return { label: t('Đang trong ca'), tone: 'orange' }
  if (shift.canCheckIn) return { label: t('Có thể check-in'), tone: 'amber' }
  return { label: t('Chưa chấm công'), tone: 'slate' }
}

export const ShiftCheckCard = ({ shift, busy, onCheckIn, onCheckOut }) => {
  const { t } = useTranslation()
  const status = shiftStatus(shift, t)
  const managedByAdmin = shift.attendance && shift.attendance.source !== 'self'

  return (
    <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-black text-slate-950">{shift.shiftName || t('Ca làm')}</h2>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <Clock size={16} aria-hidden="true" />
          {shift.start} – {shift.end}
        </p>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <dt className="text-slate-500">{t('Check-in')}</dt>
          <dd className="font-semibold text-slate-900">{formatTime(shift.attendance?.checkIn)}</dd>
          <dt className="text-slate-500">{t('Check-out')}</dt>
          <dd className="font-semibold text-slate-900">{formatTime(shift.attendance?.checkOut)}</dd>
        </dl>
        {!shift.attendance && !shift.canCheckIn && (
          <p className="text-xs text-slate-500">
            {t('Mở check-in từ {{from}} đến {{to}}.', { from: formatTime(shift.checkInOpensAt), to: formatTime(shift.checkInClosesAt) })}
          </p>
        )}
        {managedByAdmin && <p className="text-xs text-slate-500">{t('Ca đã được quản trị viên chấm công.')}</p>}
      </div>
      <div className="flex gap-2">
        <Button disabled={busy || !shift.canCheckIn} onClick={() => onCheckIn(shift)}>
          <LogIn size={18} aria-hidden="true" />
          {t('Check-in')}
        </Button>
        <Button variant="secondary" disabled={busy || !shift.canCheckOut} onClick={() => onCheckOut(shift)}>
          <LogOut size={18} aria-hidden="true" />
          {t('Check-out')}
        </Button>
      </div>
    </Card>
  )
}
