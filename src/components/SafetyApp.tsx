import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import previsoesData from "@/data/previsoes.json";
import itinerarios from "@/data/itinerarios.json";
import bairros from "@/data/bairros.json";

type Previsao = {
  servico: string;
  mes_previsto: string;
  previsao_furtos: number;
  previsao_roubos: number;
  previsao_tiroteios_30d: number;
  media_furtos_12m: number;
  media_roubos_12m: number;
  media_tiroteios_12m: number;
  score_risco: number;
  nivel_risco: "baixo" | "medio" | "alto" | string;
};

const PREV = previsoesData as Previsao[];
const ITIN = itinerarios as Record<string, number[][][]>;

const RIO_CENTER: [number, number] = [-22.92, -43.4];

function FitBounds({ lines }: { lines: number[][][] }) {
  const map = useMap();
  useEffect(() => {
    if (!lines.length) return;
    const latlngs = lines.flatMap((l) => l.map(([lng, lat]) => [lat, lng] as [number, number]));
    if (latlngs.length) {
      map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40] });
    }
  }, [lines, map]);
  return null;
}

const riskClass = (n: string) =>
  n === "alto" ? "bg-risk-high text-white" :
  n === "medio" ? "bg-risk-mid text-primary-foreground" :
  "bg-risk-low text-primary-foreground";

const riskColor = (n: string) =>
  n === "alto" ? "var(--risk-high)" :
  n === "medio" ? "var(--risk-mid)" :
  "var(--risk-low)";

function MetricCard({
  label, current, forecast, unit, accent,
}: { label: string; current: number; forecast: number; unit: string; accent: string }) {
  const delta = forecast - current;
  const pct = current > 0 ? (delta / current) * 100 : 0;
  const up = delta > 0.01;
  const down = delta < -0.01;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
        <span className="size-2 rounded-full" style={{ background: accent }} />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums" style={{ fontFamily: "var(--font-display)" }}>
          {forecast.toFixed(1)}
        </span>
        <span className="text-xs text-muted-foreground">{unit} previstos</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Média 12m: <span className="text-foreground tabular-nums">{current.toFixed(1)}</span></span>
        <span className={up ? "text-risk-high" : down ? "text-risk-low" : "text-muted-foreground"}>
          {up ? "▲" : down ? "▼" : "—"} {Math.abs(pct).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

export default function SafetyApp() {
  const services = useMemo(
    () => [...PREV].sort((a, b) => a.servico.localeCompare(b.servico, undefined, { numeric: true })),
    []
  );
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string>(services[0]?.servico ?? "");
  const filtered = useMemo(
    () => services.filter((s) => s.servico.toLowerCase().includes(query.toLowerCase())),
    [services, query]
  );
  const data = useMemo(() => PREV.find((p) => p.servico === selected), [selected]);
  const lines = ITIN[selected] ?? [];

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-svc="${selected}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const counts = useMemo(() => {
    const c = { baixo: 0, medio: 0, alto: 0 } as Record<string, number>;
    for (const p of services) c[p.nivel_risco] = (c[p.nivel_risco] ?? 0) + 1;
    return c;
  }, [services]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold" style={{ fontFamily: "var(--font-display)" }}>R</div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">Rota Segura · Rio</h1>
            <p className="text-xs text-muted-foreground">Estimativa de segurança das linhas de ônibus do município</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-1 rounded-md bg-card border border-border">
            <span className="size-2 inline-block rounded-full mr-1.5 align-middle" style={{ background: "var(--risk-low)" }} />
            {counts.baixo ?? 0} baixo
          </span>
          <span className="px-2 py-1 rounded-md bg-card border border-border">
            <span className="size-2 inline-block rounded-full mr-1.5 align-middle" style={{ background: "var(--risk-mid)" }} />
            {counts.medio ?? 0} médio
          </span>
          <span className="px-2 py-1 rounded-md bg-card border border-border">
            <span className="size-2 inline-block rounded-full mr-1.5 align-middle" style={{ background: "var(--risk-high)" }} />
            {counts.alto ?? 0} alto
          </span>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-0">
        {/* Sidebar */}
        <aside className="border-r border-border flex flex-col max-h-[calc(100vh-73px)]">
          <div className="p-4 border-b border-border">
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Linha de ônibus</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar (ex.: 100, SR393)"
              className="mt-2 w-full rounded-lg bg-input border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div ref={listRef} className="flex-1 overflow-y-auto">
            {filtered.map((s) => (
              <button
                key={s.servico}
                data-svc={s.servico}
                onClick={() => setSelected(s.servico)}
                className={`w-full text-left px-4 py-3 border-b border-border/50 flex items-center justify-between gap-3 transition-colors hover:bg-secondary ${
                  selected === s.servico ? "bg-secondary" : ""
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-medium tabular-nums">{s.servico}</span>
                  <span className="text-xs text-muted-foreground">score {(s.score_risco * 100).toFixed(0)}</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${riskClass(s.nivel_risco)}`}>
                  {s.nivel_risco}
                </span>
              </button>
            ))}
            {!filtered.length && (
              <div className="p-4 text-sm text-muted-foreground">Nenhuma linha encontrada.</div>
            )}
          </div>
        </aside>

        {/* Main panel */}
        <section className="relative flex flex-col">
          <div className="relative h-[55vh] lg:h-[60vh] border-b border-border">
            <MapContainer
              center={RIO_CENTER}
              zoom={11}
              className="absolute inset-0"
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <GeoJSON
                data={bairros as never}
                style={{ color: "oklch(0.5 0.03 250)", weight: 0.5, fillOpacity: 0.04, fillColor: "oklch(0.5 0.05 250)" }}
              />
              {lines.map((coords, i) => (
                <Polyline
                  key={`${selected}-${i}`}
                  positions={coords.map(([lng, lat]) => [lat, lng] as [number, number])}
                  pathOptions={{
                    color: data ? riskColor(data.nivel_risco) : "var(--primary)",
                    weight: 5,
                    opacity: 0.9,
                  }}
                />
              ))}
              <FitBounds lines={lines} />
            </MapContainer>
            {data && (
              <div className="absolute top-4 left-4 z-[400] rounded-2xl bg-card/95 backdrop-blur border border-border px-4 py-3 shadow-xl max-w-[280px]">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Linha selecionada</div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>{data.servico}</span>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-semibold uppercase tracking-wider ${riskClass(data.nivel_risco)}`}>
                    risco {data.nivel_risco}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {lines.length} traçado{lines.length === 1 ? "" : "s"} · previsão {data.mes_previsto}
                </div>
              </div>
            )}
          </div>

          {data && (
            <div className="p-6 grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                  label="Furtos a coletivo"
                  current={data.media_furtos_12m}
                  forecast={data.previsao_furtos}
                  unit="ocorrências/mês"
                  accent="oklch(0.78 0.17 75)"
                />
                <MetricCard
                  label="Roubos a coletivo"
                  current={data.media_roubos_12m}
                  forecast={data.previsao_roubos}
                  unit="ocorrências/mês"
                  accent="oklch(0.7 0.18 35)"
                />
                <MetricCard
                  label="Tiroteios no trajeto"
                  current={data.media_tiroteios_12m}
                  forecast={data.previsao_tiroteios_30d}
                  unit="ocorrências/30d"
                  accent="oklch(0.62 0.22 15)"
                />
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-muted-foreground">Score de risco</div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-4xl font-bold tabular-nums" style={{ fontFamily: "var(--font-display)" }}>
                        {(data.score_risco * 100).toFixed(0)}
                      </span>
                      <span className="text-sm text-muted-foreground">/ 100</span>
                    </div>
                  </div>
                  <span className={`text-xs px-3 py-1.5 rounded-full font-semibold uppercase tracking-wider ${riskClass(data.nivel_risco)}`}>
                    {data.nivel_risco}
                  </span>
                </div>
                <div className="mt-4 h-2.5 rounded-full bg-secondary overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, data.score_risco * 100)}%`,
                      background: `linear-gradient(90deg, var(--risk-low), var(--risk-mid) 50%, var(--risk-high))`,
                    }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span>baixo</span><span>médio</span><span>alto</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Estimativas para {data.mes_previsto} baseadas em dados do Instituto de Segurança Pública,
                Instituto Fogo Cruzado e itinerários do data.rio.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
