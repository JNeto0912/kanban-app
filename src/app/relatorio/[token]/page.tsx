// src/app/relatorio/[token]/page.tsx
import ReportView from "./ReportView";

export const metadata = {
  robots: "noindex, nofollow",
};

export default async function RelatorioPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ReportView token={token} />;
}