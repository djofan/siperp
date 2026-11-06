// Stable data contracts only; no runtime module implementation imports.

export const TanwirRole = {"guru":"guru","peserta":"peserta"} as const;

export type TanwirRole = typeof TanwirRole[keyof typeof TanwirRole];

export const TanwirGender = {"laki_laki":"laki_laki","perempuan":"perempuan"} as const;

export type TanwirGender = typeof TanwirGender[keyof typeof TanwirGender];

export const TanwirTaskType = {"voice_note":"voice_note","video":"video","quiz":"quiz"} as const;

export type TanwirTaskType = typeof TanwirTaskType[keyof typeof TanwirTaskType];

export const TanwirSubmissionStatus = {"pending":"pending","approved":"approved","rejected":"rejected"} as const;

export type TanwirSubmissionStatus = typeof TanwirSubmissionStatus[keyof typeof TanwirSubmissionStatus];

export interface TanwirMember {
  id: string;
  userId: string;
  code: string;
  role: TanwirRole;
  phone: string | null;
  gender: TanwirGender | null;
  photo: string | null;
  teachingPlace: string | null;
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

export interface TanwirGroup {
  id: string;
  code: string;
  name: string;
  description: string | null;
  picId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TanwirTask {
  id: string;
  teacherId: string | null;
  title: string;
  description: string;
  type: TanwirTaskType;
  deadline: Date;
  originalDeadline: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TanwirTaskGroup {
  taskId: string;
  groupId: string;
}

export interface TanwirQuizQuestion {
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

export interface TanwirSubmission {
  id: string;
  taskId: string;
  studentId: string;
  filePath: string | null;
  fileMime: string | null;
  status: TanwirSubmissionStatus;
  attemptsCount: number;
  score: number | null;
  isLate: boolean;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TanwirSubmissionLog {
  id: string;
  submissionId: string;
  reviewerId: string | null;
  status: TanwirSubmissionStatus;
  feedback: string | null;
  attemptNumber: number;
  createdAt: Date;
}

export interface TanwirQuizAnswer {
  id: string;
  submissionId: string;
  questionId: string;
  selectedOption: string;
  isCorrect: boolean;
}

export interface TanwirStudent {
  id: string;
  memberId: string;
  name: string;
  age: number | null;
  className: string | null;
  parentName: string | null;
  parentPhone: string | null;
  progress: string | null;
  createdAt: Date;
  updatedAt: Date;
}
