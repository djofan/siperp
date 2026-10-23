// Stable data contracts only; no runtime module implementation imports.

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
