import { useCallback, useEffect, useMemo, useState } from 'react'
import { Filter, LayoutGrid, RefreshCw, Search, Table } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Card } from '../../components/Common/Card.jsx'
import { CourseCards } from '../../components/Courses/CourseCards.jsx'
import { CourseDetailModal } from '../../components/Courses/CourseDetailModal.jsx'
import { CoursesTable } from '../../components/Courses/CoursesTable.jsx'
import { getAcademicDirectory } from '../../services/academicApi.js'
import { useResourceUpdates } from '../../services/realtime.js'
import { cn } from '../../utils/cn.js'

const allAgesOption = 'Tất cả độ tuổi'

export const CoursesPage = () => {
  const { t } = useTranslation()
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [courses, setCourses] = useState([])
  const [courseClasses, setCourseClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [viewMode, setViewMode] = useState('table')
  const [courseNameKeyword, setCourseNameKeyword] = useState('')
  const [ageFilter, setAgeFilter] = useState(allAgesOption)

  const loadCourses = useCallback(async (signal) => {
    setLoading(true)
    setLoadError('')
    try {
      const directory = await getAcademicDirectory(signal)
      setCourses(directory.courses)
      setCourseClasses(directory.classes)
    } catch (error) {
      if (signal?.aborted) return
      const message = error.response?.data?.message || t('Không tải được danh sách khóa học.')
      setLoadError(message)
      toast.error(message)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [t])

  useEffect(() => {
    const controller = new AbortController()
    loadCourses(controller.signal)
    return () => controller.abort()
  }, [loadCourses])

  // Tải lại ngầm khi khóa học/lớp thay đổi; lỗi giữ nguyên dữ liệu đang hiển thị.
  useResourceUpdates(async () => {
    const directory = await getAcademicDirectory()
    setCourses(directory.courses)
    setCourseClasses(directory.classes)
  }, ['course', 'class', 'class-staff', 'staff', 'class-weekly-schedule', 'class-room', 'room', 'enrollment'], !loading)

  const ageOptions = useMemo(() => [...new Set(courses.map((course) => course.age).filter(Boolean))], [courses])
  const filteredCourses = useMemo(
    () =>
      courses.filter((course) => {
        const matchesName = String(course.name || '').toLowerCase().includes(courseNameKeyword.trim().toLowerCase())
        const matchesAge = ageFilter === allAgesOption || course.age === ageFilter

        return matchesName && matchesAge
      }),
    [ageFilter, courseNameKeyword, courses],
  )
  const selectedClasses = useMemo(
    () => courseClasses.filter((classItem) => classItem.courseId === selectedCourse?.id),
    [courseClasses, selectedCourse],
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-bold text-orange-600">{t('Khóa học')}</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950 md:text-3xl">{t('Danh sách khóa học')}</h1>
          <p className="mt-2 text-sm text-slate-500">{t('Chi tiết khóa học, danh sách lớp và thông tin học phí.')}</p>
        </div>
        <div className="inline-flex h-11 w-fit overflow-hidden rounded-lg border border-orange-100 bg-white p-1 shadow-sm" aria-label={t('Kiểu hiển thị khóa học')}>
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
            <span className="text-sm font-black text-slate-700">{t('Tìm kiếm tên khóa học')}</span>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                className="h-11 w-full rounded-lg border border-orange-100 px-10 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                placeholder={t('Nhập tên khóa học cần tìm')}
                value={courseNameKeyword}
                onChange={(event) => setCourseNameKeyword(event.target.value)}
              />
            </div>
          </label>
          <label className="block">
            <span className="text-sm font-black text-slate-700">{t('Độ tuổi')}</span>
            <div className="relative mt-2">
              <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select
                className="h-11 w-full rounded-lg border border-orange-100 px-10 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                value={ageFilter}
                onChange={(event) => setAgeFilter(event.target.value)}
              >
                <option value={allAgesOption}>{t(allAgesOption)}</option>
                {ageOptions.map((age) => <option key={age} value={age}>{age}</option>)}
              </select>
            </div>
          </label>
        </div>
      </Card>

      {loading ? (
        <Card className="rounded-lg text-center text-sm font-semibold text-slate-500">{t('Đang tải danh sách khóa học...')}</Card>
      ) : loadError ? (
        <Card className="flex flex-col items-center gap-3 rounded-lg text-center text-sm font-semibold text-rose-600">
          {loadError}
          <button className="inline-flex items-center gap-2 rounded-lg px-3 py-2 font-black text-orange-600 hover:bg-orange-50" type="button" onClick={() => loadCourses()}>
            <RefreshCw size={16} />
            {t('Thử lại')}
          </button>
        </Card>
      ) : viewMode === 'table'
        ? <CoursesTable courses={filteredCourses} onView={setSelectedCourse} />
        : <CourseCards courses={filteredCourses} onView={setSelectedCourse} />}
      {selectedCourse && (
        <CourseDetailModal
          classes={selectedClasses}
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
        />
      )}
    </div>
  )
}
