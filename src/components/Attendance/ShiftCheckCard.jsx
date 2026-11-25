import { useEffect, useState } from 'react'
import { Clock, LogIn, LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getMyAttendancePhoto } from '../../services/workShiftApi.js'
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

// Ảnh check-in cần Bearer token: tải blob rồi hiển thị qua object URL, thu hồi khi unmount (đổi ảnh thì remount theo key).
const CheckInPhoto = ({ fileId }) => {
  const { t } = useTranslation()
  const [url, setUrl] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    let objectUrl = ''
    getMyAttendancePhoto(fileId, controller.signal)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true)
      })
    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [fileId])

  if (failed) return <p className="text-xs text-slate-500">{t('Không tải được ảnh check-in.')}</p>
  if (!url) return <div className="h-20 w-16 animate-pulse rounded-lg bg-orange-50" aria-hidden="true" />
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block w-fit" title={t('Xem ảnh check-in')}>
      <img className="h-20 w-16 rounded-lg border border-orange-100 object-cover" src={url} alt={t('Ảnh check-in')} />
    </a>
  )
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
        {shift.attendance?.checkInPhotoId && <CheckInPhoto key={shift.attendance.checkInPhotoId} fileId={shift.attendance.checkInPhotoId} />}
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
