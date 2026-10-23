import "server-only";
import { apiRequest } from "@/lib/api";
import { cache } from "react";
export const getLearningSettings = cache(async () => apiRequest<{
    csPhone: string;
    weights: {
        DAILY: number;
        WEEKLY: number;
        FINAL: number;
    };
}>("academy/settings/learning"));
export type GetIntakeResult = {
    cohort: { id: string; title: string } | null;
    filled: number;
    full: boolean;
};
export async function getIntake(): Promise<GetIntakeResult> {
    return await apiRequest<GetIntakeResult>("academy/intake");
}
