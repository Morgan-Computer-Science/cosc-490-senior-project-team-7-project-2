import { useEffect, useRef, useState, useCallback } from "react";
import "./GlobalRadar.css";

// ── Continent outlines [lon, lat] ──────────────────────────────────────────
const CONTINENTS = [
  [[-168,72],[-140,70],[-95,75],[-65,47],[-55,47],[-82,24],[-90,16],[-104,19],[-117,22],[-124,37],[-124,48],[-135,58],[-150,60],[-168,72]],
  [[-73,77],[-20,83],[-17,76],[-25,68],[-45,60],[-58,64],[-66,70],[-73,77]],
  [[-80,12],[-62,11],[-50,5],[-35,-5],[-35,-23],[-52,-34],[-65,-56],[-75,-50],[-80,-30],[-80,12]],
  [[-9,37],[0,37],[5,43],[15,38],[28,41],[30,48],[24,60],[15,58],[8,55],[-5,48],[-9,37]],
  [[5,58],[10,57],[20,63],[26,70],[20,71],[10,63],[5,58]],
  [[-5,50],[2,51],[2,54],[-3,58],[-5,58],[-5,50]],
  [[-17,15],[-12,5],[10,5],[42,12],[50,12],[43,11],[44,-12],[35,-22],[19,-35],[16,-29],[8,-5],[-5,5],[-17,15]],
  [[44,-12],[50,-22],[47,-25],[44,-12]],
  [[26,72],[68,72],[100,72],[140,72],[168,68],[145,45],[135,35],[122,26],[110,20],[100,5],[95,10],[80,15],[65,23],[58,22],[38,38],[26,45],[26,72]],
  [[62,23],[68,22],[77,8],[80,10],[88,22],[78,35],[72,26],[62,23]],
  [[100,20],[108,16],[103,5],[100,3],[95,5],[100,20]],
  [[130,30],[135,35],[141,40],[139,44],[131,33],[130,30]],
  [[114,-22],[120,-35],[130,-35],[140,-38],[150,-38],[153,-30],[150,-25],[145,-18],[136,-12],[130,-12],[120,-20],[114,-22]],
  [[166,-46],[170,-46],[172,-41],[175,-37],[166,-46]],
];

// ── Domain hotspot locations ───────────────────────────────────────────────
const DOMAIN_HOTSPOTS = {
  "Economy":                    [{lon:-74, lat:40.7,name:"NEW YORK"},{lon:-0.1,lat:51.5,name:"LONDON"},{lon:139,lat:35.7,name:"TOKYO"},{lon:8.7,lat:50.1,name:"FRANKFURT"},{lon:121,lat:31.2,name:"SHANGHAI"}],
  "National Security":          [{lon:37,lat:55.7,name:"MOSCOW"},{lon:116,lat:39.9,name:"BEIJING"},{lon:129,lat:40.3,name:"PYONGYANG"},{lon:51.4,lat:35.7,name:"TEHRAN"},{lon:36,lat:32,name:"MID-EAST"}],
  "Domestic Policy":            [{lon:-77,lat:38.9,name:"WASHINGTON"},{lon:-87,lat:41.8,name:"CHICAGO"},{lon:-118,lat:34,name:"LOS ANGELES"},{lon:-71,lat:42.4,name:"BOSTON"}],
  "International Relations":    [{lon:6.1,lat:46.2,name:"GENEVA"},{lon:4.4,lat:50.8,name:"BRUSSELS"},{lon:13.4,lat:52.5,name:"BERLIN"},{lon:2.3,lat:48.9,name:"PARIS"}],
  "Military & Defense":         [{lon:-76.3,lat:36.9,name:"NORFOLK"},{lon:7.6,lat:49.4,name:"RAMSTEIN"},{lon:72.4,lat:-7.3,name:"DIEGO GARCIA"},{lon:144,lat:13.5,name:"GUAM"},{lon:127,lat:26.3,name:"OKINAWA"}],
  "Jobs & Employment":          [{lon:-83,lat:42.3,name:"DETROIT"},{lon:-90,lat:29.9,name:"NEW ORLEANS"},{lon:-122,lat:37.8,name:"SAN FRAN"},{lon:-80,lat:40.4,name:"PITTSBURGH"}],
  "Trade & Commerce":           [{lon:-118,lat:33.7,name:"PORT LA"},{lon:4.5,lat:51.9,name:"ROTTERDAM"},{lon:121,lat:31.2,name:"PORT SHANG"},{lon:103,lat:1.3,name:"SINGAPORE"},{lon:-79.9,lat:9.3,name:"PANAMA"}],
  "Energy & Environment":       [{lon:46.7,lat:24.7,name:"RIYADH"},{lon:-95.4,lat:29.7,name:"HOUSTON"},{lon:53,lat:26,name:"PERSIAN GULF"},{lon:-147,lat:64.8,name:"ALASKA OIL"},{lon:30,lat:60,name:"NORDSTREAM"}],
  "Healthcare & Public Health": [{lon:6.1,lat:46.2,name:"WHO GENEVA"},{lon:-84.3,lat:33.8,name:"CDC ATLANTA"},{lon:116,lat:39.9,name:"BEIJING CDC"},{lon:77.2,lat:28.6,name:"NEW DELHI"},{lon:-46,lat:-23,name:"SAO PAULO"}],
  "Technology & Cybersecurity": [{lon:-122,lat:37.4,name:"SILICON VLY"},{lon:116,lat:39.9,name:"ZHONGGUANCUN"},{lon:37.6,lat:55.8,name:"MOSCOW CYBER"},{lon:-76.8,lat:39.1,name:"NSA MEADE"},{lon:103,lat:1.3,name:"CYBER HUB"}],
};

const DOMAIN_COLORS = {
  "Economy":                    "255,200,0",
  "National Security":          "255,60,60",
  "Domestic Policy":            "180,80,255",
  "International Relations":    "0,200,255",
  "Military & Defense":         "80,140,255",
  "Jobs & Employment":          "60,220,120",
  "Trade & Commerce":           "255,130,0",
  "Energy & Environment":       "255,220,0",
  "Healthcare & Public Health": "0,220,180",
  "Technology & Cybersecurity": "0,180,255",
};

const THREAT_STYLE = {
  LOW:      { maxR:13, alpha:0.50, skipRate:2 },
  ELEVATED: { maxR:20, alpha:0.78, skipRate:1 },
  HIGH:     { maxR:28, alpha:1.00, skipRate:1 },
  CRITICAL: { maxR:36, alpha:1.00, skipRate:1 },
};

const THREAT_ORDER    = ["CRITICAL","HIGH","ELEVATED","LOW"];
const THREAT_COLOR    = { LOW:"#4ade80", ELEVATED:"#facc15", HIGH:"#f97316", CRITICAL:"#ef4444" };
const DEFAULT_PERIOD  = 6000;

// Center-relative coords: (0,0) = center of radar
function lonLatToWorld(lon, lat, r) {
  return [(lon / 180) * r, -(lat / 90) * r];
}

// Inverse: canvas pixel → lon/lat
function canvasToLonLat(px, py, cx, cy, pan, zoom, r) {
  const wx = (px - cx - pan.x) / zoom;
  const wy = (py - cy - pan.y) / zoom;
  return [(wx / r) * 180, -(wy / r) * 90];
}

export default function GlobalRadar({ onClose, threatLevels = {} }) {
  const canvasRef      = useRef(null);
  const pingsRef       = useRef([]);
  const sweepCountRef  = useRef({});
  const animRef        = useRef(null);

  // Interaction state in refs (avoid re-render on every mouse move)
  const zoomRef        = useRef(1);
  const panRef         = useRef({ x:0, y:0 });
  const isDraggingRef  = useRef(false);
  const dragStartRef   = useRef({ x:0, y:0 });
  const dragPanStartRef= useRef({ x:0, y:0 });
  const mouseLLRef     = useRef({ lon:0, lat:0 });
  const sweepPeriodRef = useRef(DEFAULT_PERIOD);
  const radarRRef      = useRef(0); // updated each frame

  // React state for UI overlays
  const [zoomPct, setZoomPct]         = useState(100);
  const [mouseLL, setMouseLL]         = useState({ lon:0, lat:0 });
  const [selectedPing, setSelectedPing] = useState(null);
  const [enabledDomains, setEnabledDomains] = useState(() => new Set(Object.keys(DOMAIN_HOTSPOTS)));
  const [sweepSpeed, setSweepSpeed]   = useState("normal");

  const toggleDomain = useCallback((d) => {
    setEnabledDomains(prev => {
      const next = new Set(prev);
      next.has(d) ? next.delete(d) : next.add(d);
      return next;
    });
  }, []);

  const changeSpeed = useCallback((s) => {
    setSweepSpeed(s);
    sweepPeriodRef.current = s === "slow" ? 12000 : s === "fast" ? 3000 : DEFAULT_PERIOD;
  }, []);

  const adjustZoom = useCallback((factor) => {
    zoomRef.current = Math.max(1, Math.min(6, zoomRef.current * factor));
    if (zoomRef.current === 1) panRef.current = { x:0, y:0 };
    setZoomPct(Math.round(zoomRef.current * 100));
  }, []);

  const resetView = useCallback(() => {
    zoomRef.current = 1;
    panRef.current  = { x:0, y:0 };
    setZoomPct(100);
  }, []);

  // Click on canvas → check if a ping was hit
  const handleCanvasClick = useCallback((e) => {
    if (isDraggingRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const cx = canvasRef.current.width  / 2;
    const cy = canvasRef.current.height / 2;
    const r  = radarRRef.current;
    const zoom = zoomRef.current;
    const pan  = panRef.current;

    let hit = null;
    let hitDist = 16; // px threshold
    for (const ping of pingsRef.current) {
      // Screen position of ping
      const sx = cx + pan.x + ping.wx * zoom;
      const sy = cy + pan.y + ping.wy * zoom;
      const dist = Math.hypot(mx - sx, my - sy);
      if (dist < hitDist) { hit = ping; hitDist = dist; }
    }
    setSelectedPing(hit ?? null);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");

    function resize() {
      const size = Math.min(window.innerWidth * 0.62, window.innerHeight * 0.75, 620);
      canvas.width  = size;
      canvas.height = size;
    }
    resize();
    window.addEventListener("resize", resize);

    // ── Mouse events ──────────────────────────────────────────────────────
    function onWheel(e) {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      zoomRef.current = Math.max(1, Math.min(6, zoomRef.current * factor));
      if (zoomRef.current === 1) panRef.current = { x:0, y:0 };
      setZoomPct(Math.round(zoomRef.current * 100));
    }

    function onMouseDown(e) {
      if (e.button !== 0) return;
      isDraggingRef.current = true;
      dragStartRef.current   = { x: e.clientX, y: e.clientY };
      dragPanStartRef.current = { ...panRef.current };
      canvas.style.cursor = "grabbing";
    }

    function onMouseMove(e) {
      const rect = canvas.getBoundingClientRect();
      const mx   = e.clientX - rect.left;
      const my   = e.clientY - rect.top;
      const cx   = canvas.width  / 2;
      const cy   = canvas.height / 2;
      const r    = radarRRef.current;

      if (isDraggingRef.current) {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        const maxPan = (zoomRef.current - 1) * r;
        panRef.current = {
          x: Math.max(-maxPan, Math.min(maxPan, dragPanStartRef.current.x + dx)),
          y: Math.max(-maxPan, Math.min(maxPan, dragPanStartRef.current.y + dy)),
        };
      }

      // Update coordinate readout
      if (r > 0) {
        const [lon, lat] = canvasToLonLat(mx, my, cx, cy, panRef.current, zoomRef.current, r);
        const clamped = { lon: Math.max(-180, Math.min(180, lon)), lat: Math.max(-90, Math.min(90, lat)) };
        mouseLLRef.current = clamped;
        setMouseLL(clamped);
      }
    }

    function onMouseUp() {
      isDraggingRef.current = false;
      canvas.style.cursor = "crosshair";
    }

    canvas.addEventListener("wheel",     onWheel,     { passive: false });
    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onMouseUp);
    canvas.style.cursor = "crosshair";

    // ── Draw loop ─────────────────────────────────────────────────────────
    function draw() {
      const { width: W, height: H } = canvas;
      const cx   = W / 2, cy = H / 2;
      const r    = Math.min(cx, cy) * 0.90;
      radarRRef.current = r;
      const now  = Date.now();
      const zoom = zoomRef.current;
      const pan  = panRef.current;
      const sweepAngle = ((now % sweepPeriodRef.current) / sweepPeriodRef.current) * Math.PI * 2 - Math.PI / 2;

      ctx.clearRect(0, 0, W, H);

      // Outer glow ring (canvas space, no transform)
      const og = ctx.createRadialGradient(cx, cy, r * 0.90, cx, cy, r + 22);
      og.addColorStop(0, "rgba(0,140,255,0.0)"); og.addColorStop(1, "rgba(0,140,255,0.14)");
      ctx.beginPath(); ctx.arc(cx, cy, r + 22, 0, Math.PI * 2);
      ctx.fillStyle = og; ctx.fill();

      // Background (canvas space)
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      bg.addColorStop(0, "#001428"); bg.addColorStop(1, "#000a14");
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = bg; ctx.fill();

      // ── Clipped + transformed world ────────────────────────────────────
      ctx.save();
      // 1. Clip to circle in canvas space
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
      // 2. Apply pan/zoom centered on radar center
      ctx.translate(cx + pan.x, cy + pan.y);
      ctx.scale(zoom, zoom);

      // Lat/lon grid
      ctx.strokeStyle = "rgba(0,140,220,0.09)"; ctx.lineWidth = 0.5 / zoom;
      for (let lon = -150; lon <= 150; lon += 30) {
        const [x] = lonLatToWorld(lon, 0, r);
        ctx.beginPath(); ctx.moveTo(x, -r); ctx.lineTo(x, r); ctx.stroke();
      }
      for (let lat = -60; lat <= 60; lat += 30) {
        const [, y] = lonLatToWorld(0, lat, r);
        const dx = Math.sqrt(Math.max(0, r * r - y * y));
        ctx.beginPath(); ctx.moveTo(-dx, y); ctx.lineTo(dx, y); ctx.stroke();
      }

      // Range rings
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath(); ctx.arc(0, 0, (r * i) / 4, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,160,255,${i===4 ? 0.20 : 0.10})`;
        ctx.lineWidth = (i===4 ? 1 : 0.5) / zoom; ctx.stroke();
      }

      // Crosshair
      ctx.strokeStyle = "rgba(0,160,255,0.12)"; ctx.lineWidth = 0.5 / zoom;
      ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke();
      const d45 = r * Math.cos(Math.PI / 4);
      ctx.beginPath(); ctx.moveTo(-d45,-d45); ctx.lineTo(d45,d45); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(d45,-d45); ctx.lineTo(-d45,d45); ctx.stroke();

      // Continents
      CONTINENTS.forEach((poly) => {
        ctx.beginPath();
        poly.forEach(([lon,lat],i) => {
          const [x,y] = lonLatToWorld(lon,lat,r);
          i === 0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
        });
        ctx.closePath();
        ctx.fillStyle = "rgba(0,70,150,0.16)";
        ctx.strokeStyle = "rgba(0,160,255,0.38)";
        ctx.lineWidth = 0.7 / zoom; ctx.fill(); ctx.stroke();
      });

      // Sweep trail
      const trailArc = Math.PI * 0.55;
      for (let i = 40; i >= 0; i--) {
        const a = sweepAngle - (i / 40) * trailArc;
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.lineTo(r * Math.cos(a), r * Math.sin(a));
        ctx.strokeStyle = `rgba(0,220,255,${((40-i)/40)*0.18})`;
        ctx.lineWidth = 1.5 / zoom; ctx.stroke();
      }

      // Sweep line
      const sg = ctx.createLinearGradient(0, 0, r*Math.cos(sweepAngle), r*Math.sin(sweepAngle));
      sg.addColorStop(0,   "rgba(0,240,255,0.0)");
      sg.addColorStop(0.3, "rgba(0,240,255,0.5)");
      sg.addColorStop(1,   "rgba(0,240,255,1.0)");
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.lineTo(r * Math.cos(sweepAngle), r * Math.sin(sweepAngle));
      ctx.strokeStyle = sg; ctx.lineWidth = 1.8 / zoom;
      ctx.shadowColor = "#00eeff"; ctx.shadowBlur = 8 / zoom;
      ctx.stroke(); ctx.shadowBlur = 0;

      // ── Detect hotspot sweep crossings ──────────────────────────────────
      const activePingNames = new Set(pingsRef.current.map(p => p.name));
      Object.entries(DOMAIN_HOTSPOTS).forEach(([domain, spots]) => {
        if (!enabledDomains.has(domain)) return;
        const threat = threatLevels[domain]?.level ?? "ELEVATED";
        const style  = THREAT_STYLE[threat] ?? THREAT_STYLE.ELEVATED;
        const col    = DOMAIN_COLORS[domain] ?? "0,200,255";

        spots.forEach((spot) => {
          const [wx, wy] = lonLatToWorld(spot.lon, spot.lat, r);
          const spotAngle = Math.atan2(wy, wx);
          const diff = ((sweepAngle - spotAngle) % (Math.PI*2) + Math.PI*2) % (Math.PI*2);
          if (diff < 0.055) {
            sweepCountRef.current[spot.name] = (sweepCountRef.current[spot.name] ?? 0) + 1;
            if (sweepCountRef.current[spot.name] % style.skipRate === 0) {
              pingsRef.current = pingsRef.current.filter(p => p.name !== spot.name);
              pingsRef.current.push({ wx, wy, born: now, name: spot.name, col, style, domain, threat });
            }
          }
        });
      });

      // ── Draw pings ──────────────────────────────────────────────────────
      pingsRef.current = pingsRef.current.filter(p => now - p.born < 3500);
      pingsRef.current.forEach((ping) => {
        const age   = (now - ping.born) / 3500;
        const alpha = Math.pow(1 - age, 1.4) * ping.style.alpha;

        if (ping.threat === "CRITICAL") {
          const blink = Math.sin(now / 200) > 0 ? 1 : 0.25;
          ctx.beginPath(); ctx.arc(ping.wx, ping.wy, 4/zoom, 0, Math.PI*2);
          ctx.fillStyle = `rgba(${ping.col},${blink})`;
          ctx.shadowColor = `rgb(${ping.col})`; ctx.shadowBlur = 12/zoom;
          ctx.fill(); ctx.shadowBlur = 0;
        }

        for (let ring = 0; ring < 3; ring++) {
          const ra = (age * 1.3 + ring * 0.27) % 1;
          ctx.beginPath(); ctx.arc(ping.wx, ping.wy, (ra * ping.style.maxR) / zoom, 0, Math.PI*2);
          ctx.strokeStyle = `rgba(${ping.col},${(1-ra)*alpha})`;
          ctx.lineWidth = (ping.threat === "HIGH" || ping.threat === "CRITICAL" ? 1.5 : 1) / zoom;
          ctx.stroke();
        }

        ctx.beginPath(); ctx.arc(ping.wx, ping.wy, 2.5/zoom, 0, Math.PI*2);
        ctx.fillStyle = `rgba(${ping.col},${alpha})`;
        ctx.shadowColor = `rgb(${ping.col})`; ctx.shadowBlur = 6/zoom;
        ctx.fill(); ctx.shadowBlur = 0;

        ctx.font = `bold ${9/zoom}px 'JetBrains Mono', monospace`;
        ctx.fillStyle = `rgba(${ping.col},${alpha*0.85})`;
        ctx.fillText(ping.name, ping.wx + 7/zoom, ping.wy - 4/zoom);
      });

      // Scanlines
      ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform for scanlines
      for (let sy = 0; sy < H; sy += 4) {
        ctx.fillStyle = "rgba(0,0,0,0.055)"; ctx.fillRect(0, sy, W, 2);
      }

      ctx.restore(); // end clip+transform

      // ── Canvas-space overlays (don't zoom) ─────────────────────────────
      // Outer border ring
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
      ctx.strokeStyle = "rgba(0,155,255,0.60)"; ctx.lineWidth = 1.5;
      ctx.shadowColor = "#0060ff"; ctx.shadowBlur = 10; ctx.stroke(); ctx.shadowBlur = 0;

      // Degree ticks
      ctx.fillStyle = "rgba(0,175,255,0.45)";
      ctx.font = "8px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      for (let deg = 0; deg < 360; deg += 30) {
        const rad = (deg - 90) * (Math.PI / 180);
        ctx.fillText(`${deg}°`, cx + (r+12)*Math.cos(rad), cy + (r+12)*Math.sin(rad)+3);
        ctx.beginPath();
        ctx.moveTo(cx + (r-5)*Math.cos(rad), cy + (r-5)*Math.sin(rad));
        ctx.lineTo(cx + r*Math.cos(rad), cy + r*Math.sin(rad));
        ctx.strokeStyle = "rgba(0,160,255,0.35)"; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.textAlign = "left";

      animRef.current = requestAnimationFrame(draw);
    }

    draw();

    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup",   onMouseUp);
      canvas.removeEventListener("wheel",     onWheel);
      canvas.removeEventListener("mousedown", onMouseDown);
    };
  }, [onClose, enabledDomains, threatLevels]);

  const domainList = Object.keys(DOMAIN_HOTSPOTS).map((d) => ({
    domain: d,
    level:  threatLevels[d]?.level ?? "—",
    col:    DOMAIN_COLORS[d],
    on:     enabledDomains.has(d),
  })).sort((a,b) => THREAT_ORDER.indexOf(a.level) - THREAT_ORDER.indexOf(b.level));

  return (
    <div className="radar-overlay" onClick={onClose}>
      <div className="radar-modal" onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <header className="radar-header">
          <div className="radar-header-left">
            <span className="radar-title">SENTINEL</span>
            <span className="radar-subtitle">GLOBAL THREAT RADAR · LIVE</span>
          </div>
          <div className="radar-controls">
            <div className="ctrl-group">
              <span className="ctrl-label">SWEEP</span>
              {["slow","normal","fast"].map(s => (
                <button key={s} className={`ctrl-btn ${sweepSpeed===s?"ctrl-btn--on":""}`} onClick={() => changeSpeed(s)}>
                  {s.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="ctrl-group">
              <span className="ctrl-label">ZOOM</span>
              <button className="ctrl-btn" onClick={() => adjustZoom(0.75)}>−</button>
              <span className="ctrl-zoom-pct">{zoomPct}%</span>
              <button className="ctrl-btn" onClick={() => adjustZoom(1.33)}>+</button>
              <button className="ctrl-btn" onClick={resetView}>RESET</button>
            </div>
          </div>
          <button className="radar-close" onClick={onClose}>✕ CLOSE</button>
        </header>

        {/* ── Body ── */}
        <div className="radar-body">

          {/* Canvas */}
          <div className="radar-canvas-wrap">
            <canvas ref={canvasRef} className="radar-canvas" onClick={handleCanvasClick} />
            {/* Coordinate readout */}
            <div className="radar-coords">
              LAT&nbsp;
              <span>{mouseLL.lat >= 0 ? "N" : "S"}&nbsp;{Math.abs(mouseLL.lat).toFixed(1)}°</span>
              &nbsp;·&nbsp;LON&nbsp;
              <span>{mouseLL.lon >= 0 ? "E" : "W"}&nbsp;{Math.abs(mouseLL.lon).toFixed(1)}°</span>
            </div>
            <div className="radar-hint">Scroll to zoom · Drag to pan · Click ping for details</div>
          </div>

          {/* HUD sidebar */}
          <div className="radar-hud-right">
            <div className="hud-block">
              <div className="hud-label">STATUS</div>
              <div className="hud-value">SCANNING</div>
            </div>
            <div className="hud-block">
              <div className="hud-label">ZOOM</div>
              <div className="hud-value">{zoomPct}%</div>
            </div>
            <div className="hud-divider" />
            <div className="hud-label" style={{marginBottom:6}}>DOMAIN FILTERS</div>
            {domainList.map(({ domain, level, col, on }) => (
              <button
                key={domain}
                className={`hud-domain-row ${on ? "" : "hud-domain-row--off"}`}
                onClick={() => toggleDomain(domain)}
                title={on ? "Click to hide" : "Click to show"}
              >
                <span className="hud-domain-dot" style={{ color:`rgb(${col})`, textShadow: on ? `0 0 6px rgb(${col})` : "none" }}>●</span>
                <span className="hud-domain-name">{domain}</span>
                <span className="hud-domain-level" style={{ color: on ? (THREAT_COLOR[level] ?? "#94a3b8") : "#334155" }}>
                  {level}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Detail card (ping clicked) ── */}
        {selectedPing && (
          <div className="radar-detail-card" style={{ borderColor: `rgb(${selectedPing.col})` }}>
            <div className="radar-detail-header">
              <span className="radar-detail-domain" style={{ color:`rgb(${selectedPing.col})` }}>{selectedPing.domain}</span>
              <button className="radar-detail-close" onClick={() => setSelectedPing(null)}>✕</button>
            </div>
            <div className="radar-detail-location">📍 {selectedPing.name}</div>
            <div className="radar-detail-threat" style={{ color: THREAT_COLOR[selectedPing.threat] ?? "#94a3b8" }}>
              THREAT LEVEL: {selectedPing.threat}
            </div>
            {threatLevels[selectedPing.domain]?.reason && (
              <div className="radar-detail-reason">{threatLevels[selectedPing.domain].reason}</div>
            )}
          </div>
        )}

        <footer className="radar-footer">
          <span>CLASSIFICATION: TOP SECRET // SCI</span>
          <span>SENTINEL GLOBAL SURVEILLANCE NETWORK</span>
          <span>ESC TO CLOSE</span>
        </footer>
      </div>
    </div>
  );
}
