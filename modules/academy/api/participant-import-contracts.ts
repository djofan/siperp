export type ParticipantImportRow = { rowNumber: number; name: string; phone: string; address: string };
export type ParticipantImportCredential = { name: string; phone: string; code: string; password: string };
export type ParticipantImportResult = { createdCount: number; skippedCount: number; credentials: ParticipantImportCredential[] };
export type ParticipantImportState = { error: string; errors?: string[]; result?: ParticipantImportResult };
