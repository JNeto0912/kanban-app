// src/app/page.tsx
import Activities from "./components/Activities";
import Finance from "./components/Finance";

export default function HomePage() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      <section className="bg-slate-100 rounded-xl shadow-sm p-6">
        <Activities />
      </section>

      <section className="bg-slate-100 rounded-xl shadow-sm p-6">
        <Finance />
      </section>
    </div>
  );
}