import React, { useEffect, useMemo, useState } from "react";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1DBGfVpfnsaI1mAlF9GrAupQL7FiQTKnQLohOB1rqUc0/export?format=csv";

const PASSWORD = "312";

export default function App() {
  const [auth, setAuth] = useState(false);
  const [pass, setPass] = useState("");

  useEffect(() => {
    if (localStorage.getItem("office_auth") === "ok") {
      setAuth(true);
    }
  }, []);

  const login = () => {
    if (pass === PASSWORD) {
      localStorage.setItem("office_auth", "ok");
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

  const [floorMode, setFloorMode] = useState("ALL");
  const [floor, setFloor] = useState(1);

  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);

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
            departments: c[3],
            seat_id: c[4],
            status: (c[5] || "other").toLowerCase(),
            last_name: c[6] || "",
          };
        });

        setData(parsed);
      });
  }, []);

  const filtered = useMemo(() => {
    return data.filter((d) => {
      const okFloor =
        floorMode === "ALL"
          ? true
          : d.floor === floor;

      return okFloor;
    });
  }, [data, floorMode, floor]);

  // KPI (КРІ повернули)
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
        map[r.room_id] = {
          room_id: r.room_id,
          seats: [],
        };
      }

      map[r.room_id].seats.push(r);
    });

    return Object.values(map);
  }, [filtered]);

  const cols = Math.max(2, Math.ceil(Math.sqrt(rooms.length)));
  const cellW = 240;
  const cellH = 160;

  const svgW = cols * cellW + 40;
  const svgH = Math.ceil(rooms.length / cols) * cellH + 40;

  return (
    <div style={styles.page}>
      <h2>🏢 Office Dashboard</h2>

      {/* KPI BAR */}
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

            const stats = {
              free: r.seats.filter((s) => s.status === "free").length,
              occ: r.seats.filter((s) => s.status === "occupied").length,
              other: r.seats.filter((s) => s.status === "other").length,
            };

            return (
              <g key={r.room_id}>
                {/* ROOM BOX */}
                <rect
                  x={x}
                  y={y}
                  width="220"
                  height="120"
                  rx="16"
                  fill="#1f2937"
                  onClick={() => setSelectedRoom(r.room_id)}
                  style={{ cursor: "pointer" }}
                />

                {/* ROOM ID */}
                <text x={x + 10} y={y + 18} fill="#fff" fontSize="12">
                  {r.room_id}
                </text>

                {/* 🔥 3 ЧИСЛА НА КОЖНОМУ КВАДРАТІ */}
                <text x={x + 10} y={y + 45} fill="#22c55e" fontSize="11">
                  🟢 {stats.free}
                </text>

                <text x={x + 10} y={y + 65} fill="#ef4444" fontSize="11">
                  🔴 {stats.occ}
                </text>

                <text x={x + 10} y={y + 85} fill="#94a3b8" fontSize="11">
                  ⚪ {stats.other}
                </text>

                {/* SEATS */}
                {r.seats.map((s, idx) => {
                  const sx = x + 120 + (idx % 6) * 14;
                  const sy = y + 30 + Math.floor(idx / 6) * 14;

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
                      onClick={() => setSelectedSeat(s)}
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
              <div key={i}>
                {d.seat_id} — {d.last_name}
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
  page: {
    fontFamily: "Arial",
    padding: 12,
    background: "linear-gradient(#e0f2fe,#f8fafc)",
    minHeight: "100vh",
  },

  loginBg: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#0f172a",
  },

  loginCard: {
    background: "white",
    padding: 20,
    borderRadius: 12,
    width: 280,
  },

  input: {
    width: "100%",
    padding: 8,
    marginTop: 10,
  },

  btn: {
    width: "100%",
    marginTop: 10,
    padding: 8,
    background: "#2563eb",
    color: "white",
    border: 0,
  },

  brand: {
    marginTop: 10,
    fontSize: 11,
    opacity: 0.7,
  },

  kpiRow: {
    display: "flex",
    gap: 10,
    marginBottom: 10,
  },

  kpi: {
    background: "white",
    padding: 8,
    borderRadius: 10,
    minWidth: 80,
  },

  map: {
    background: "white",
    borderRadius: 12,
    padding: 10,
  },

  panel: {
    marginTop: 10,
    background: "white",
    padding: 10,
    borderRadius: 10,
  },
};
