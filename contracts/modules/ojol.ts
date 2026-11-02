// Stable data contracts only; no runtime module implementation imports.

export const OjolRole = {"guru":"guru","peserta":"peserta"} as const;

export type OjolRole = typeof OjolRole[keyof typeof OjolRole];

export const OjolGender = {"laki_laki":"laki_laki","perempuan":"perempuan"} as const;

export type OjolGender = typeof OjolGender[keyof typeof OjolGender];

export const OjolTaskType = {"voice_note":"voice_note","video":"video","quiz":"quiz"} as const;

export type OjolTaskType = typeof OjolTaskType[keyof typeof OjolTaskType];

export const OjolSubmissionStatus = {"pending":"pending","approved":"approved","rejected":"rejected"} as const;

export type OjolSubmissionStatus = typeof OjolSubmissionStatus[keyof typeof OjolSubmissionStatus];

export interface OjolMember {
  id: string;
  userId: string;
  code: string;
  role: OjolRole;
  phone: string | null;
  gender: OjolGender | null;
  photo: string | null;
  address: string | null;
  provinceId: string | null;
  provinceName: string | null;
  cityId: string | null;
  cityName: string | null;
  districtId: string | null;
  districtName: string | null;
  villageId: string | null;
  villageName: string | null;
  latitude: number | null;
  longitude: number | null;
  groupId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OjolGroup {
  id: string;
  code: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OjolTask {
  id: string;
  teacherId: string | null;
  title: string;
  description: string;
  type: OjolTaskType;
  deadline: Date;
  originalDeadline: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OjolTaskGroup {
  taskId: string;
  groupId: string;
}

export interface OjolQuizQuestion {
  id: string;
  taskId: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string | null;
  optionD: string | null;
  correctOption: string;
  order: number;
  createdAt: Date;
}

export interface OjolSubmission {
  id: string;
  taskId: string;
  studentId: string;
  filePath: string | null;
  fileMime: string | null;
  status: OjolSubmissionStatus;
  attemptsCount: number;
  score: number | null;
  isLate: boolean;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OjolSubmissionLog {
  id: string;
  submissionId: string;
  reviewerId: string | null;
  status: OjolSubmissionStatus;
  feedback: string | null;
  attemptNumber: number;
  createdAt: Date;
}

export interface OjolQuizAnswer {
  id: string;
  submissionId: string;
  questionId: string;
  selectedOption: string;
  isCorrect: boolean;
}

export interface OjolTaskApprover {
  taskId: string;
  teacherId: string;
}
