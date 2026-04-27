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
          <h1>Office BI</h1>

          <input
            type="password"
            placeholder="Password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            style={styles.input}
          />

          <button style={styles.btn} onClick={login}>
            Enter
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

  const [searchName, setSearchName] = useState("");
  const [searchDept, setSearchDept] = useState("");

  const [detailMode, setDetailMode] =
    useState("EMPLOYEES");

  const [selectedRoom, setSelectedRoom] =
    useState(null);

  const [selectedSeat, setSelectedSeat] =
    useState(null);

  useEffect(() => {
    fetch(SHEET_URL)
      .then((r) => r.text())
      .then((txt) => {
        const rows = txt
          .split("\n")
          .filter(Boolean);

        const parsed = rows.slice(1).map((r) => {
          const c = r.split(",");

          return {
            floor: Number(c[0]),
            room_id: c[1],
            departments: c[3],
            seat_id: c[4],
            status: (
              c[5] || "other"
            ).toLowerCase(),
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

      const okName =
        !searchName ||
        d.last_name
          .toLowerCase()
          .includes(
            searchName.toLowerCase()
          );

      const okDept =
        !searchDept ||
        (d.departments || "")
          .toLowerCase()
          .includes(
            searchDept.toLowerCase()
          );

      return (
        okFloor &&
        okName &&
        okDept
      );
    });
  }, [
    data,
    floorMode,
    floor,
    searchName,
    searchDept,
  ]);

  const rooms = useMemo(() => {
    const map = {};

    filtered.forEach((r) => {
      if (!map[r.room_id]) {
        map[r.room_id] = {
          room_id: r.room_id,
          seats: [],
          deps: new Set(),
        };
      }

      map[r.room_id].seats.push(r);

      if (r.departments)
        map[r.room_id].deps.add(
          r.departments
        );
    });

    return Object.values(map).map(
      (r) => ({
        ...r,
        departments:
          Array.from(r.deps),
      })
    );
  }, [filtered]);

  const activeRoom = rooms.find(
    (r) =>
      r.room_id ===
      selectedRoom
  );

  const cols = Math.max(
    2,
    Math.ceil(
      Math.sqrt(rooms.length)
    )
  );

  const cellW = 250;
  const cellH = 180;

  const svgW =
    cols * cellW + 40;

  const svgH =
    Math.ceil(
      rooms.length / cols
    ) *
      cellH +
    40;

  const busy =
    filtered.filter(
      (x) =>
        x.status ===
        "occupied"
    ).length;

  const busyPct =
    filtered.length > 0
      ? Math.round(
          (busy /
            filtered.length) *
            100
        )
      : 0;

  return (
    <div style={styles.page}>
      <h1>
        🏢 Office BI Dashboard
      </h1>

      {/* controls */}
      <div style={styles.top}>
        <button
          style={styles.btnSmall}
          onClick={() =>
            setFloorMode("ALL")
          }
        >
          All Floors
        </button>

        <button
          style={styles.btnSmall}
          onClick={() =>
            setFloorMode(
              "ONE"
            )
          }
        >
          One Floor
        </button>

        {floorMode ===
          "ONE" && (
          <select
            value={floor}
            style={
              styles.input2
            }
            onChange={(e) =>
              setFloor(
                Number(
                  e.target.value
                )
              )
            }
          >
            {[1,2,3,4,5,6,7,8,9].map(
              (f) => (
                <option
                  key={f}
                  value={f}
                >
                  Floor {f}
                </option>
              )
            )}
          </select>
        )}

        <input
          style={styles.input2}
          placeholder="Пошук прізвища"
          value={searchName}
          onChange={(e) =>
            setSearchName(
              e.target.value
            )
          }
        />

        <input
          style={styles.input2}
          placeholder="Пошук департаменту"
          value={searchDept}
          onChange={(e) =>
            setSearchDept(
              e.target.value
            )
          }
        />

        <button
          style={styles.btnSmall}
          onClick={() =>
            setDetailMode(
              "EMPLOYEES"
            )
          }
        >
          Працівники
        </button>

        <button
          style={styles.btnSmall}
          onClick={() =>
            setDetailMode(
              "DEPARTMENTS"
            )
          }
        >
          Департаменти
        </button>
      </div>

      {/* graph */}
      <div style={styles.graph}>
        Завантаженість{" "}
        {busyPct}%
        <div style={styles.bar}>
          <div
            style={{
              ...styles.fill,
              width: `${busyPct}%`,
            }}
          />
        </div>
      </div>

      {/* map */}
      <div style={styles.map}>
        <svg
          width={svgW}
          height={svgH}
        >
          <rect
            width={svgW}
            height={svgH}
            fill="#eef2ff"
          />

          {rooms.map((r, i) => {
            const x =
              20 +
              (i % cols) *
                cellW;

            const y =
              20 +
              Math.floor(
                i / cols
              ) *
                cellH;

            return (
              <g
                key={
                  r.room_id
                }
              >
                <rect
                  x={x}
                  y={y}
                  width="220"
                  height="130"
                  rx="18"
                  fill={
                    selectedRoom ===
                    r.room_id
                      ? "#2563eb"
                      : "#334155"
                  }
                  style={{
                    cursor:
                      "pointer",
                  }}
                  onClick={() => {
                    setSelectedRoom(
                      r.room_id
                    );
                    setSelectedSeat(
                      null
                    );
                  }}
                />

                <text
                  x={x + 12}
                  y={y + 20}
                  fill="#fff"
                  fontWeight="700"
                >
                  {r.room_id}
                </text>

                {r.seats.map(
                  (
                    s,
                    idx
                  ) => {
                    const sx =
                      x +
                      12 +
                      (idx %
                        10) *
                        19;

                    const sy =
                      y +
                      40 +
                      Math.floor(
                        idx /
                          10
                      ) *
                        18;

                    const active =
                      selectedSeat?.seat_id ===
                      s.seat_id;

                    return (
                      <rect
                        key={
                          s.seat_id
                        }
                        x={sx}
                        y={sy}
                        width="13"
                        height="13"
                        rx="4"
                        fill={
                          s.status ===
                          "free"
                            ? "#22c55e"
                            : s.status ===
                              "occupied"
                            ? "#ef4444"
                            : "#cbd5e1"
                        }
                        style={{
                          cursor:
                            "pointer",
                          stroke:
                            active
                              ? "#facc15"
                              : "none",
                          strokeWidth:
                            active
                              ? 3
                              : 0,
                        }}
                        onClick={() => {
                          setSelectedSeat(
                            s
                          );
                          setSelectedRoom(
                            r.room_id
                          );
                        }}
                      />
                    );
                  }
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* selected employee */}
      {selectedSeat && (
        <div
          style={
            styles.person
          }
        >
          <b>
            {
              selectedSeat.seat_id
            }
          </b>
          <div>
            {
              selectedSeat.last_name
            }
          </div>
          <div>
            {
              selectedSeat.departments
            }
          </div>
          <div>
            {
              selectedSeat.status
            }
          </div>
        </div>
      )}

      {/* room details */}
      {activeRoom && (
        <div style={styles.panel}>
          <h3>
            Кабінет{" "}
            {
              activeRoom.room_id
            }
          </h3>

          {detailMode ===
          "EMPLOYEES"
            ? activeRoom.seats.map(
                (
                  s,
                  i
                ) => (
                  <div
                    key={i}
                    style={
                      styles.row
                    }
                  >
                    {
                      s.seat_id
                    }{" "}
                    —{" "}
                    {
                      s.last_name
                    }
                  </div>
                )
              )
            : activeRoom.departments.map(
                (
                  d,
                  i
                ) => (
                  <div
                    key={i}
                    style={
                      styles.row
                    }
                  >
                    {d}
                  </div>
                )
              )}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    padding: 14,
    minHeight:
      "100vh",
    fontFamily:
      "Arial",
    background:
      "radial-gradient(circle at top,#dbeafe,#eff6ff,#f8fafc)",
  },

  loginBg: {
    minHeight:
      "100vh",
    display: "flex",
    justifyContent:
      "center",
    alignItems:
      "center",
    background:
      "linear-gradient(135deg,#1d4ed8,#60a5fa)",
  },

  loginCard: {
    width: 330,
    padding: 30,
    borderRadius: 22,
    background:
      "rgba(255,255,255,.18)",
    color: "#fff",
  },

  input: {
    width: "100%",
    padding: 10,
    borderRadius: 12,
    border: 0,
    marginBottom: 10,
  },

  input2: {
    padding: 10,
    borderRadius: 12,
    border:
      "1px solid #cbd5e1",
  },

  btn: {
    width: "100%",
    padding: 10,
    borderRadius: 12,
    border: 0,
    background:
      "#22c55e",
    color: "#fff",
  },

  btnSmall: {
    padding:
      "10px 14px",
    borderRadius: 12,
    border: 0,
    background:
      "#2563eb",
    color: "#fff",
    cursor: "pointer",
  },

  brand: {
    marginTop: 14,
    fontSize: 12,
  },

  top: {
    display: "flex",
    gap: 10,
    flexWrap:
      "wrap",
    marginBottom: 14,
  },

  graph: {
    padding: 14,
    borderRadius: 16,
    background:
      "#fff",
    marginBottom: 14,
  },

  bar: {
    height: 10,
    background:
      "#e5e7eb",
    borderRadius: 8,
    marginTop: 6,
    overflow:
      "hidden",
  },

  fill: {
    height: "100%",
    background:
      "linear-gradient(90deg,#22c55e,#f59e0b,#ef4444)",
  },

  map: {
    overflow: "auto",
    background:
      "#fff",
    padding: 12,
    borderRadius: 18,
  },

  person: {
    marginTop: 14,
    padding: 16,
    borderRadius: 18,
    background:
      "#fff7ed",
  },

  panel: {
    marginTop: 14,
    padding: 16,
    borderRadius: 18,
    background:
      "#ffffff",
  },

  row: {
    padding: 8,
    borderBottom:
      "1px solid #eee",
  },
};
