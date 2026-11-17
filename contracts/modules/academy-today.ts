export interface AcademyActivity {
  id: string; title: string; opensAt: string; closesAt: string;
}
export interface AcademyToday {
  serverNow: string; nextChangeAt: string | null;
  material: (AcademyActivity & { number: number }) | null;
  exam: (AcademyActivity & { kind: "DAILY" | "WEEKLY" | "FINAL"; completed: boolean }) | null;
}
