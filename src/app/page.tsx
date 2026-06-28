// src/app/page.tsx
"use client";

import { useState } from "react";
import Activities from "./components/Activities";
import Finance from "./components/Finance";

const TABS = [
  { id: "activities", label: "Atividades" },
  { id: "finance", label: "Financeiro" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabId>("activities");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 rounded-xl bg-slate-100/80 p-2 shadow-sm border border-slate-200">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                "rounded-lg px-4 py-2 text-sm font-medium transition",
                active
                  ? "bg-slate-900 text-slate-100 shadow"
                  : "bg-transparent text-slate-600 hover:bg-slate-200",
              ].join(" ")}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <section className="bg-slate-100 rounded-xl shadow-sm p-6">
        {activeTab === "activities" ? <Activities /> : <Finance />}
      </section>
    </div>
  );
}