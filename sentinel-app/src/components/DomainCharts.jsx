import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import "./EconomyCharts.css";

const DOMAIN_LABELS = {
  "Economy":                    "FRED LIVE · ECONOMY",
  "Jobs & Employment":          "FRED LIVE · LABOR MARKET",
  "Trade & Commerce":           "FRED LIVE · TRADE",
  "Energy & Environment":       "FRED LIVE · ENERGY",
  "Healthcare & Public Health": "FRED LIVE · HEALTHCARE",
  "Military & Defense":         "FRED LIVE · DEFENSE",
  "Domestic Policy":            "FRED LIVE · FISCAL",
};

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="ec-tooltip">
      <div className="ec-tooltip-label">{d.label}</div>
      <div className="ec-tooltip-value">{d.lastValue}</div>
      <div className="ec-tooltip-date">{d.lastDate}</div>
    </div>
  );
}

export default function DomainCharts({ domain }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setData([]);
    setLoading(true);
    setOpen(false);

    fetch(`/api/fred-domain?domain=${encodeURIComponent(domain)}`)
      .then((r) => r.json())
      .then((raw) => {
        setData(raw);
        setLoading(false);
        if (raw.length > 0) setOpen(true);
      })
      .catch(() => setLoading(false));
  }, [domain]);

  const barLabel = DOMAIN_LABELS[domain] ?? "FRED LIVE DATA";

  if (loading) return (
    <div className="ec-bar">
      <span className="ec-bar-label">{barLabel}</span>
      <span className="ec-loading">Loading live indicators…</span>
    </div>
  );

  if (!data.length) return null;

  return (
    <div className="ec-wrapper">
      <button className="ec-bar" onClick={() => setOpen((o) => !o)}>
        <span className="ec-bar-label">{barLabel}</span>
        <span className="ec-bar-pills">
          {data.slice(0, 4).map((d) => (
            <span key={d.key} className="ec-pill" style={{ color: d.color }}>
              {d.label}: <strong>{d.lastValue}</strong>
            </span>
          ))}
        </span>
        <span className="ec-chevron">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="ec-chart-panel">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={data} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="lastValue" radius={[4, 4, 0, 0]}>
                {data.map((d) => (
                  <Cell key={d.key} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="ec-source">Source: Federal Reserve Economic Data (FRED) · St. Louis Fed</p>
        </div>
      )}
    </div>
  );
}
