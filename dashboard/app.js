/* =========================================================================
 * SDV 데이터 흐름 대시보드 — 애니메이션 엔진
 * 백엔드 없이 SVG + requestAnimationFrame 으로 동작합니다.
 * ====================================================================== */

(() => {
  "use strict";

  // ---- 토폴로지 정의 (viewBox 900 x 620 기준 좌표) -------------------------
  const NODES = {
    cloud: { x: 450, y: 60,  w: 220, h: 64, cls: "node-cloud", icon: "☁",
             title: "Cloud", sub: "OTA 서버 · 데이터 레이크" },
    hpc:   { x: 450, y: 230, w: 200, h: 64, cls: "node-hpc", icon: "🧠",
             title: "HPC", sub: "중앙 고성능 컴퓨터" },
    zFront:{ x: 230, y: 400, w: 150, h: 56, cls: "node-zonal", icon: "▣",
             title: "Zonal — Front", sub: "전방 존 컨트롤러" },
    zRear: { x: 670, y: 400, w: 150, h: 56, cls: "node-zonal", icon: "▣",
             title: "Zonal — Rear", sub: "후방 존 컨트롤러" },
    eCam:  { x: 110, y: 545, w: 130, h: 50, cls: "node-edge", icon: "📷",
             title: "Camera / LiDAR", sub: "Edge ECU" },
    eBrake:{ x: 320, y: 545, w: 130, h: 50, cls: "node-edge", icon: "🛞",
             title: "Brake / ADAS", sub: "Edge ECU" },
    eAirbag:{x: 580, y: 545, w: 130, h: 50, cls: "node-edge", icon: "🎈",
             title: "Airbag / IMU", sub: "Edge ECU" },
    eBody: { x: 790, y: 545, w: 130, h: 50, cls: "node-edge", icon: "🔧",
             title: "Body / Comfort", sub: "Edge ECU" },
  };

  // 노드 간 물리 링크 (양방향)
  const LINKS = [
    ["cloud", "hpc"],
    ["hpc", "zFront"],
    ["hpc", "zRear"],
    ["zFront", "eCam"],
    ["zFront", "eBrake"],
    ["zRear", "eAirbag"],
    ["zRear", "eBody"],
  ];

  // ---- 시나리오 정의 -------------------------------------------------------
  // 각 step: { from, to, type, label, size(MB), delay(ms) }
  // path 는 from→to 의 노드 경로(중간 홉 포함)
  const SCENARIOS = {
    ota: {
      name: "OTA 소프트웨어 업데이트",
      status: "업데이트 배포 중",
      steps: [
        { path: ["cloud","hpc"], type: "update", label: "FW v2.4.1", size: 320, delay: 0 },
        { path: ["cloud","hpc"], type: "update", label: "서명/검증", size: 0.2, delay: 700 },
        { path: ["hpc","zFront"], type: "update", label: "Front 패키지", size: 120, delay: 1500 },
        { path: ["hpc","zRear"],  type: "update", label: "Rear 패키지",  size: 110, delay: 1700 },
        { path: ["zFront","eCam"],   type: "update", label: "Cam FW",   size: 45, delay: 2600 },
        { path: ["zFront","eBrake"], type: "update", label: "ADAS FW",  size: 60, delay: 2800 },
        { path: ["zRear","eAirbag"], type: "update", label: "IMU FW",   size: 30, delay: 2900 },
        { path: ["zRear","eBody"],   type: "update", label: "Body FW",  size: 25, delay: 3100 },
        { path: ["eCam","zFront"],   type: "ack", label: "OK", size: 0.1, delay: 4200 },
        { path: ["eBrake","zFront"], type: "ack", label: "OK", size: 0.1, delay: 4300 },
        { path: ["eAirbag","zRear"], type: "ack", label: "OK", size: 0.1, delay: 4400 },
        { path: ["eBody","zRear"],   type: "ack", label: "OK", size: 0.1, delay: 4500 },
        { path: ["zFront","hpc"], type: "ack", label: "Zone OK", size: 0.2, delay: 5000 },
        { path: ["zRear","hpc"],  type: "ack", label: "Zone OK", size: 0.2, delay: 5100 },
        { path: ["hpc","cloud"],  type: "ack", label: "배포 완료", size: 0.5, delay: 5700 },
      ],
    },

    crash: {
      name: "충돌 이벤트 (Crash)",
      status: "⚠ 긴급 이벤트 처리",
      steps: [
        { path: ["eAirbag","zRear"], type: "event", label: "충격 감지!", size: 2, delay: 0 },
        { path: ["eCam","zFront"],   type: "event", label: "영상 버퍼", size: 48, delay: 150 },
        { path: ["eBrake","zFront"], type: "event", label: "제동 로그", size: 12, delay: 200 },
        { path: ["zRear","hpc"],  type: "event", label: "Crash 신호", size: 5, delay: 600 },
        { path: ["zFront","hpc"], type: "event", label: "센서 융합", size: 60, delay: 750 },
        { path: ["hpc","zFront"], type: "control", label: "비상정지", size: 0.3, delay: 1100 },
        { path: ["hpc","zRear"],  type: "control", label: "에어백 점화", size: 0.3, delay: 1100 },
        { path: ["zRear","eAirbag"], type: "control", label: "Deploy", size: 0.2, delay: 1500 },
        { path: ["zFront","eBrake"], type: "control", label: "Brake", size: 0.2, delay: 1500 },
        { path: ["hpc","cloud"], type: "event", label: "eCall 긴급호출", size: 8, delay: 2000 },
        { path: ["hpc","cloud"], type: "event", label: "이벤트 패키지 업로드", size: 140, delay: 2400 },
        { path: ["cloud","hpc"], type: "ack", label: "관제센터 접수", size: 0.4, delay: 4200 },
      ],
    },

    telemetry: {
      name: "정상 주행 텔레메트리",
      status: "텔레메트리 수집 중",
      steps: [
        { path: ["eCam","zFront"],   type: "telemetry", label: "차선/객체", size: 8, delay: 0 },
        { path: ["eBrake","zFront"], type: "telemetry", label: "휠속/제동", size: 3, delay: 200 },
        { path: ["eAirbag","zRear"], type: "telemetry", label: "IMU 6축", size: 2, delay: 300 },
        { path: ["eBody","zRear"],   type: "telemetry", label: "공조/도어", size: 1, delay: 400 },
        { path: ["zFront","hpc"], type: "telemetry", label: "Front 집계", size: 6, delay: 900 },
        { path: ["zRear","hpc"],  type: "telemetry", label: "Rear 집계", size: 4, delay: 1000 },
        { path: ["hpc","cloud"], type: "telemetry", label: "주행 데이터 동기화", size: 18, delay: 1600 },
        { path: ["cloud","hpc"], type: "ack", label: "수신 확인", size: 0.1, delay: 2400 },
      ],
    },

    diagnostics: {
      name: "원격 진단 (Diagnostics)",
      status: "원격 진단 수행 중",
      steps: [
        { path: ["cloud","hpc"], type: "control", label: "진단 요청", size: 0.5, delay: 0 },
        { path: ["hpc","zFront"], type: "control", label: "DTC 조회", size: 0.3, delay: 500 },
        { path: ["hpc","zRear"],  type: "control", label: "DTC 조회", size: 0.3, delay: 600 },
        { path: ["zFront","eCam"],   type: "control", label: "self-test", size: 0.2, delay: 1000 },
        { path: ["zFront","eBrake"], type: "control", label: "self-test", size: 0.2, delay: 1050 },
        { path: ["zRear","eAirbag"], type: "control", label: "self-test", size: 0.2, delay: 1100 },
        { path: ["zRear","eBody"],   type: "control", label: "self-test", size: 0.2, delay: 1150 },
        { path: ["eCam","zFront"],   type: "telemetry", label: "DTC: OK", size: 1, delay: 1700 },
        { path: ["eBrake","zFront"], type: "telemetry", label: "DTC: P0420", size: 1, delay: 1750 },
        { path: ["eAirbag","zRear"], type: "telemetry", label: "DTC: OK", size: 1, delay: 1800 },
        { path: ["eBody","zRear"],   type: "telemetry", label: "DTC: OK", size: 1, delay: 1850 },
        { path: ["zFront","hpc"], type: "telemetry", label: "Front 리포트", size: 3, delay: 2400 },
        { path: ["zRear","hpc"],  type: "telemetry", label: "Rear 리포트", size: 3, delay: 2500 },
        { path: ["hpc","cloud"], type: "telemetry", label: "진단 리포트", size: 6, delay: 3100 },
      ],
    },
  };

  const TYPE_COLOR = {
    update: "#22d3ee", event: "#f43f5e", telemetry: "#a3e635",
    control: "#f59e0b", ack: "#94a3b8",
  };

  // ---- DOM ----------------------------------------------------------------
  const svgNS = "http://www.w3.org/2000/svg";
  const gLinks = document.getElementById("links");
  const gNodes = document.getElementById("nodes");
  const gPackets = document.getElementById("packets");
  const logEl = document.getElementById("log");
  const clockEl = document.getElementById("sim-clock");
  const speedInput = document.getElementById("speed");
  const speedVal = document.getElementById("speed-val");
  const autoloop = document.getElementById("autoloop");
  const labelsToggle = document.getElementById("labels");

  const linkEls = new Map();   // "a|b" -> path element
  const nodeEls = new Map();   // id -> group element

  // ---- 상태 ---------------------------------------------------------------
  let speed = 1;
  let running = false;
  let queue = [];              // 예약된 step 들
  let packets = [];            // 활동 중 패킷
  let metrics = { packets: 0, mb: 0, latencies: [] };
  let simTime = 0;
  let lastTs = 0;
  let currentScenario = null;

  // ---- 좌표 헬퍼 ----------------------------------------------------------
  function center(id) {
    const n = NODES[id];
    return { x: n.x, y: n.y };
  }
  function linkKey(a, b) {
    return [a, b].sort().join("|");
  }
  // 노드 박스 경계에서 만나도록 가장자리 지점 계산
  function edgePoint(fromId, toId) {
    const a = NODES[fromId], b = NODES[toId];
    const dx = b.x - a.x, dy = b.y - a.y;
    const ang = Math.atan2(dy, dx);
    const hw = a.w / 2, hh = a.h / 2;
    // 박스 경계까지의 거리
    const tx = Math.abs(Math.cos(ang)) < 1e-6 ? Infinity : hw / Math.abs(Math.cos(ang));
    const ty = Math.abs(Math.sin(ang)) < 1e-6 ? Infinity : hh / Math.abs(Math.sin(ang));
    const t = Math.min(tx, ty);
    return { x: a.x + Math.cos(ang) * t, y: a.y + Math.sin(ang) * t };
  }

  // ---- 렌더링: 링크 & 노드 ------------------------------------------------
  function renderTopology() {
    LINKS.forEach(([a, b]) => {
      const p1 = edgePoint(a, b), p2 = edgePoint(b, a);
      const path = document.createElementNS(svgNS, "line");
      path.setAttribute("x1", p1.x); path.setAttribute("y1", p1.y);
      path.setAttribute("x2", p2.x); path.setAttribute("y2", p2.y);
      path.setAttribute("class", "link");
      gLinks.appendChild(path);
      linkEls.set(linkKey(a, b), path);
    });

    for (const [id, n] of Object.entries(NODES)) {
      const g = document.createElementNS(svgNS, "g");
      g.setAttribute("class", `node ${n.cls}`);
      g.style.color = strokeOf(n.cls);

      const rect = document.createElementNS(svgNS, "rect");
      rect.setAttribute("x", n.x - n.w / 2);
      rect.setAttribute("y", n.y - n.h / 2);
      rect.setAttribute("width", n.w);
      rect.setAttribute("height", n.h);
      rect.setAttribute("rx", 12);
      rect.setAttribute("class", "node-box");
      g.appendChild(rect);

      const icon = document.createElementNS(svgNS, "text");
      icon.setAttribute("x", n.x - n.w / 2 + 22);
      icon.setAttribute("y", n.y + 6);
      icon.setAttribute("class", "node-icon");
      icon.textContent = n.icon;
      g.appendChild(icon);

      const title = document.createElementNS(svgNS, "text");
      title.setAttribute("x", n.x + 12);
      title.setAttribute("y", n.y - 2);
      title.setAttribute("class", "node-title");
      title.textContent = n.title;
      g.appendChild(title);

      const sub = document.createElementNS(svgNS, "text");
      sub.setAttribute("x", n.x + 12);
      sub.setAttribute("y", n.y + 14);
      sub.setAttribute("class", "node-sub");
      sub.textContent = n.sub;
      g.appendChild(sub);

      gNodes.appendChild(g);
      nodeEls.set(id, g);
    }
  }

  function strokeOf(cls) {
    return { "node-cloud": "#3b82f6", "node-hpc": "#8b5cf6",
             "node-zonal": "#10b981", "node-edge": "#64748b" }[cls] || "#888";
  }

  // ---- 시나리오 실행 ------------------------------------------------------
  function startScenario(key) {
    reset(false);
    const sc = SCENARIOS[key];
    if (!sc) return;
    currentScenario = key;
    running = true;
    setStatus(sc.status, "running");
    logLine("system", `▶ 시나리오 시작: ${sc.name}`);
    highlightButton(key);

    // step 들을 시뮬레이션 시간 기준으로 큐에 등록
    queue = sc.steps.map(s => ({ ...s, fireAt: s.delay }));
    if (!lastTs) { lastTs = performance.now(); requestAnimationFrame(loop); }
  }

  function spawnPacket(step) {
    const path = step.path;
    // 다중 홉 경로를 세그먼트별로 펼침
    const segments = [];
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      const p1 = edgePoint(a, b), p2 = edgePoint(b, a);
      const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      segments.push({ a, b, p1, p2, len });
    }
    const totalLen = segments.reduce((s, x) => s + x.len, 0);
    // 패킷 속도: 화면상 픽셀/초 (속도 슬라이더 반영)
    const pxPerSec = 260;

    const packet = {
      step, segments, totalLen, dist: 0, pxPerSec,
      bornSim: simTime,
      color: TYPE_COLOR[step.type],
      el: null, labelEl: null,
    };

    // SVG 요소
    const c = document.createElementNS(svgNS, "circle");
    c.setAttribute("r", sizeToRadius(step.size));
    c.setAttribute("fill", packet.color);
    c.setAttribute("filter", "url(#soft)");
    c.style.color = packet.color;
    gPackets.appendChild(c);
    packet.el = c;

    if (labelsToggle.checked && step.label) {
      const t = document.createElementNS(svgNS, "text");
      t.setAttribute("class", "packet-label");
      t.textContent = step.label;
      gPackets.appendChild(t);
      packet.labelEl = t;
    }

    packets.push(packet);
    metrics.packets++;
    metrics.mb += step.size;
    updateMetrics();
    pulseNode(path[0]);

    logLine(step.type,
      `${NODES[path[0]].title.split(" ")[0]} → ${NODES[path[path.length-1]].title.split(" ")[0]} · ${step.label} (${fmtSize(step.size)})`);
  }

  function sizeToRadius(mb) {
    return Math.max(3.5, Math.min(9, 3.5 + Math.log10(mb + 1) * 3));
  }

  // ---- 메인 루프 ----------------------------------------------------------
  function loop(ts) {
    const dtReal = (ts - lastTs) / 1000;
    lastTs = ts;
    const dt = dtReal * speed;
    simTime += dt;
    clockEl.textContent = fmtClock(simTime);

    // 큐에서 발사 시점 도달한 step 처리
    const fireMs = simTime * 1000;
    queue = queue.filter(step => {
      if (fireMs >= step.fireAt) { spawnPacket(step); return false; }
      return true;
    });

    // 패킷 이동
    const stillActive = [];
    for (const p of packets) {
      p.dist += p.pxPerSec * dt;
      const pos = positionAlong(p);
      if (pos.done) {
        // 도착: 지연 기록, 도착 노드 펄스
        const last = p.segments[p.segments.length - 1].b;
        pulseNode(last);
        const latency = (simTime - p.bornSim) * 1000;
        metrics.latencies.push(latency);
        cleanupPacket(p);
        updateMetrics();
      } else {
        p.el.setAttribute("cx", pos.x);
        p.el.setAttribute("cy", pos.y);
        if (p.labelEl) {
          p.labelEl.setAttribute("x", pos.x);
          p.labelEl.setAttribute("y", pos.y - 12);
        }
        highlightLink(pos.segKey, true);
        stillActive.push(p);
      }
    }
    // 링크 하이라이트 리셋 (활성 세그먼트만 유지)
    const activeSegs = new Set(stillActive.map(p => positionAlong(p).segKey));
    for (const [key, el] of linkEls) {
      el.classList.toggle("hot", activeSegs.has(key));
    }
    packets = stillActive;

    // 종료 판정
    if (running && queue.length === 0 && packets.length === 0) {
      finishScenario();
    }

    if (running || packets.length > 0) {
      requestAnimationFrame(loop);
    } else {
      lastTs = 0;
    }
  }

  function positionAlong(p) {
    let d = p.dist;
    for (const seg of p.segments) {
      if (d <= seg.len) {
        const t = seg.len === 0 ? 1 : d / seg.len;
        return {
          x: seg.p1.x + (seg.p2.x - seg.p1.x) * t,
          y: seg.p1.y + (seg.p2.y - seg.p1.y) * t,
          segKey: linkKey(seg.a, seg.b), done: false,
        };
      }
      d -= seg.len;
    }
    return { done: true };
  }

  function cleanupPacket(p) {
    p.el.remove();
    if (p.labelEl) p.labelEl.remove();
  }

  function highlightLink(key, on) {
    const el = linkEls.get(key);
    if (el) el.classList.toggle("hot", on);
  }

  function pulseNode(id) {
    const el = nodeEls.get(id);
    if (!el) return;
    el.classList.add("pulsing");
    clearTimeout(el._pt);
    el._pt = setTimeout(() => el.classList.remove("pulsing"), 1100);
  }

  function finishScenario() {
    running = false;
    setStatus("완료 ✓", "ok");
    logLine("system", `■ 시나리오 종료: ${SCENARIOS[currentScenario]?.name || ""}`);
    highlightButton(null);
    for (const [, el] of linkEls) el.classList.remove("hot");

    if (autoloop.checked && currentScenario) {
      const key = currentScenario;
      setTimeout(() => { if (autoloop.checked) startScenario(key); }, 1200);
    }
  }

  // ---- 지표 / 로그 --------------------------------------------------------
  function updateMetrics() {
    document.getElementById("m-packets").textContent = metrics.packets;
    document.getElementById("m-throughput").textContent = metrics.mb.toFixed(1);
    const lat = metrics.latencies;
    document.getElementById("m-latency").textContent =
      lat.length ? Math.round(lat.reduce((a, b) => a + b, 0) / lat.length) : "—";
  }

  function setStatus(text, kind) {
    const el = document.getElementById("m-status");
    el.textContent = text;
    el.className = "m-val" + (kind === "ok" ? " ok" : "");
    el.style.color = kind === "running" ? "#f59e0b" : (kind === "ok" ? "" : "");
  }

  function logLine(type, msg) {
    const div = document.createElement("div");
    div.className = `log-entry ${type}`;
    div.innerHTML = `<span class="t">${fmtClock(simTime)}</span>${msg}`;
    logEl.prepend(div);
    while (logEl.children.length > 60) logEl.lastChild.remove();
  }

  function highlightButton(key) {
    document.querySelectorAll(".scenario-btn").forEach(b => {
      b.classList.toggle("active", b.dataset.scenario === key);
    });
  }

  // ---- 포맷 ---------------------------------------------------------------
  function fmtClock(sec) {
    const m = Math.floor(sec / 60);
    const s = (sec % 60);
    return `${String(m).padStart(2, "0")}:${s.toFixed(1).padStart(4, "0")}`;
  }
  function fmtSize(mb) {
    if (mb < 1) return `${Math.round(mb * 1024)} KB`;
    return `${mb} MB`;
  }

  // ---- 리셋 ---------------------------------------------------------------
  function reset(full = true) {
    running = false;
    queue = [];
    packets.forEach(cleanupPacket);
    packets = [];
    for (const [, el] of linkEls) el.classList.remove("hot");
    for (const [, el] of nodeEls) el.classList.remove("pulsing");
    highlightButton(null);
    if (full) {
      metrics = { packets: 0, mb: 0, latencies: [] };
      simTime = 0; lastTs = 0;
      updateMetrics();
      clockEl.textContent = fmtClock(0);
      setStatus("대기", "ok");
      logEl.innerHTML = "";
      logLine("system", "대시보드 초기화됨 — 시나리오를 선택하세요.");
    }
  }

  // ---- 이벤트 바인딩 ------------------------------------------------------
  document.querySelectorAll(".scenario-btn").forEach(btn => {
    btn.addEventListener("click", () => startScenario(btn.dataset.scenario));
  });
  document.getElementById("stop-btn").addEventListener("click", () => reset(true));
  speedInput.addEventListener("input", () => {
    speed = parseFloat(speedInput.value);
    speedVal.textContent = speed.toFixed(1) + "x";
  });

  // ---- 초기화 -------------------------------------------------------------
  renderTopology();
  reset(true);
})();
