import { getTodayLearning } from "../api/today";
import { TodayActivities } from "./TodayActivities";

export async function TodayLearning({ profileId }: { profileId?: string }) {
  if (!profileId) return null;
  return <TodayActivities initial={await getTodayLearning()} />;
}
