import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import "./EconomyCharts.css";

const LABELS = {
  CPI: "CPI",
  CORE_CPI: "Core CPI",
  UNEMPLOYMENT: "Unemployment %",
  PAYROLLS: "Payrolls (K)",
  WAGES: "Avg Wages",
  GAS_PRICE: "Gas $/gal",
  OIL_PRICE_WTI: "Oil $/bbl",
};

const COLORS = {
  CPI: "#f97316",
  CORE_CPI: "#fb923c",
  UNEMPLOYMENT: "#ef4444",
  WAGES: "#4ade80",
  GAS_PRICE: "#facc15",
  OIL_PRICE_WTI: "#a78bfa",
  PAYROLLS: "#60a5fa",
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

export default function EconomyCharts() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/fred-data")
      .then((r) => r.json())
      .then((raw) => {
        setData(
          raw.map((d) => ({
            ...d,
            label: LABELS[d.name] ?? d.name,
            fill: COLORS[d.name] ?? "#60a5fa",
          }))
        );
        setLoading(false);
        setOpen(true);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="ec-bar">
      <span className="ec-bar-label">FRED</span>
      <span className="ec-loading">Loading live indicators…</span>
    </div>
  );

  if (!data.length) return null;

  return (
    <div className="ec-wrapper">
      <button className="ec-bar" onClick={() => setOpen((o) => !o)}>
        <span className="ec-bar-label">FRED LIVE DATA</span>
        <span className="ec-bar-pills">
          {data.slice(0, 4).map((d) => (
            <span key={d.name} className="ec-pill" style={{ color: d.fill }}>
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
                  <Cell key={d.name} fill={d.fill} />
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
