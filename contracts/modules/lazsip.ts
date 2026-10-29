// Stable data contracts only; no runtime module implementation imports.

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
  documentationPhotos?: DocumentationPhoto[] | null;
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
  documentationPhotos?: DocumentationPhoto[] | null;
  date: Date;
  isPinned: boolean;
  createdAt: Date;
}

export interface DocumentationPhoto {
  id: string;
  image: string;
  caption: string | null;
  isDemo?: boolean;
}

export type CampaignDocumentationPhoto = DocumentationPhoto;

export interface LazsipCampaign {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  image: string | null;
  documentationPhotos?: CampaignDocumentationPhoto[] | null;
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
  handoverPhoto: string | null;
  certificatePhoto: string | null;
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
