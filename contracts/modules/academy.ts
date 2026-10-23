// Stable data contracts only; no runtime module implementation imports.
import type { JsonValue } from "./shared";

export const ZakatAcademyVideoProvider = {"AUDIO":"AUDIO","YOUTUBE":"YOUTUBE","VIMEO":"VIMEO","BUNNY":"BUNNY"} as const;

export type ZakatAcademyVideoProvider = typeof ZakatAcademyVideoProvider[keyof typeof ZakatAcademyVideoProvider];

export const AcademyQuestionType = {"SINGLE":"SINGLE","TRUE_FALSE":"TRUE_FALSE","MULTIPLE":"MULTIPLE"} as const;

export type AcademyQuestionType = typeof AcademyQuestionType[keyof typeof AcademyQuestionType];

export const AcademyQuizKind = {"DAILY":"DAILY","WEEKLY":"WEEKLY","FINAL":"FINAL"} as const;

export type AcademyQuizKind = typeof AcademyQuizKind[keyof typeof AcademyQuizKind];

export const ZakatAcademyGender = {"IKHWAN":"IKHWAN","AKHWAT":"AKHWAT"} as const;

export type ZakatAcademyGender = typeof ZakatAcademyGender[keyof typeof ZakatAcademyGender];

export interface ZakatAcademyProfile {
  id: string;
  userId: string;
  nis: string | null;
  phone: string | null;
  address: string | null;
  gender: ZakatAcademyGender | null;
  image: string | null;
  legacyCertificateUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  mustChangePassword: boolean;
  deletedAt: Date | null;
}

export interface ZakatAcademyCourse {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: string | null;
  thumbnailUrl: string | null;
  materialUrl: string | null;
  isPublished: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  teacher: string;
  quota: number;
  durationDays: number;
  startsAt: Date | null;
  isSimulation: boolean;
  registrationOpen: boolean;
}

export interface ZakatAcademyChapter {
  id: string;
  courseId: string;
  title: string;
  slug: string;
  description: string | null;
  order: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ZakatAcademyLesson {
  id: string;
  chapterId: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  contentSummary: string | null;
  thumbnailUrl: string | null;
  videoProvider: ZakatAcademyVideoProvider;
  videoUrl: string;
  order: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  releaseDay: number;
}

export interface ZakatAcademyLessonAttachment {
  id: string;
  lessonId: string;
  title: string;
  fileUrl: string;
  fileType: string | null;
  fileSize: number | null;
  createdAt: Date;
}

export interface ZakatAcademyEnrollment {
  id: string;
  profileId: string;
  courseId: string;
  createdAt: Date;
  groupJoinedAt: Date | null;
}

export interface ZakatAcademyLessonProgress {
  id: string;
  profileId: string;
  lessonId: string;
  completed: boolean;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  audioPosition: number;
  audioSource: string | null;
}

export interface ZakatAcademyQuiz {
  id: string;
  chapterId: string;
  title: string;
  description: string | null;
  passingScore: number;
  isPublished: boolean;
  isActive: boolean;
  quizDate: Date | null;
  timeLimitMinutes: number;
  allowRetake: boolean;
  createdAt: Date;
  updatedAt: Date;
  kind: AcademyQuizKind;
  closesAt: Date | null;
  releaseDay: number;
}

export interface ZakatAcademyQuizQuestion {
  id: string;
  quizId: string;
  question: string;
  order: number;
  createdAt: Date;
  type: AcademyQuestionType;
  weight: number;
  explanation: string | null;
}

export interface AcademyNotificationRead {
  id: string;
  profileId: string;
  key: string;
  readAt: Date;
}

export interface AcademyStudyNote {
  id: string;
  profileId: string;
  lessonId: string;
  content: string;
  updatedAt: Date;
}

export interface AcademyLiveSession {
  id: string;
  courseId: string;
  title: string;
  startsAt: Date;
  joinUrl: string;
}

export interface AcademyDiscussion {
  id: string;
  courseId: string;
  profileId: string;
  question: string;
  answer: string | null;
  createdAt: Date;
  answeredAt: Date | null;
}

export interface ZakatAcademyQuizOption {
  id: string;
  questionId: string;
  label: string;
  isCorrect: boolean;
}

export interface ZakatAcademyQuizAttempt {
  id: string;
  profileId: string;
  quizId: string;
  attemptNumber: number;
  score: number | null;
  passed: boolean | null;
  answers: JsonValue;
  startedAt: Date;
  submittedAt: Date | null;
  isCompleted: boolean;
  createdAt: Date;
}

export interface ZakatAcademyCompletionRecord {
  id: string;
  profileId: string;
  courseId: string;
  isEligible: boolean;
  completedAt: Date | null;
  certificateUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ZakatAcademySetting {
  id: string;
  key: string;
  value: string;
  updatedAt: Date;
}
