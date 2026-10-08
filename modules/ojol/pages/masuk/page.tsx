import { redirect } from "next/navigation";
import { getOjolViewer, homePathFor } from "@/modules/ojol/api/access";
import { LoginForm } from "@/modules/ojol/components/site/LoginForm";
import { whatsappAdminHref } from "@/modules/ojol/components/site/content";

export const metadata = { title: "Masuk" };

export default async function OjolLoginPage() {
  const viewer = await getOjolViewer();
  if (viewer?.member) redirect(homePathFor(viewer));

  return (
    <section className="mx-auto flex max-w-6xl justify-center px-4 py-16 sm:px-6 sm:py-24">
      <div className="w-full max-w-sm">
        <h1 className="font-[family-name:var(--font-ojol-display)] text-4xl font-extrabold tracking-tight">Assalamu&apos;alaikum.</h1>
        <p className="mt-2 text-ojol-muted">Masuk dengan kode akun dari admin untuk melanjutkan setoran.</p>
        <div className="mt-8 rounded-3xl bg-ojol-surface p-6 ring-1 ring-ojol-line sm:p-7">
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-sm text-ojol-muted">
          Lupa password atau belum punya kode?{" "}
          <a href={whatsappAdminHref("Assalamu'alaikum, saya butuh bantuan akun Ojol Mengaji.")} target="_blank" rel="noopener noreferrer" className="font-medium text-ojol-primary hover:underline">
            Hubungi admin
          </a>
        </p>
      </div>
    </section>
  );
}
