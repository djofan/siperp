import { HomeCourses } from "../../components/HomeCourses";

export const metadata = { title: "Program Insan Academy" };

export default function Page() {
  return <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
    <p className="text-sm font-semibold text-green-700">Insan Academy</p>
    <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Program Belajar</h1>
    <p className="mb-8 mt-4 max-w-2xl leading-relaxed text-gray-600">Kenali program yang tersedia dan cara belajarnya. Saat ini, perjalanan belajar dimulai dari Zakat Dasar.</p>
    <HomeCourses />
  </section>;
}
