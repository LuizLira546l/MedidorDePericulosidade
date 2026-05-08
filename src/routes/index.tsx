import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const SafetyApp = lazy(() => import("@/components/SafetyApp"));

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Rota Segura · Linhas de ônibus do Rio" },
      { name: "description", content: "Estimativa de segurança das linhas de ônibus do município do Rio de Janeiro: traçado no mapa, médias e previsões de furtos, roubos e tiroteios." },
      { property: "og:title", content: "Rota Segura · Linhas de ônibus do Rio" },
      { property: "og:description", content: "Selecione uma linha e veja o traçado, médias dos últimos 12 meses e previsões para o próximo mês." },
    ],
  }),
});

function Index() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando…</div>}>
      <SafetyApp />
    </Suspense>
  );
}
