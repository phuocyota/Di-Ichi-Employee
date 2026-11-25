import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Filter, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { Badge } from '../../components/Common/Badge.jsx'
import { Button } from '../../components/Common/Button.jsx'
import { Card } from '../../components/Common/Card.jsx'
import { DataTable } from '../../components/Common/DataTable.jsx'
import { translateStatic } from '../../i18n/translateStatic.js'
import { getStudents, studentStatusLabels, studentStatusTones } from '../../services/studentsApi.js'

const PAGE_SIZE = 20

const getErrorMessage = (error, t) => {
  if (error.response?.status === 401) return t('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
  if (error.response?.status === 403) return t('Tài khoản chưa được cấp quyền xem học viên. Vui lòng liên hệ quản trị viên.')
  const message = error.response?.data?.error?.message || error.response?.data?.message
  if (message) return Array.isArray(message) ? message.join(' ') : message
  if (!error.response) return t('Không thể kết nối máy chủ. Vui lòng thử lại.')
  return t('Không tải được danh sách học viên.')
}

export const StudentsPage = () => {
  const { t } = useTranslation()
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState({ data: [], meta: { page: 1, size: PAGE_SIZE, total: 0 } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Chờ người dùng ngừng gõ rồi mới gọi API tìm kiếm.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(keyword.trim())
      setPage(1)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [keyword])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    getStudents({ page, size: PAGE_SIZE, search, status }, controller.signal)
      .then(setResult)
      .catch((cause) => {
        if (!controller.signal.aborted) setError(getErrorMessage(cause, t))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [page, search, status, t])

  const totalPages = Math.max(1, Math.ceil(result.meta.total / PAGE_SIZE))
  const columns = useMemo(
    () => [
      { header: 'Mã học viên', accessorKey: 'code' },
      { header: 'Họ tên', cell: ({ row }) => <span className="font-semibold text-slate-900">{row.original.name}</span> },
      { header: 'SĐT', cell: ({ row }) => row.original.phone || t('Chưa có') },
      { header: 'Trường / Lớp', cell: ({ row }) => [row.original.school, row.original.className].filter(Boolean).join(' · ') || t('Chưa có') },
      {
        header: 'Ngày nhập học',
        cell: ({ row }) => (row.original.enrollmentDate ? dayjs(row.original.enrollmentDate).format('DD/MM/YYYY') : t('Chưa có')),
      },
      {
        header: 'Trạng thái',
        cell: ({ row }) => (
          <Badge tone={studentStatusTones[row.original.status] || 'slate'}>
            {translateStatic(t, studentStatusLabels[row.original.status] || row.original.status)}
          </Badge>
        ),
      },
    ],
    [t],
  )

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-bold text-orange-600">{t('Học viên')}</p>
        <h1 className="mt-1 text-2xl font-black text-slate-950 md:text-3xl">{t('Danh sách học viên')}</h1>
        <p className="mt-2 text-sm text-slate-500">{t('Học viên của cơ sở: thông tin liên hệ, trường lớp và trạng thái học.')}</p>
      </div>

      <Card className="rounded-lg">
        <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <label className="block">
            <span className="text-sm font-black text-slate-700">{t('Tìm kiếm học viên')}</span>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                className="h-11 w-full rounded-lg border border-orange-100 px-10 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                placeholder={t('Mã, họ tên, SĐT, email hoặc trường')}
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
            </div>
          </label>
          <label className="block">
            <span className="text-sm font-black text-slate-700">{t('Trạng thái')}</span>
            <div className="relative mt-2">
              <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select
                className="h-11 w-full rounded-lg border border-orange-100 px-10 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value)
                  setPage(1)
                }}
              >
                <option value="">{t('Tất cả trạng thái')}</option>
                {Object.entries(studentStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{translateStatic(t, label)}</option>
                ))}
              </select>
            </div>
          </label>
        </div>
      </Card>

      {error ? (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      ) : loading && !result.data.length ? (
        <Card className="rounded-lg text-center text-sm font-semibold text-slate-500">{t('Đang tải danh sách học viên...')}</Card>
      ) : result.data.length ? (
        <DataTable columns={columns} data={result.data} />
      ) : (
        <Card className="rounded-lg text-center text-sm font-semibold text-slate-500">{t('Không tìm thấy học viên phù hợp.')}</Card>
      )}

      <div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-500">
        <span>{t('Tổng {{total}} học viên', { total: result.meta.total })}</span>
        <div className="flex items-center gap-2">
          <Button variant="secondary" disabled={loading || page <= 1} onClick={() => setPage((current) => current - 1)} aria-label={t('Trang trước')}>
            <ChevronLeft size={18} aria-hidden="true" />
          </Button>
          <span>{t('Trang {{page}}/{{total}}', { page, total: totalPages })}</span>
          <Button variant="secondary" disabled={loading || page >= totalPages} onClick={() => setPage((current) => current + 1)} aria-label={t('Trang sau')}>
            <ChevronRight size={18} aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  )
}
