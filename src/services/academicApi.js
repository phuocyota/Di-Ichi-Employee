import { api } from './api.js'

// API CRUD trả { page, size, total, data } trong envelope { success, data }; size tối đa 100.
const PAGE_SIZE = 100
const MAX_PAGES = 20

const unwrapData = (response) => response.data?.data ?? response.data

const listAll = async (resource, params = {}, signal) => {
  const rows = []

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const result = unwrapData(await api.get(`/${resource}`, { params: { ...params, page, size: PAGE_SIZE }, signal })) || {}
    const pageRows = Array.isArray(result.data) ? result.data : []
    rows.push(...pageRows)
    if (!pageRows.length || rows.length >= (Number(result.total) || 0)) break
  }

  return rows
}

// Dữ liệu phụ (giáo viên, lịch, phòng, sĩ số) có thể bị chặn theo quyền: thiếu thì vẫn hiển thị lớp.
const settledRows = (result) => (result.status === 'fulfilled' ? result.value : [])

const formatTuition = (value) => {
  const amount = Number(value)
  if (value === null || value === undefined || value === '' || !Number.isFinite(amount)) return 'Đang cập nhật'

  return `${amount.toLocaleString('vi-VN')}đ`
}

const weekdayLabel = (weekday) => (Number(weekday) === 0 ? 'CN' : `T${Number(weekday) + 1}`)

const formatWeeklySchedule = (slots) =>
  slots
    .slice()
    .sort((left, right) => ((Number(left.weekday) + 6) % 7) - ((Number(right.weekday) + 6) % 7) || String(left.startTime).localeCompare(String(right.startTime)))
    .map((slot) => `${weekdayLabel(slot.weekday)} ${String(slot.startTime || '').slice(0, 5)}-${String(slot.endTime || '').slice(0, 5)}`)
    .join('; ')

const groupBy = (rows, key) =>
  rows.reduce((groups, row) => {
    const value = row[key]
    if (!groups.has(value)) groups.set(value, [])
    groups.get(value).push(row)
    return groups
  }, new Map())

export const classStatusLabels = {
  active: 'Đang học',
  upcoming: 'Sắp khai giảng',
  full: 'Đủ sĩ số',
  paused: 'Tạm dừng',
  finished: 'Đã kết thúc',
}

export const enrollmentStatusLabels = {
  active: 'Đang học',
  reserved: 'Bảo lưu',
  transferred: 'Chuyển lớp',
  dropped: 'Nghỉ học',
  completed: 'Hoàn thành',
}

const mapCourse = (course, classCount = 0) => ({
  id: course.id,
  code: course.code,
  name: course.name,
  age: course.ageRange || '',
  level: course.level || '',
  duration: course.duration || '',
  certificate: course.outputCertificate || '',
  orientation: course.orientation || '',
  tuition: formatTuition(course.defaultTuitionFee),
  status: course.status,
  classes: classCount,
})

/**
 * Tải khóa học và lớp học kèm giáo viên, lịch tuần, phòng và sĩ số hiện tại.
 * Mỗi lớp trả về theo shape UI: { id, name, courseId, courseCode, course, teacher, schedule, students, room, status }.
 */
export const getAcademicDirectory = async (signal) => {
  const [courses, classes] = await Promise.all([listAll('course', {}, signal), listAll('class', {}, signal)])
  const [classStaff, staff, weeklySchedules, classRooms, rooms, enrollments] = (
    await Promise.allSettled([
      listAll('class-staff', {}, signal),
      listAll('staff', {}, signal),
      listAll('class-weekly-schedule', {}, signal),
      listAll('class-room', {}, signal),
      listAll('room', {}, signal),
      listAll('enrollment', { isCurrent: true }, signal),
    ])
  ).map(settledRows)

  const courseById = new Map(courses.map((course) => [course.id, course]))
  const staffById = new Map(staff.map((item) => [item.id, item]))
  const roomById = new Map(rooms.map((item) => [item.id, item]))
  const staffByClass = groupBy(classStaff, 'classId')
  const slotsByClass = groupBy(weeklySchedules, 'classId')
  const roomsByClass = groupBy(classRooms, 'classId')
  const enrollmentsByClass = groupBy(enrollments, 'classId')

  const mappedClasses = classes
    .filter((classItem) => !classItem.deletedAt)
    .map((classItem) => {
      const course = courseById.get(classItem.courseId)
      const teachers = (staffByClass.get(classItem.id) || [])
        .filter((link) => String(link.role || '').toLowerCase() === 'teacher')
        .map((link) => staffById.get(link.staffId)?.name)
        .filter(Boolean)
      const roomNames = (roomsByClass.get(classItem.id) || []).map((link) => roomById.get(link.roomId)?.name).filter(Boolean)
      const currentSize = (enrollmentsByClass.get(classItem.id) || []).length

      return {
        id: classItem.id,
        code: classItem.code,
        name: classItem.name,
        courseId: classItem.courseId,
        courseCode: course?.code || '',
        course: course?.name || '',
        teacher: teachers.join(', ') || 'Chưa phân công',
        schedule: formatWeeklySchedule(slotsByClass.get(classItem.id) || []) || 'Chưa có lịch',
        students: `${currentSize}/${Number(classItem.maxSize) || 0}`,
        room: roomNames.join(', ') || 'Chưa xếp phòng',
        status: classStatusLabels[String(classItem.status || '').toLowerCase()] || classItem.status,
        startDate: classItem.startDate,
        endDate: classItem.endDate,
      }
    })

  const classCountByCourse = groupBy(mappedClasses, 'courseId')

  return {
    courses: courses.map((course) => mapCourse(course, (classCountByCourse.get(course.id) || []).length)),
    classes: mappedClasses,
  }
}

/** Danh sách học viên đang ghi danh hiện tại của một lớp. */
export const getClassStudents = async (classId, signal) => {
  const enrollments = await listAll('enrollment', { classId, isCurrent: true }, signal)
  const students = await Promise.allSettled(
    enrollments.map((enrollment) => api.get(`/student/${encodeURIComponent(enrollment.studentId)}`, { signal }).then(unwrapData)),
  )

  return enrollments.map((enrollment, index) => {
    const student = students[index].status === 'fulfilled' ? students[index].value : null

    return {
      id: enrollment.id,
      classId: enrollment.classId,
      studentId: enrollment.studentId,
      status: enrollmentStatusLabels[String(enrollment.status || '').toLowerCase()] || enrollment.status,
      student: student
        ? { id: student.id, name: student.name, phone: student.phone, level: student.className || student.code || '' }
        : null,
    }
  })
}
