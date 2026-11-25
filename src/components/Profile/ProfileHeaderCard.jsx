import { Building2, Mail, Phone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '../Common/Badge.jsx'
import { Card } from '../Common/Card.jsx'

const initialsOf = (name = '') =>
  name.trim().split(/\s+/).filter(Boolean).slice(-2).map((word) => word[0]).join('').toUpperCase() || '?'

export const ProfileHeaderCard = ({ profile }) => {
  const { t } = useTranslation()
  const name = profile.name || profile.email
  const title = [profile.positionName, profile.departmentName].filter(Boolean).join(' · ')
    || profile.userType?.replaceAll('_', ' ')
  const active = String(profile.status || '').toLowerCase() === 'active'

  return (
    <Card className="rounded-lg">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="grid h-24 w-24 shrink-0 place-items-center rounded-lg bg-orange-100 text-3xl font-black text-orange-700 ring-4 ring-orange-50" aria-hidden="true">
          {initialsOf(name)}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-orange-600">{t('Hồ sơ cá nhân')}</p>
            {profile.code && <Badge tone="slate">{profile.code}</Badge>}
            {profile.status && <Badge tone={active ? 'green' : 'rose'}>{active ? t('Đang làm việc') : t('Ngừng hoạt động')}</Badge>}
          </div>
          <h1 className="mt-1 text-3xl font-black text-slate-950">{name}</h1>
          {title && <p className="mt-1 text-sm font-semibold text-slate-600">{title}</p>}
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5"><Mail size={15} className="text-orange-500" /> {profile.email}</span>
            <span className="inline-flex items-center gap-1.5"><Phone size={15} className="text-orange-500" /> {profile.phone || t('Chưa có')}</span>
            <span className="inline-flex items-center gap-1.5"><Building2 size={15} className="text-orange-500" /> {profile.branchName || t('Chưa có')}</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
