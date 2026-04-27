import React, { useEffect, useMemo, useState } from "react";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1DBGfVpfnsaI1mAlF9GrAupQL7FiQTKnQLohOB1rqUc0/export?format=csv";

const PASSWORD = "312";

export default function App() {
  const [auth, setAuth] = useState(false);
  const [pass, setPass] = useState("");

  useEffect(() => {
    if (localStorage.getItem("auth") === "ok") setAuth(true);
  }, []);

  const login = () => {
    if (pass === PASSWORD) {
      localStorage.setItem("auth", "ok");
      setAuth(true);
    }
  };

  if (!auth) {
    return (
      <div style={styles.loginBg}>
        <div style={styles.loginCard}>
          <h2>Office BI</h2>

          <input
            type="password"
            placeholder="Password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            style={styles.input}
          />

          <button onClick={login} style={styles.btn}>
            Login
          </button>

          <div style={styles.brand}>
            Департамент управління інфраструктурою
            <br />
            Розробник Микола Хевпа
          </div>
        </div>
      </div>
    );
  }

  return <Dashboard />;
}

function Dashboard() {
  const [data, setData] = useState([]);

  const [mode, setMode] = useState("EMPLOYEES"); // EMPLOYEES / DEPTS
  const [floorMode, setFloorMode] = useState("ALL");
  const [floor, setFloor] = useState(1);

  const [search, setSearch] = useState("");
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    fetch(SHEET_URL)
      .then((r) => r.text())
      .then((txt) => {
        const rows = txt.split("\n").filter(Boolean);

        const parsed = rows.slice(1).map((r) => {
          const c = r.split(",");

          return {
            floor: Number(c[0]),
            room_id: c[1],
            dept: c[3],
            seat_id: c[4],
            status: (c[5] || "other").toLowerCase(),
            name: c[6] || "",
          };
        });

        setData(parsed);
      });
  }, []);

  // FILTERS
  const filtered = useMemo(() => {
    return data.filter((d) => {
      const okFloor =
        floorMode === "ALL" ? true : d.floor === floor;

      const okSearch =
        !search ||
        (d.name || "").toLowerCase().includes(search.toLowerCase());

      return okFloor && okSearch;
    });
  }, [data, floorMode, floor, search]);

  // KPI (КРІ залишено)
  const kpi = useMemo(() => {
    let free = 0,
      occ = 0,
      other = 0;

    filtered.forEach((d) => {
      if (d.status === "free") free++;
      else if (d.status === "occupied") occ++;
      else other++;
    });

    return { free, occ, other, total: filtered.length };
  }, [filtered]);

  const rooms = useMemo(() => {
    const map = {};

    filtered.forEach((r) => {
      if (!map[r.room_id]) {
        map[r.room_id] = { room_id: r.room_id, seats: [] };
      }
      map[r.room_id].seats.push(r);
    });

    return Object.values(map);
  }, [filtered]);

  const refresh = () => {
    setSearch("");
    setSelectedRoom(null);
    setSelectedEmployee(null);
    setFloorMode("ALL");
  };

  const cols = Math.max(2, Math.ceil(Math.sqrt(rooms.length)));
  const cellW = 240;
  const cellH = 160;

  const svgW = cols * cellW + 40;
  const svgH = Math.ceil(rooms.length / cols) * cellH + 40;

  return (
    <div style={styles.page}>
      <h2>🏢 Office BI</h2>

      {/* CONTROLS */}
      <div style={styles.controls}>
        {/* floor */}
        <select
          value={floorMode}
          onChange={(e) => setFloorMode(e.target.value)}
        >
          <option value="ALL">All Floors</option>
          <option value="ONE">One Floor</option>
        </select>

        {floorMode === "ONE" && (
          <select
            value={floor}
            onChange={(e) => setFloor(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        )}

        {/* search */}
        <input
          placeholder="Search surname..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.inputSmall}
        />

        {/* mode */}
        <button
          onClick={() => setMode("EMPLOYEES")}
          style={{
            ...styles.modeBtn,
            background:
              mode === "EMPLOYEES" ? "#2563eb" : "#e5e7eb",
            color: mode === "EMPLOYEES" ? "#fff" : "#000",
          }}
        >
          Працівники
        </button>

        <button
          onClick={() => setMode("DEPTS")}
          style={{
            ...styles.modeBtn,
            background:
              mode === "DEPTS" ? "#2563eb" : "#e5e7eb",
            color: mode === "DEPTS" ? "#fff" : "#000",
          }}
        >
          Департаменти
        </button>

        {/* refresh */}
        <button onClick={refresh} style={styles.refresh}>
          🔄 Refresh
        </button>
      </div>

      {/* KPI */}
      <div style={styles.kpiRow}>
        <Kpi label="Free" val={kpi.free} color="#22c55e" />
        <Kpi label="Occupied" val={kpi.occ} color="#ef4444" />
        <Kpi label="Other" val={kpi.other} color="#94a3b8" />
        <Kpi label="Total" val={kpi.total} color="#2563eb" />
      </div>

      {/* MAP */}
      <div style={styles.map}>
        <svg width={svgW} height={svgH}>
          <rect width={svgW} height={svgH} fill="#eef2ff" />

          {rooms.map((r, i) => {
            const x = 20 + (i % cols) * cellW;
            const y = 20 + Math.floor(i / cols) * cellH;

            const highlight =
              selectedEmployee &&
              r.seats.some(
                (s) =>
                  s.name === selectedEmployee.name
              );

            return (
              <g key={r.room_id}>
                {/* room */}
                <rect
                  x={x}
                  y={y}
                  width="220"
                  height="120"
                  rx="14"
                  fill={highlight ? "#1d4ed8" : "#1f2937"}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedRoom(r.room_id)}
                />

                <text x={x + 10} y={y + 18} fill="#fff">
                  {r.room_id}
                </text>

                {/* seats */}
                {r.seats.map((s, idx) => {
                  const sx = x + 10 + (idx % 6) * 14;
                  const sy = y + 30 + Math.floor(idx / 6) * 14;

                  const isSel =
                    selectedEmployee?.name === s.name;

                  return (
                    <rect
                      key={s.seat_id}
                      x={sx}
                      y={sy}
                      width="10"
                      height="10"
                      fill={
                        s.status === "free"
                          ? "#22c55e"
                          : s.status === "occupied"
                          ? "#ef4444"
                          : "#94a3b8"
                      }
                      stroke={isSel ? "#facc15" : "none"}
                      strokeWidth={isSel ? 2 : 0}
                      onClick={() => {
                        setSelectedEmployee(s);
                        setSelectedRoom(r.room_id);
                      }}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      {/* DETAILS */}
      {selectedRoom && (
        <div style={styles.panel}>
          <h4>Room {selectedRoom}</h4>

          {filtered
            .filter((d) => d.room_id === selectedRoom)
            .map((d, i) => (
              <div
                key={i}
                onClick={() => setSelectedEmployee(d)}
                style={{
                  padding: 4,
                  cursor: "pointer",
                  background:
                    selectedEmployee?.seat_id === d.seat_id
                      ? "#dbeafe"
                      : "transparent",
                }}
              >
                {d.seat_id} — {d.name}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function Kpi({ label, val, color }) {
  return (
    <div style={{ ...styles.kpi, borderLeft: `4px solid ${color}` }}>
      <b>{val}</b>
      <div>{label}</div>
    </div>
  );
}

const styles = {
  page: { fontFamily: "Arial", padding: 10 },

  controls: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 10,
  },

  inputSmall: {
    padding: 6,
    borderRadius: 6,
  },

  modeBtn: {
    padding: "6px 10px",
    borderRadius: 6,
    border: "none",
  },

  refresh: {
    padding: "6px 10px",
    borderRadius: 6,
    background: "#f59e0b",
    border: "none",
  },

  kpiRow: {
    display: "flex",
    gap: 10,
    marginBottom: 10,
  },

  kpi: {
    background: "#fff",
    padding: 8,
    borderRadius: 10,
  },

  map: {
    background: "#fff",
    padding: 10,
    borderRadius: 10,
  },

  panel: {
    marginTop: 10,
    background: "#fff",
    padding: 10,
    borderRadius: 10,
  },
};
