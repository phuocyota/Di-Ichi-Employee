import { useState } from 'react'
import dayjs from 'dayjs'
import { CalendarDays, KeyRound, UsersRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Badge } from '../Common/Badge.jsx'
import { Button } from '../Common/Button.jsx'
import { Card } from '../Common/Card.jsx'
import { translateStatic } from '../../i18n/translateStatic.js'
import { ChangePasswordModal } from './ChangePasswordModal.jsx'

const formatDate = (value) => (value && dayjs(value).isValid() ? dayjs(value).format('DD/MM/YYYY') : '')
const formatDateTime = (value) => (value && dayjs(value).isValid() ? dayjs(value).format('HH:mm DD/MM/YYYY') : '')

// Entity trả cột `room` dưới tên `roomName`; `room` có thể là quan hệ phòng học.
const roomOf = (appointment) => appointment.roomName || (typeof appointment.room === 'string' ? appointment.room : appointment.room?.name) || ''

const genderLabels = { male: 'Nam', female: 'Nữ', other: 'Khác' }

const EmptyRow = ({ children }) => (
  <p className="rounded-lg border border-orange-100 p-3 text-sm font-semibold text-slate-500">{children}</p>
)

const InfoRow = ({ label, value }) => {
  const { t } = useTranslation()

  return (
    <div className="flex items-start justify-between gap-3 border-b border-orange-50 py-2 text-sm last:border-0">
      <span className="font-semibold text-slate-500">{t(label)}</span>
      <span className="text-right font-bold text-slate-800">{value || t('Chưa có')}</span>
    </div>
  )
}

export const ProfileWorkPanel = ({ profile, appointments, candidates }) => {
  const { t } = useTranslation()
  const [changingPassword, setChangingPassword] = useState(false)

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Card className="rounded-lg lg:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-950">{t('Lịch hẹn sắp tới')}</h2>
          <Link className="text-sm font-bold text-orange-600 hover:text-orange-700" to="/lich-hen">{t('Xem tất cả')}</Link>
        </div>
        <div className="mt-4 space-y-3">
          {appointments === null && <EmptyRow>{t('Không tải được lịch hẹn.')}</EmptyRow>}
          {appointments?.length === 0 && <EmptyRow>{t('Chưa có lịch hẹn sắp tới.')}</EmptyRow>}
          {appointments?.map((appointment) => (
            <div key={appointment.id} className="flex items-start gap-3 rounded-lg border border-orange-100 p-3">
              <CalendarDays size={18} className="mt-0.5 shrink-0 text-orange-600" />
              <div className="min-w-0 flex-1">
                <p className="font-black text-slate-950">{appointment.customer}</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {formatDateTime(appointment.scheduledAt)} · {translateStatic(t, appointment.type)}{roomOf(appointment) ? ` · ${roomOf(appointment)}` : ''}
                </p>
              </div>
              {appointment.status && <Badge>{translateStatic(t, appointment.status)}</Badge>}
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-950">{t('Ứng viên mới phụ trách')}</h2>
          <Link className="text-sm font-bold text-orange-600 hover:text-orange-700" to="/ung-vien-tiem-nang">{t('Xem tất cả')}</Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {candidates === null && <EmptyRow>{t('Không tải được danh sách ứng viên.')}</EmptyRow>}
          {candidates?.length === 0 && <EmptyRow>{t('Chưa có ứng viên phụ trách.')}</EmptyRow>}
          {candidates?.map((candidate) => (
            <div key={candidate.id} className="flex items-start gap-3 rounded-lg border border-orange-100 p-3">
              <UsersRound size={18} className="mt-0.5 shrink-0 text-orange-600" />
              <div className="min-w-0">
                <p className="font-black text-slate-950">{candidate.name}</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {[candidate.code, candidate.phone, formatDate(candidate.createdAt)].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="rounded-lg">
        <h2 className="text-lg font-black text-slate-950">{t('Thông tin tài khoản')}</h2>
        <div className="mt-3">
          <InfoRow label="Mã nhân sự" value={profile.code} />
          <InfoRow label="Chức vụ" value={profile.positionName} />
          <InfoRow label="Bộ phận" value={profile.departmentName} />
          <InfoRow label="Chuyên môn" value={profile.specialtyName} />
          <InfoRow label="Giới tính" value={profile.gender ? translateStatic(t, genderLabels[String(profile.gender).toLowerCase()] || profile.gender) : ''} />
          <InfoRow label="Ngày sinh" value={formatDate(profile.birthDate)} />
          <InfoRow label="Ngày vào làm" value={formatDate(profile.startDate)} />
          <InfoRow label="Đăng nhập gần nhất" value={formatDateTime(profile.lastLoginAt)} />
        </div>
        <Button className="mt-4 w-full" variant="secondary" type="button" onClick={() => setChangingPassword(true)}><KeyRound size={18} /> {t('Đổi mật khẩu')}</Button>
      </Card>
      <ChangePasswordModal open={changingPassword} onClose={() => setChangingPassword(false)} />
    </div>
  )
}
