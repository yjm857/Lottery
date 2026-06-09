# SDV 데이터 흐름 대시보드

SDV(Software-Defined Vehicle) 아키텍처에서 **소프트웨어 업데이트**나 **충돌 같은 이벤트**가
발생했을 때 **Cloud ↔ HPC ↔ Zonal ECU ↔ Edge ECU** 사이의 데이터 흐름을
실시간 애니메이션으로 보여주는 동적 대시보드입니다.

별도의 서버/빌드 없이 **브라우저에서 바로 실행**됩니다. (순수 HTML + CSS + Vanilla JS + SVG)

## 실행 방법

가장 간단하게는 `dashboard/index.html` 파일을 더블클릭해서 브라우저로 엽니다.

또는 로컬 서버로 실행:

```bash
cd dashboard
python -m http.server 8000
# 브라우저에서 http://localhost:8000 접속
```

## 구성

| 영역 | 설명 |
|------|------|
| 좌측 패널 | 시나리오 선택, 재생 속도, 자동 반복, 범례 |
| 중앙 무대 | SVG 토폴로지 위에서 데이터 패킷이 노드 사이를 이동 |
| 우측 패널 | 전송 패킷 수 · 전송량(MB) · 평균 지연 · 이벤트 로그 |

### 토폴로지

```
                  ☁ Cloud  (OTA 서버 · 데이터 레이크)
                     │
                  🧠 HPC   (중앙 고성능 컴퓨터)
                 ┌───┴───┐
            ▣ Zonal-Front   ▣ Zonal-Rear
            ┌────┴────┐     ┌────┴────┐
        📷 Cam/LiDAR 🛞Brake 🎈Airbag/IMU 🔧Body
          (Edge ECU)  ...    (Edge ECU)
```

## 시나리오

1. **OTA 소프트웨어 업데이트** — Cloud에서 펌웨어를 받아 HPC가 검증 후
   Zonal을 거쳐 각 Edge ECU로 배포하고, ACK가 역방향으로 회수됩니다.
2. **충돌 이벤트 (Crash)** — Edge 센서가 충격을 감지 → Zonal → HPC로 긴급 전파,
   HPC가 비상 제어 명령을 하달하고 eCall + 이벤트 데이터를 Cloud로 업로드합니다.
3. **정상 주행 텔레메트리** — 주기적 센서 수집 → 존 집계 → Cloud 동기화.
4. **원격 진단 (Diagnostics)** — Cloud 진단 요청 → ECU self-test → 리포트 회신.

## 커스터마이즈

- 토폴로지/노드: `app.js` 의 `NODES`, `LINKS`
- 시나리오 단계: `app.js` 의 `SCENARIOS` (각 step의 `path`, `type`, `label`, `size`, `delay`)
- 데이터 유형별 색상: `app.js` 의 `TYPE_COLOR` 와 `styles.css`

데이터 유형은 펌웨어/업데이트, 이벤트/충돌, 텔레메트리/센서, 제어/명령, ACK로 구분되어
색상으로 표시됩니다.
