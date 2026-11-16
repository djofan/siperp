"use client";
import { ParticipantLoginForm } from "@/components/auth/ParticipantLoginForm";
import { useAcademyBasePath } from "../pwa/AcademyNavigation";
import { academyHref } from "../pwa/navigation";
export function AcademyLoginForm() {
  const base = useAcademyBasePath();
  return <ParticipantLoginForm moduleSlug="academy" successHref={academyHref("/academy/lanjut", base)} />;
}
