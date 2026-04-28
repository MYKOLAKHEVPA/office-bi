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
          <h2 style={{ marginTop: 0 }}>Office BI</h2>

          <input
            type="password"
            placeholder="Password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            style={styles.input}
          />

          <button onClick={login} style={styles.loginBtn}>
            Login
          </button>

          <div style={styles.brand}>
            <div>Департамент управління інфраструктурою</div>
            <div style={{ fontSize: 12 }}>Розробник Микола Хевпа</div>
          </div>
        </div>
      </div>
    );
  }

  return <Dashboard />;
}

function Dashboard() {
  const [data, setData] = useState([]);
  const [mode, setMode] = useState("EMPLOYEES");
  const [floorMode, setFloorMode] = useState("ALL");
  const [floor, setFloor] = useState(1);

  const [searchEmp, setSearchEmp] = useState("");
  const [searchDept, setSearchDept] = useState("");

  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);

  useEffect(() => {
    fetch(SHEET_URL)
      .then((r) => r.text())
      .then((txt) => {
        const rows = txt.split("\n").filter(Boolean);

        const parsed = rows.slice(1).map((row) => {
          const c = row.split(",");

          return {
            floor: Number(c[0]),
            room_id: c[1],
            dept: c[3] || "",
            seat_id: c[4] || "",
            status: (c[5] || "other").toLowerCase(),
            name: c[6] || "",
          };
        });

        setData(parsed);
      });
  }, []);

  const filtered = useMemo(() => {
    return data.filter((d) => {
      const okFloor =
        floorMode === "ALL" ? true : d.floor === floor;

      const okEmp =
        !searchEmp ||
        d.name.toLowerCase().includes(searchEmp.toLowerCase());

      const okDept =
        !searchDept ||
        d.dept.toLowerCase().includes(searchDept.toLowerCase());

      return okFloor && okEmp && okDept;
    });
  }, [data, floorMode, floor, searchEmp, searchDept]);

  const rooms = useMemo(() => {
    const map = {};

    filtered.forEach((r) => {
      if (!map[r.room_id]) {
        map[r.room_id] = {
          room_id: r.room_id,
          seats: [],
        };
      }

      map[r.room_id].seats.push(r);
    });

    return Object.values(map);
  }, [filtered]);

  const kpi = useMemo(() => {
    let free = 0,
      occ = 0,
      other = 0;

    filtered.forEach((d) => {
      if (d.status === "free") free++;
      else if (d.status === "occupied") occ++;
      else other++;
    });

    return {
      free,
      occ,
      other,
      total: filtered.length,
    };
  }, [filtered]);

  const cols = Math.max(2, Math.ceil(Math.sqrt(rooms.length)));
  const cellW = 270;
  const cellH = 190;

  const svgW = cols * cellW + 40;
  const svgH = Math.ceil(rooms.length / cols) * cellH + 40;

  return (
    <div style={styles.page}>
      <h2 style={{ marginTop: 0 }}>🏢 Office BI Dashboard</h2>

      {/* CONTROLS */}
      <div style={styles.controls}>
        <select
          value={floorMode}
          onChange={(e) => setFloorMode(e.target.value)}
          style={styles.select}
        >
          <option value="ALL">All Floors</option>
          <option value="ONE">One Floor</option>
        </select>

        {floorMode === "ONE" && (
          <select
            value={floor}
            onChange={(e) => setFloor(Number(e.target.value))}
            style={styles.select}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        )}

        <input
          placeholder="Search employee..."
          value={searchEmp}
          onChange={(e) => setSearchEmp(e.target.value)}
          style={styles.inputSmall}
        />

        <input
          placeholder="Search department..."
          value={searchDept}
          onChange={(e) => setSearchDept(e.target.value)}
          style={styles.inputSmall}
        />

        <button
          onClick={() => setMode("EMPLOYEES")}
          style={{
            ...styles.modeBtn,
            background:
              mode === "EMPLOYEES" ? "#2563eb" : "#e5e7eb",
            color: mode === "EMPLOYEES" ? "#fff" : "#111",
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
            color: mode === "DEPTS" ? "#fff" : "#111",
          }}
        >
          Департаменти
        </button>
      </div>

      {/* KPI */}
      <div style={styles.kpiRow}>
        <Kpi title="Free" val={kpi.free} color="#22c55e" />
        <Kpi title="Occupied" val={kpi.occ} color="#ef4444" />
        <Kpi title="Other" val={kpi.other} color="#94a3b8" />
        <Kpi title="Total" val={kpi.total} color="#2563eb" />
      </div>

      {/* 3D MAP */}
      <div style={styles.mapWrap}>
        <svg width={svgW} height={svgH}>
          <defs>
            <linearGradient id="roomFront" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="100%" stopColor="#111827" />
            </linearGradient>

            <linearGradient id="roomTop" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6b7280" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>

            <linearGradient id="roomSide" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            <filter id="shadow">
              <feDropShadow
                dx="0"
                dy="6"
                stdDeviation="5"
                floodOpacity="0.35"
              />
            </filter>
          </defs>

          <rect
            width={svgW}
            height={svgH}
            fill="#eef2ff"
          />

          {rooms.map((room, i) => {
            const x = 20 + (i % cols) * cellW;
            const y = 25 + Math.floor(i / cols) * cellH;

            const free = room.seats.filter(
              (s) => s.status === "free"
            ).length;

            const occ = room.seats.filter(
              (s) => s.status === "occupied"
            ).length;

            const other = room.seats.length - free - occ;

            return (
              <g key={room.room_id}>
                {/* top */}
                <polygon
                  points={`${x},${y} ${x + 20},${y - 14} ${
                    x + 220
                  },${y - 14} ${x + 200},${y}`}
                  fill="url(#roomTop)"
                />

                {/* side */}
                <polygon
                  points={`${x + 200},${y} ${
                    x + 220
                  },${y - 14} ${x + 220},${y + 120} ${
                    x + 200
                  },${y + 134}`}
                  fill="url(#roomSide)"
                />

                {/* front */}
                <rect
                  x={x}
                  y={y}
                  width="200"
                  height="120"
                  rx="12"
                  fill="url(#roomFront)"
                  filter="url(#shadow)"
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedRoom(room.room_id)}
                />

                {/* room id */}
                <text
                  x={x + 12}
                  y={y + 18}
                  fill="#fff"
                  fontSize="13"
                  fontWeight="bold"
                >
                  Каб. {room.room_id}
                </text>

                {/* 3 цифри */}
                <text
                  x={x + 12}
                  y={y + 42}
                  fill="#22c55e"
                  fontSize="12"
                >
                  🟢 {free}
                </text>

                <text
                  x={x + 12}
                  y={y + 60}
                  fill="#ef4444"
                  fontSize="12"
                >
                  🔴 {occ}
                </text>

                <text
                  x={x + 12}
                  y={y + 78}
                  fill="#cbd5e1"
                  fontSize="12"
                >
                  ⚪ {other}
                </text>

                {/* seats */}
                {room.seats.map((seat, idx) => {
                  const sx =
                    x + 95 + (idx % 6) * 15;
                  const sy =
                    y + 28 + Math.floor(idx / 6) * 15;

                  const active =
                    selectedSeat?.seat_id ===
                    seat.seat_id;

                  return (
                    <rect
                      key={seat.seat_id}
                      x={sx}
                      y={sy}
                      width="11"
                      height="11"
                      rx="2"
                      fill={
                        seat.status === "free"
                          ? "#22c55e"
                          : seat.status ===
                            "occupied"
                          ? "#ef4444"
                          : "#94a3b8"
                      }
                      stroke={
                        active ? "#facc15" : "none"
                      }
                      strokeWidth="2"
                      style={{
                        cursor: "pointer",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSeat(seat);
                        setSelectedRoom(room.room_id);
                      }}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      {/* SELECTED EMPLOYEE */}
      {selectedSeat && (
        <div style={styles.highlightBox}>
          <b>Місце: {selectedSeat.seat_id}</b>
          <div>{selectedSeat.name}</div>
          <div>{selectedSeat.dept}</div>
        </div>
      )}

      {/* DETAILS */}
      {selectedRoom && (
        <div style={styles.panel}>
          <h3 style={{ marginTop: 0 }}>
            Кабінет {selectedRoom}
          </h3>

          {filtered
            .filter((d) => d.room_id === selectedRoom)
            .map((d, i) => (
              <div key={i} style={styles.row}>
                {mode === "EMPLOYEES"
                  ? `${d.seat_id} — ${d.name}`
                  : `${d.seat_id} — ${d.dept}`}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function Kpi({ title, val, color }) {
  return (
    <div
      style={{
        ...styles.kpi,
        borderLeft: `5px solid ${color}`,
      }}
    >
      <div style={{ fontSize: 12 }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>
        {val}
      </div>
    </div>
  );
}

const styles = {
  page: {
    fontFamily: "Arial",
    padding: 12,
    background: "#f8fafc",
    minHeight: "100vh",
  },

  controls: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 12,
  },

  select: {
    padding: 8,
    borderRadius: 8,
  },

  inputSmall: {
    padding: 8,
    borderRadius: 8,
    border: "1px solid #cbd5e1",
  },

  modeBtn: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
  },

  kpiRow: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(120px,1fr))",
    gap: 10,
    marginBottom: 12,
  },

  kpi: {
    background: "#fff",
    borderRadius: 12,
    padding: 10,
    boxShadow: "0 6px 14px rgba(0,0,0,.08)",
  },

  mapWrap: {
    background: "#fff",
    borderRadius: 14,
    padding: 10,
    overflow: "auto",
    boxShadow: "0 10px 24px rgba(0,0,0,.08)",
  },

  highlightBox: {
    marginTop: 12,
    background: "#dbeafe",
    padding: 12,
    borderRadius: 12,
    boxShadow: "0 6px 16px rgba(37,99,235,.18)",
  },

  panel: {
    marginTop: 12,
    background: "#fff",
    padding: 12,
    borderRadius: 12,
    boxShadow: "0 8px 20px rgba(0,0,0,.08)",
  },

  row: {
    padding: "6px 0",
    borderBottom: "1px solid #eee",
  },

  loginBg: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background:
      "linear-gradient(135deg,#dbeafe,#eef2ff,#f8fafc)",
  },

  loginCard: {
    background: "#fff",
    padding: 24,
    borderRadius: 16,
    width: 320,
    boxShadow: "0 15px 35px rgba(0,0,0,.12)",
  },

  input: {
    width: "100%",
    padding: 10,
    borderRadius: 8,
    border: "1px solid #ddd",
    marginBottom: 10,
  },

  loginBtn: {
    width: "100%",
    padding: 10,
    borderRadius: 8,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 700,
  },

  brand: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 13,
    color: "#64748b",
  },
};
