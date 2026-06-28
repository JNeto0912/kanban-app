// src/app/components/Tabs.tsx
"use client";

import { useState, ReactNode } from "react";

interface TabProps {
  label: string;
  children: ReactNode;
}

// O componente Tab precisa ser exportado diretamente para ser usado na comparação de tipo
export function Tab({ children }: TabProps) { // <-- Mudei para exportar diretamente
  return <div className="p-4">{children}</div>;
}

interface TabsProps {
  children: ReactNode[];
}

export default function Tabs({ children }: TabsProps) {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = children.filter(
    (child) => (child as React.ReactElement).type === Tab // <-- MODIFIQUEI ESTA LINHA
  ) as React.ReactElement<TabProps>[];

  return (
    <div className="w-full">
      <div className="flex border-b border-slate-300">
        {tabs.map((tab, index) => (
          <button
            key={index}
            className={`py-2 px-4 text-sm font-medium focus:outline-none ${
              index === activeTab
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setActiveTab(index)}
          >
            {tab.props.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {tabs[activeTab] ? tabs[activeTab].props.children : null}
      </div>
    </div>
  );
}