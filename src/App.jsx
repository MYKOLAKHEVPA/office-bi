```jsx id="full_app_replace"
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

          <button onClick={login} style={styles.loginBtn}>
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

  const [mode, setMode] = useState("EMPLOYEES");

  const [searchEmp, setSearchEmp] = useState("");
  const [searchDept, setSearchDept] = useState("");

  const [showDeptList, setShowDeptList] = useState(false);

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

  const uniqueDepartments = useMemo(() => {
    return [...new Set(data.map((d) => d.dept).filter(Boolean))].sort();
  }, [data]);

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

  const roomDepartments = useMemo(() => {
    if (!selectedRoom) return [];

    return [
      ...new Set(
        filtered
          .filter((d) => d.room_id === selectedRoom)
          .map((d) => d.dept)
          .filter(Boolean)
      ),
    ];
  }, [selectedRoom, filtered]);

  return (
    <div style={styles.page}>
      <h2 style={{ color: "#fff" }}>
        🏢 Office BI Dashboard
      </h2>

      {/* FILTERS */}
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
            onChange={(e) =>
              setFloor(Number(e.target.value))
            }
            style={styles.select}
          >
            {[1,2,3,4,5,6,7,8,9].map((f) => (
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

        {/* polished department dropdown */}
        <div style={styles.deptWrap}>
          <input
            placeholder="Search department..."
            value={searchDept}
            onFocus={() => setShowDeptList(true)}
            onChange={(e) => {
              setSearchDept(e.target.value);
              setShowDeptList(true);
            }}
            style={styles.inputSmall}
          />

          {searchDept && (
            <button
              onClick={() => {
                setSearchDept("");
                setShowDeptList(true);
              }}
              style={styles.clearBtn}
            >
              ✕
            </button>
          )}

          {showDeptList && (
            <div style={styles.dropdown}>
              <div style={styles.dropdownHeader}>
                Departments
              </div>

              {uniqueDepartments
                .filter((d) =>
                  d
                    .toLowerCase()
                    .includes(searchDept.toLowerCase())
                )
                .slice(0, 30)
                .map((dept, i) => (
                  <div
                    key={i}
                    style={styles.dropdownItem}
                    onMouseDown={() => {
                      setSearchDept(dept);
                      setShowDeptList(false);
                    }}
                  >
                    <span style={styles.dot}></span>
                    {dept}
                  </div>
                ))}

              {uniqueDepartments.filter((d) =>
                d
                  .toLowerCase()
                  .includes(searchDept.toLowerCase())
              ).length === 0 && (
                <div style={styles.noResults}>
                  No departments found
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => setMode("EMPLOYEES")}
          style={styles.modeBtn}
        >
          Працівники
        </button>

        <button
          onClick={() => setMode("DEPTS")}
          style={styles.modeBtn}
        >
          Департаменти
        </button>
      </div>

      {/* KPI */}
      <div style={styles.kpiRow}>
        <Kpi title="Free" val={kpi.free} />
        <Kpi title="Occupied" val={kpi.occ} />
        <Kpi title="Other" val={kpi.other} />
        <Kpi title="Total" val={kpi.total} />
      </div>

      {/* MAP */}
      <div style={styles.mapWrap}>
        <svg width={svgW} height={svgH}>
          <rect
            width={svgW}
            height={svgH}
            fill="#0f172a"
          />

          {rooms.map((room, i) => {
            const x = 20 + (i % cols) * cellW;
            const y =
              20 + Math.floor(i / cols) * cellH;

            const free = room.seats.filter(
              (s) => s.status === "free"
            ).length;

            const occ = room.seats.filter(
              (s) => s.status === "occupied"
            ).length;

            const other =
              room.seats.length - free - occ;

            return (
              <g key={room.room_id}>
                <rect
                  x={x}
                  y={y}
                  width="220"
                  height="130"
                  rx="14"
                  fill="#1e293b"
                  stroke="#334155"
                  onClick={() =>
                    setSelectedRoom(room.room_id)
                  }
                  style={{ cursor: "pointer" }}
                />

                <text
                  x={x + 12}
                  y={y + 18}
                  fill="#fff"
                  fontSize="13"
                  fontWeight="bold"
                >
                  Каб. {room.room_id}
                </text>

                <text
                  x={x + 12}
                  y={y + 40}
                  fill="#22c55e"
                >
                  🟢 {free}
                </text>

                <text
                  x={x + 12}
                  y={y + 58}
                  fill="#ef4444"
                >
                  🔴 {occ}
                </text>

                <text
                  x={x + 12}
                  y={y + 76}
                  fill="#cbd5e1"
                >
                  ⚪ {other}
                </text>

                {room.seats.map((seat, idx) => {
                  const sx =
                    x + 90 + (idx % 6) * 18;

                  const sy =
                    y +
                    28 +
                    Math.floor(idx / 6) * 18;

                  const active =
                    selectedSeat?.seat_id ===
                    seat.seat_id;

                  return (
                    <rect
                      key={seat.seat_id}
                      x={sx}
                      y={sy}
                      width="12"
                      height="12"
                      rx="3"
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSeat(seat);
                        setSelectedRoom(
                          room.room_id
                        );
                      }}
                      style={{ cursor: "pointer" }}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      {/* selected seat */}
      {selectedSeat && (
        <div style={styles.panel}>
          <b>{selectedSeat.seat_id}</b>
          <div>{selectedSeat.name}</div>
          <div>{selectedSeat.dept}</div>
        </div>
      )}

      {/* room details */}
      {selectedRoom && (
        <div style={styles.panel}>
          <h3>Кабінет {selectedRoom}</h3>

          {mode === "EMPLOYEES" &&
            filtered
              .filter(
                (d) => d.room_id === selectedRoom
              )
              .map((d, i) => (
                <div key={i}>
                  {d.seat_id} — {d.name}
                </div>
              ))}

          {mode === "DEPTS" &&
            roomDepartments.map((d, i) => (
              <div key={i}>{d}</div>
            ))}
        </div>
      )}
    </div>
  );
}

function Kpi({ title, val }) {
  return (
    <div style={styles.kpi}>
      <div>{title}</div>
      <b>{val}</b>
    </div>
  );
}

const styles = {
  page: {
    padding: 12,
    minHeight: "100vh",
    fontFamily: "Arial",
    background:
      "linear-gradient(135deg,#0f172a,#1e293b,#334155)",
  },

  controls: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 12,
    position: "relative",
    zIndex: 9999,
  },

  deptWrap: {
    position: "relative",
    minWidth: 260,
  },

  select: {
    padding: 10,
    borderRadius: 10,
  },

  inputSmall: {
    padding: "10px 38px 10px 12px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    minWidth: 260,
    background: "#fff",
  },

  clearBtn: {
    position: "absolute",
    right: 8,
    top: 8,
    border: "none",
    background: "transparent",
    cursor: "pointer",
  },

  dropdown: {
    position: "absolute",
    top: 46,
    left: 0,
    width: "100%",
    maxHeight: 320,
    overflowY: "auto",
    background: "#fff",
    borderRadius: 14,
    boxShadow: "0 20px 40px rgba(0,0,0,.22)",
    border: "1px solid #e5e7eb",
    zIndex: 10000,
  },

  dropdownHeader: {
    padding: "10px 12px",
    fontSize: 12,
    fontWeight: 700,
    color: "#64748b",
    borderBottom: "1px solid #eef2f7",
    background: "#f8fafc",
    position: "sticky",
    top: 0,
  },

  dropdownItem: {
    padding: "11px 12px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 8,
    borderBottom: "1px solid #f3f4f6",
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    background: "#2563eb",
    display: "inline-block",
  },

  noResults: {
    padding: 12,
    color: "#94a3b8",
  },

  modeBtn: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
  },

  kpiRow: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(120px,1fr))",
    gap: 10,
    marginBottom: 12,
    position: "relative",
    zIndex: 1,
  },

  kpi: {
    background: "#fff",
    borderRadius: 12,
    padding: 12,
  },

  mapWrap: {
    background: "#fff",
    borderRadius: 14,
    padding: 10,
    overflow: "auto",
  },

  panel: {
    marginTop: 12,
    background: "#fff",
    padding: 12,
    borderRadius: 12,
  },

  loginBg: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background:
      "linear-gradient(135deg,#0f172a,#1e293b,#334155)",
  },

  loginCard: {
    background: "#fff",
    padding: 24,
    borderRadius: 16,
    width: 320,
  },

  input: {
    width: "100%",
    padding: 10,
    borderRadius: 10,
    border: "1px solid #ddd",
    marginBottom: 10,
  },

  loginBtn: {
    width: "100%",
    padding: 10,
    borderRadius: 10,
    border: "none",
    background: "#2563eb",
    color: "#fff",
  },

  brand: {
    marginTop: 15,
    textAlign: "center",
    color: "#64748b",
    fontSize: 13,
  },
};
```
