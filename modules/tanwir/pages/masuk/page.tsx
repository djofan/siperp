import { redirect } from "next/navigation";
import { getTanwirViewer, homePathFor } from "@/modules/tanwir/api/access";
import { LoginForm } from "@/modules/tanwir/components/site/LoginForm";
import { whatsappAdminHref } from "@/modules/tanwir/components/site/content";

export const metadata = { title: "Masuk" };

export default async function TanwirLoginPage() {
  const viewer = await getTanwirViewer();
  if (viewer?.member) redirect(homePathFor(viewer));

  return (
    <section className="mx-auto flex max-w-6xl justify-center px-4 py-16 sm:px-6 sm:py-24">
      <div className="w-full max-w-sm">
        <h1 className="font-[family-name:var(--font-tanwir-serif)] text-4xl tracking-tight">Assalamu&apos;alaikum.</h1>
        <p className="mt-2 text-tanwir-muted">Masuk dengan kode akun dari admin untuk melanjutkan setoran.</p>
        <div className="mt-8 rounded-3xl bg-tanwir-surface p-6 ring-1 ring-tanwir-line sm:p-7">
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-sm text-tanwir-muted">
          Lupa password atau belum punya kode?{" "}
          <a href={whatsappAdminHref("Assalamu'alaikum, saya butuh bantuan akun Tanwir Qurani.")} target="_blank" rel="noopener noreferrer" className="font-medium text-tanwir-primary hover:underline">
            Hubungi admin
          </a>
        </p>
      </div>
    </section>
  );
}
