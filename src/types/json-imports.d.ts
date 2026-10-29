declare module "@/components/mock/user.json" {
  interface UserData {
    id: string
    name: string
    email: string
    avatar: string
    role: string
    bio: string
    github: string
    joinedAt: string
    settings: {
      notifications: {
        email: boolean
        push: boolean
        taskReminders: boolean
        projectUpdates: boolean
        mentorMessages: boolean
      }
      theme: string
      plan: string
    }
    stats: {
      projectsCompleted: number
      tasksCompleted: number
      hoursLogged: number
      certificatesEarned: number
    }
  }
  const userData: UserData
  export default userData
}

declare module "@/components/mock/projects.json" {
  interface ProjectData {
    id: string
    title: string
    description: string
    status: string
    deadline: string
    progress: number
    team: Array<{
      id: string
      name: string
      avatar: string
    }>
    tags: string[]
    created_at: string
    updated_at: string
    sprints: Array<{
      id: string
      name: string
      startDate: string
      endDate: string
      status: string
      progress: number
    }>
    timeline: Array<{
      id: string
      title: string
      description: string
      date: string
      type: string
    }>
    repository: {
      url: string
      branch: string
      commits: number
    }
    technologies: string[]
    category: string
    difficulty: string
  }
  const projectsData: ProjectData[]
  export default projectsData
}

declare module "@/components/mock/tasks.json" {
  interface TaskData {
    id: string
    title: string
    description: string
    priority: "high" | "medium" | "low"
    assignee: {
      id: string
      name: string
      avatar: string
    }
    due_date: string
    tags: string[]
    created_at: string
    completed_at?: string
  }
  
  interface TaskColumn {
    id: string
    title: string
    color: string
    task_ids: string[]
  }
  
  interface ProjectTasks {
    columns: TaskColumn[]
    tasks: TaskData[]
  }
  
  const tasksData: Record<string, ProjectTasks>
  export default tasksData
}

declare module "@/components/mock/learning-paths.json" {
  interface LearningSection {
    id: string
    title: string
    content: string
    completed: boolean
    estimatedTime: number
    notes: string
  }
  
  interface LearningChapter {
    id: string
    title: string
    description: string
    sections: LearningSection[]
    completed: boolean
  }
  
  interface LearningPathData {
    id: string
    title: string
    description: string
    difficulty: "beginner" | "intermediate" | "advanced"
    estimated_hours: number
    tags: string[]
    chapters: LearningChapter[]
    progress: number
    enrolledAt: string
    completed_at?: string
  }
  
  const learningPathsData: LearningPathData[]
  export default learningPathsData
}

declare module "@/components/mock/certificates.json" {
  interface CertificateData {
    id: string
    title: string
    description: string
    issuer: string
    issuedAt: string
    expiresAt?: string
    credentialId: string
    verificationUrl: string
    skills: string[]
    pathId?: string
    status: "earned" | "in-progress" | "expired"
  }
  
  const certificatesData: CertificateData[]
  export default certificatesData
}

declare module "@/components/mock/quizzes.json" {
  interface QuizQuestion {
    id: string
    question: string
    options: string[]
    correct: number
  }
  
  interface ChapterQuizData {
    chapterId: string
    questions: QuizQuestion[]
    score?: number
  }
  
  const quizzesData: ChapterQuizData[]
  export default quizzesData
}