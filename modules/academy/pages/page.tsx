import { HomeCourses } from "../components/HomeCourses";
import { HeroSection } from "../components/landing/hero-section";
import { FeaturesSection } from "../components/landing/features-section";
export default function AcademyHomePage() {
  return <><HeroSection />
    <section id="programs" className="bg-gray-50/50 px-4 py-16 md:py-24"><div className="mx-auto max-w-5xl">
      <div className="mb-10 text-center"><p className="mb-2 text-sm font-semibold uppercase tracking-widest text-green-600">Program Belajar</p><h2 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">Kenali Program Insan Academy</h2><p className="mt-3 text-sm text-gray-500 md:text-base">Mulai dari Zakat Dasar, lalu nantikan program pembelajaran berikutnya.</p></div>
      <HomeCourses />
    </div></section><FeaturesSection /></>;
}
