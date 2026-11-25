import { api } from './api.js'

const unwrapData = (response) => response.data?.data ?? response.data

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

const mapCourse = (course) => ({
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
  classes: Number(course.classCount) || 0,
})

const mapClass = (classItem) => ({
  id: classItem.id,
  code: classItem.code,
  name: classItem.name,
  courseId: classItem.courseId,
  courseCode: classItem.courseCode || '',
  course: classItem.courseName || '',
  teacher: (classItem.teachers || []).join(', ') || 'Chưa phân công',
  schedule: formatWeeklySchedule(classItem.weeklySlots || []) || 'Chưa có lịch',
  students: `${Number(classItem.currentSize) || 0}/${Number(classItem.maxSize) || 0}`,
  room: (classItem.rooms || []).join(', ') || 'Chưa xếp phòng',
  status: classStatusLabels[String(classItem.status || '').toLowerCase()] || classItem.status,
  startDate: classItem.startDate,
  endDate: classItem.endDate,
})

/**
 * Khóa học và lớp học kèm giáo viên, lịch tuần, phòng và sĩ số hiện tại (GET /academic-directory, ghép ở backend).
 * Mỗi lớp trả về theo shape UI: { id, name, courseId, courseCode, course, teacher, schedule, students, room, status }.
 */
export const getAcademicDirectory = async (signal) => {
  const result = unwrapData(await api.get('/academic-directory', { signal })) || {}

  return {
    courses: (result.courses || []).map(mapCourse),
    classes: (result.classes || []).map(mapClass),
  }
}

/** Danh sách học viên đang ghi danh hiện tại của một lớp (GET /academic-directory/classes/:id/students). */
export const getClassStudents = async (classId, signal) => {
  const rows = unwrapData(await api.get(`/academic-directory/classes/${encodeURIComponent(classId)}/students`, { signal })) || []

  return rows.map((enrollment) => ({
    id: enrollment.id,
    classId: enrollment.classId,
    studentId: enrollment.studentId,
    status: enrollmentStatusLabels[String(enrollment.status || '').toLowerCase()] || enrollment.status,
    student: enrollment.student
      ? {
          id: enrollment.student.id,
          name: enrollment.student.name,
          phone: enrollment.student.phone,
          level: enrollment.student.className || enrollment.student.code || '',
        }
      : null,
  }))
}
