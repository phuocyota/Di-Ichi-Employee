import {
  BookOpen,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  Contact,
  Fingerprint,
  GraduationCap,
  LayoutDashboard,
  ScrollText,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { menuItemData } from '../../datas/appStaticData.js'

const menuIcons = {
  BookOpen,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  Contact,
  Fingerprint,
  GraduationCap,
  LayoutDashboard,
  ScrollText,
  UserRound,
  UsersRound,
}

export const menuItems = menuItemData.map((item) => ({
  ...item,
  icon: menuIcons[item.icon],
}))
