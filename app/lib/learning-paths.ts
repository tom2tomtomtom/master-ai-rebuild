export const LEARNING_PATHS = {
  business: {
    name: 'Business Functions',
    icon: 'briefcase',
    description: 'Sales, Marketing, Support, Finance',
    lessons: [
      'lesson-51', 'lesson-52', 'lesson-53', 'lesson-54', 'lesson-55',
      'lesson-56', 'lesson-57', 'lesson-58', 'lesson-59', 'lesson-60'
    ]
  },
  creative: {
    name: 'Creative & Design',
    icon: 'palette',
    description: 'Image, Video, Audio, Design',
    lessons: [
      'lesson-29', 'lesson-30', 'lesson-31', 'lesson-32', 'lesson-33',
      'lesson-34', 'lesson-35', 'lesson-36', 'lesson-37', 'lesson-38',
      'lesson-39', 'lesson-40'
    ]
  },
  technical: {
    name: 'Development & Technical',
    icon: 'code',
    description: 'Coding, APIs, DevOps',
    lessons: [
      'lesson-41', 'lesson-42', 'lesson-43', 'lesson-44', 'lesson-45',
      'lesson-46', 'lesson-47', 'lesson-48', 'lesson-49', 'lesson-50'
    ]
  },
  leadership: {
    name: 'Leadership & Strategy',
    icon: 'users',
    description: 'Teams, Governance, Strategy',
    lessons: [
      'lesson-61', 'lesson-62', 'lesson-63', 'lesson-64', 'lesson-65',
      'lesson-66', 'lesson-67', 'lesson-68', 'lesson-69', 'lesson-70',
      'lesson-71', 'lesson-72'
    ]
  },
  complete: {
    name: 'Complete Curriculum',
    icon: 'layers',
    description: 'All 73 lessons',
    lessons: Array.from({ length: 73 }, (_, i) =>
      `lesson-${i.toString().padStart(2, '0')}`
    )
  }
} as const

export type PathId = keyof typeof LEARNING_PATHS

export function getLessonsForPath(pathId: PathId): string[] {
  return [...LEARNING_PATHS[pathId].lessons]
}

export function getPathInfo(pathId: PathId) {
  return LEARNING_PATHS[pathId]
}
