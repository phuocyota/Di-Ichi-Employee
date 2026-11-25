import { useCallback, useEffect, useMemo, useState } from 'react'
import { Filter, LayoutGrid, RefreshCw, Search, Table } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ClassCards } from '../../components/Classes/ClassCards.jsx'
import { ClassDetailModal } from '../../components/Classes/ClassDetailModal.jsx'
import { ClassesTable } from '../../components/Classes/ClassesTable.jsx'
import { Card } from '../../components/Common/Card.jsx'
import { getAcademicDirectory, getClassStudents } from '../../services/academicApi.js'
import { useResourceUpdates } from '../../services/realtime.js'
import { cn } from '../../utils/cn.js'

const allCoursesOption = 'Tất cả khóa học'

export const ClassesPage = () => {
  const { t } = useTranslation()
  const [viewMode, setViewMode] = useState('table')
  const [classNameKeyword, setClassNameKeyword] = useState('')
  const [courseFilter, setCourseFilter] = useState(allCoursesOption)
  const [selectedClass, setSelectedClass] = useState(null)
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedClassStudents, setSelectedClassStudents] = useState([])

  const loadClasses = useCallback(async (signal) => {
    setLoading(true)
    setLoadError('')
    try {
      const directory = await getAcademicDirectory(signal)
      setClasses(directory.classes)
    } catch (error) {
      if (signal?.aborted) return
      const message = error.response?.data?.message || t('Không tải được danh sách lớp học.')
      setLoadError(message)
      toast.error(message)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [t])

  useEffect(() => {
    const controller = new AbortController()
    loadClasses(controller.signal)
    return () => controller.abort()
  }, [loadClasses])

  // Tải lại ngầm khi lớp/sĩ số thay đổi; lỗi giữ nguyên dữ liệu đang hiển thị.
  useResourceUpdates(async () => {
    const directory = await getAcademicDirectory()
    setClasses(directory.classes)
  }, ['course', 'class', 'class-staff', 'staff', 'class-weekly-schedule', 'class-room', 'room', 'enrollment'], !loading)

  useEffect(() => {
    if (!selectedClass?.id) return undefined

    const controller = new AbortController()
    getClassStudents(selectedClass.id, controller.signal)
      .then(setSelectedClassStudents)
      .catch((error) => {
        if (controller.signal.aborted) return
        toast.error(error.response?.data?.message || t('Không tải được danh sách học viên của lớp.'))
      })
    return () => controller.abort()
  }, [selectedClass?.id, t])

  const handleViewClass = (classItem) => {
    setSelectedClassStudents([])
    setSelectedClass(classItem)
  }

  const courseOptions = useMemo(() => {
    const courseMap = new Map()
    classes.forEach((classItem) => {
      if (classItem.courseCode && classItem.course) {
        courseMap.set(classItem.courseCode, classItem.course)
      }
    })

    return [...courseMap.entries()].map(([code, name]) => ({ code, name }))
  }, [classes])
  const filteredClasses = useMemo(
    () =>
      classes.filter((classItem) => {
        const matchesName = String(classItem.name || '').toLowerCase().includes(classNameKeyword.trim().toLowerCase())
        const matchesCourse = courseFilter === allCoursesOption || classItem.courseCode === courseFilter

        return matchesName && matchesCourse
      }),
    [classNameKeyword, classes, courseFilter],
  )
  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-bold text-orange-600">{t('Lớp học')}</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950 md:text-3xl">{t('Danh sách và chi tiết lớp')}</h1>
          <p className="mt-2 text-sm text-slate-500">{t('Theo dõi danh sách học viên, giáo viên, lịch học và sĩ số.')}</p>
        </div>
        <div className="inline-flex h-11 w-fit overflow-hidden rounded-lg border border-orange-100 bg-white p-1 shadow-sm" aria-label={t('Kiểu hiển thị lớp học')}>
          <button
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-black transition',
              viewMode === 'table' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-600 hover:bg-orange-50 hover:text-orange-700',
            )}
            type="button"
            onClick={() => setViewMode('table')}
            aria-pressed={viewMode === 'table'}
            title={t('Hiển thị dạng bảng')}
          >
            <Table size={17} />
            Table
          </button>
          <button
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-black transition',
              viewMode === 'card' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-600 hover:bg-orange-50 hover:text-orange-700',
            )}
            type="button"
            onClick={() => setViewMode('card')}
            aria-pressed={viewMode === 'card'}
            title={t('Hiển thị dạng card')}
          >
            <LayoutGrid size={17} />
            Card
          </button>
        </div>
      </div>

      <Card className="rounded-lg">
        <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <label className="block">
            <span className="text-sm font-black text-slate-700">{t('Tìm kiếm tên lớp')}</span>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                className="h-11 w-full rounded-lg border border-orange-100 px-10 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                placeholder={t('Nhập tên lớp cần tìm')}
                value={classNameKeyword}
                onChange={(event) => setClassNameKeyword(event.target.value)}
              />
            </div>
          </label>
          <label className="block">
            <span className="text-sm font-black text-slate-700">{t('Khóa học')}</span>
            <div className="relative mt-2">
              <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select
                className="h-11 w-full rounded-lg border border-orange-100 px-10 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                value={courseFilter}
                onChange={(event) => setCourseFilter(event.target.value)}
              >
                <option value={allCoursesOption}>{t(allCoursesOption)}</option>
                {courseOptions.map((course) => <option key={course.code} value={course.code}>{course.name}</option>)}
              </select>
            </div>
          </label>
        </div>
      </Card>

      {loading ? (
        <Card className="rounded-lg text-center text-sm font-semibold text-slate-500">{t('Đang tải danh sách lớp học...')}</Card>
      ) : loadError ? (
        <Card className="flex flex-col items-center gap-3 rounded-lg text-center text-sm font-semibold text-rose-600">
          {loadError}
          <button className="inline-flex items-center gap-2 rounded-lg px-3 py-2 font-black text-orange-600 hover:bg-orange-50" type="button" onClick={() => loadClasses()}>
            <RefreshCw size={16} />
            {t('Thử lại')}
          </button>
        </Card>
      ) : viewMode === 'table'
        ? <ClassesTable classes={filteredClasses} onView={handleViewClass} />
        : <ClassCards classes={filteredClasses} onView={handleViewClass} />}
      {selectedClass && (
        <ClassDetailModal
          classItem={selectedClass}
          students={selectedClassStudents}
          onClose={() => setSelectedClass(null)}
        />
      )}
    </div>
  )
}
