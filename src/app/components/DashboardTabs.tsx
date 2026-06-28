"use client";

import { useState } from "react";
import Activities from "./Activities";
import Finance from "./Finance";

type TabKey = "activities" | "finance";

export default function DashboardTabs() {
  const [activeTab, setActiveTab] = useState<TabKey>("activities");

  return (
    <div className="w-full">
      <div className="flex gap-2 border-b border-slate-300 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("activities")}
          className={`px-4 py-3 text-sm font-medium rounded-t-lg transition ${
            activeTab === "activities"
              ? "bg-slate-100 text-slate-900 border border-b-0 border-slate-300"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Atividades
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("finance")}
          className={`px-4 py-3 text-sm font-medium rounded-t-lg transition ${
            activeTab === "finance"
              ? "bg-slate-100 text-slate-900 border border-b-0 border-slate-300"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Financeiro
        </button>
      </div>

      <section className="bg-slate-100 rounded-xl shadow-sm p-6 min-h-[calc(100vh-220px)]">
        {activeTab === "activities" ? <Activities /> : <Finance />}
      </section>
    </div>
  );
}