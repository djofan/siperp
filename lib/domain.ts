// Frontend data contracts. Database access and credentials are owned by Laravel.

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export const ZakatAcademyVideoProvider = {"AUDIO":"AUDIO","YOUTUBE":"YOUTUBE","VIMEO":"VIMEO","BUNNY":"BUNNY"} as const;

export type ZakatAcademyVideoProvider = typeof ZakatAcademyVideoProvider[keyof typeof ZakatAcademyVideoProvider];

export const AcademyQuestionType = {"SINGLE":"SINGLE","TRUE_FALSE":"TRUE_FALSE","MULTIPLE":"MULTIPLE"} as const;

export type AcademyQuestionType = typeof AcademyQuestionType[keyof typeof AcademyQuestionType];

export const AcademyQuizKind = {"DAILY":"DAILY","WEEKLY":"WEEKLY","FINAL":"FINAL"} as const;

export type AcademyQuizKind = typeof AcademyQuizKind[keyof typeof AcademyQuizKind];

export const ZakatAcademyGender = {"IKHWAN":"IKHWAN","AKHWAT":"AKHWAT"} as const;

export type ZakatAcademyGender = typeof ZakatAcademyGender[keyof typeof ZakatAcademyGender];

export const OjolRole = {"guru":"guru","peserta":"peserta"} as const;

export type OjolRole = typeof OjolRole[keyof typeof OjolRole];

export const OjolGender = {"laki_laki":"laki_laki","perempuan":"perempuan"} as const;

export type OjolGender = typeof OjolGender[keyof typeof OjolGender];

export const OjolTaskType = {"voice_note":"voice_note","video":"video","quiz":"quiz"} as const;

export type OjolTaskType = typeof OjolTaskType[keyof typeof OjolTaskType];

export const OjolSubmissionStatus = {"pending":"pending","approved":"approved","rejected":"rejected"} as const;

export type OjolSubmissionStatus = typeof OjolSubmissionStatus[keyof typeof OjolSubmissionStatus];

export const TanwirRole = {"guru":"guru","peserta":"peserta"} as const;

export type TanwirRole = typeof TanwirRole[keyof typeof TanwirRole];

export const TanwirGender = {"laki_laki":"laki_laki","perempuan":"perempuan"} as const;

export type TanwirGender = typeof TanwirGender[keyof typeof TanwirGender];

export const TanwirTaskType = {"voice_note":"voice_note","video":"video","quiz":"quiz"} as const;

export type TanwirTaskType = typeof TanwirTaskType[keyof typeof TanwirTaskType];

export const TanwirSubmissionStatus = {"pending":"pending","approved":"approved","rejected":"rejected"} as const;

export type TanwirSubmissionStatus = typeof TanwirSubmissionStatus[keyof typeof TanwirSubmissionStatus];

export interface User {
  id: string;
  name: string;
  email: string;
  isSuperadmin: boolean;
  isActive: boolean;
  createdAt: Date;
}

export interface AccessLog {
  id: string;
  message: string;
  createdAt: Date;
}

export interface Module {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface ModuleAccess {
  id: string;
  userId: string;
  moduleId: string;
  role: string;
  createdAt: Date;
}

export interface ParticipantSequence {
  moduleSlug: string;
  lastNumber: number;
}

export interface CoreContact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CoreContactSource {
  id: string;
  contactId: string;
  source: string;
  sourceId: string;
  role: string;
  name: string;
  phone: string | null;
  email: string | null;
  syncedAt: Date;
}

export interface CoreExpense {
  id: string;
  accountId: string;
  moduleSource: string;
  fundType: string;
  amount: number;
  description: string;
  reference: string;
  spentAt: Date;
  createdBy: string;
  createdAt: Date;
}

export interface CoreBankLine {
  id: string;
  accountId: string;
  bookedAt: Date;
  reference: string;
  description: string;
  direction: string;
  amount: number;
  fingerprint: string;
  paymentId: string | null;
  expenseId: string | null;
  matchNote: string | null;
  matchedBy: string | null;
  matchedAt: Date | null;
  createdAt: Date;
}

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

export interface LazsipSiteContent {
  id: string;
  sectionKey: string;
  contentJson: string;
}

export interface LazsipNews {
  id: string;
  title: string;
  content: string;
  image: string | null;
  isPinned: boolean;
  status: string;
  createdAt: Date;
}

export interface LazsipPartner {
  id: string;
  name: string;
  logo: string | null;
  url: string | null;
}

export interface LazsipProgram {
  id: string;
  title: string;
  description: string;
  requirements: string | null;
  image: string | null;
  category: string;
  type: string;
  formUrl: string | null;
  isPinned: boolean;
  registrationOpen: boolean;
  createdAt: Date;
}

export interface LazsipProgramApplicant {
  id: string;
  programId: string;
  name: string;
  contact: string;
  status: string;
  createdAt: Date;
}

export interface LazsipActivity {
  id: string;
  title: string;
  description: string;
  image: string | null;
  date: Date;
  isPinned: boolean;
  createdAt: Date;
}

export interface LazsipCampaign {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  image: string | null;
  uniqueCode: string;
  isPinned: boolean;
  status: string;
  createdAt: Date;
}

export interface LazsipCampaignAdjustment {
  id: string;
  campaignId: string;
  amount: number;
  note: string;
  createdAt: Date;
}

export interface LazsipDonation {
  id: string;
  campaignId: string;
  donorId: string;
  amount: number;
  adminFee: number;
  coversFee: boolean;
  isAnonymous: boolean;
  paymentMethod: string;
  status: string;
  createdAt: Date;
}

export interface LazsipZakatPayment {
  id: string;
  donorId: string;
  zakatType: string;
  amount: number;
  adminFee: number;
  coversFee: boolean;
  isAnonymous: boolean;
  goldPriceSnapshot: number | null;
  jiwaCount: number | null;
  paymentMethod: string;
  status: string;
  createdAt: Date;
}

export interface LazsipZakatDetail {
  id: string;
  zakatType: string;
  goldPriceSnapshot: number | null;
  jiwaCount: number | null;
  createdAt: Date;
}

export interface LazsipPaymentFeeRef {
  id: string;
  method: string;
  feeAmount: number | null;
  feePercentage: number | null;
}

export interface LazsipBeneficiary {
  id: string;
  name: string;
  address: string;
  problemFaced: string;
  birthDate: Date;
  age: number;
  gender: string;
  referralSource: string;
  photo: string | null;
  needs: string;
  aidType: string;
  amountReceived: number;
  verifierName: string;
  verifierArea: string;
  maritalStatus: string;
  nik: string | null;
  occupation: string | null;
  monthlyIncome: number | null;
  dependentsCount: number | null;
  dependentsDetail: string | null;
  isPinned: boolean;
  createdAt: Date;
}

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

export interface PaymentDonor {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  createdAt: Date;
}

export interface PaymentTransaction {
  id: string;
  trackingCode: string;
  moduleSource: string;
  sourceType: string;
  sourceId: string;
  fundType: string;
  donorId: string;
  isAnonymous: boolean;
  amount: number;
  adminFee: number;
  paymentMethod: string;
  destinationAccountId: string;
  status: string;
  gatewayReferenceId: string | null;
  gatewaySessionId: string | null;
  gatewayTransactionId: string | null;
  gateway: string;
  gatewayState: string;
  gatewayAccountId: string | null;
  gatewayCheckoutUrl: string | null;
  createdAt: Date;
  paidAt: Date | null;
}

export interface PaymentDestinationAccount {
  id: string;
  moduleSource: string;
  fundType: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface SarsipBeneficiary {
  id: string;
  name: string;
  phone: string | null;
  location: string;
  assistance: string;
  publicName: string | null;
  category: string;
  amount: number;
  image: string | null;
  isPublished: boolean;
  receivedAt: Date;
  notes: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SarsipEntry {
  id: string;
  kind: string;
  title: string;
  description: string;
  location: string | null;
  eventDate: Date | null;
  image: string | null;
  targetAmount: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SarsipProfile {
  id: string;
  headline: string;
  description: string;
  contact: string | null;
}

export interface SarsipPaymentMethod {
  id: string;
  method: string;
  feeAmount: number | null;
  feePercentage: number | null;
}

export interface SipSiteContent {
  id: string;
  sectionKey: string;
  contentJson: string;
}

export interface SipProgramBantuan {
  id: string;
  title: string;
  slug: string;
  description: string;
  image: string | null;
  campaignUrl: string | null;
  isPinned: boolean;
  createdAt: Date;
}

export interface SipNews {
  id: string;
  title: string;
  content: string;
  image: string | null;
  isPinned: boolean;
  status: string;
  createdAt: Date;
}

export interface SipPenyaluranBantuan {
  id: string;
  title: string;
  description: string;
  image: string | null;
  location: string | null;
  date: Date;
  createdAt: Date;
}

export interface SipLaporan {
  id: string;
  title: string;
  type: string;
  periodMonth: number | null;
  periodYear: number;
  fileUrl: string;
  createdAt: Date;
}

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

export interface TeknisiParticipant {
  id: string;
  userId: string;
  nip: string;
  address: string;
  phone: string | null;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface TeknisiOutlet {
  id: string;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
  createdAt: Date;
}

export interface TeknisiTechnician {
  id: string;
  userId: string;
  name: string;
  outletId: string;
  specialty: string;
  isActive: boolean;
  activeOutletId: string | null;
}

export interface TeknisiTicket {
  id: string;
  number: string;
  trackingToken: string;
  outletId: string;
  technicianId: string | null;
  participantId: string | null;
  customerName: string;
  customerPhone: string;
  device: string;
  imei: string | null;
  complaint: string;
  accessories: string | null;
  status: string;
  priority: string;
  estimate: number;
  serviceCost: number;
  dueAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeknisiEvent {
  id: string;
  ticketId: string;
  status: string;
  note: string;
  actorName: string;
  createdAt: Date;
}

export interface TeknisiPart {
  id: string;
  outletId: string;
  sku: string;
  name: string;
  stock: number;
  minimum: number;
  price: number;
}

export interface TeknisiPartUse {
  id: string;
  ticketId: string;
  partId: string;
  quantity: number;
  unitPrice: number;
  createdAt: Date;
}

export interface TeknisiStockMovement {
  id: string;
  partId: string;
  quantity: number;
  note: string;
  actorName: string;
  createdAt: Date;
}
