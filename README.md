# Nexora RetailIQ — Edge-Native Retail Operations Copilot

![Qualcomm QCS / NPU](https://img.shields.io/badge/Hardware-Qualcomm_QCS_/_NPU-red?style=for-the-badge&logo=qualcomm)
![YOLOv8-Retail](https://img.shields.io/badge/Vision-YOLOv8--Retail-yellow?style=for-the-badge&logo=opencv)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi)
![React + Vite](https://img.shields.io/badge/Frontend-React_+_Vite-61DAFB?style=for-the-badge&logo=react)
![TailwindCSS](https://img.shields.io/badge/Styling-TailwindCSS-06B6D4?style=for-the-badge&logo=tailwindcss)
![On-Device Ollama](https://img.shields.io/badge/LLM-On--Device_Ollama-black?style=for-the-badge&logo=ollama)

**Nexora RetailIQ** is a 100% on-device, low-latency computer vision and LLM copilot. It eliminates checkout bottlenecks, monitors shelf inventory, and automates restock dispatch completely at the edge—meaning zero cloud dependencies, complete privacy compliance, and instant responsiveness.

---

##  Core Architectural Highlights

-  **On-Device Vision (OpenCV + YOLOv8)**: Multi-lane queue detection, boundary polygon shelf monitoring, and bounding box generation at ~30 FPS directly on edge silicon.
-  **Predictive Staffing & Alert Trigger Engine**: Dynamic counter allocation suggestions generated proactively *before* queue overflow occurs, preventing customer walkaways.
-  **Manager Copilot (Ollama LLM)**: A responsive natural-language interface that analyzes store telemetry, translates raw trigger logs into actionable insights, and coordinates dispatch directly with floor staff.
-  **Zero-Cloud / Edge-Native**: Delivers ultra-low latency inference (<150ms), operates entirely offline, and maintains strict data privacy compliance by keeping video feeds out of the cloud.

---

##  Frontend Dashboard Breakdown (Multi-Tab UI)

The React dashboard is heavily optimized for multi-tasking retail managers, segregated into focused operational tabs:

1. **Overview / Dashboard**
   - **Hero Store Health Score**: A live synthesized operational health gauge out of 100.
   - **Business Impact/ROI Metrics**: Real-time stats on prevented walkaways and autonomous task dispatches.
   - **Real-Time Alert Ticker**: Chronological raw metric triggers parsed natively by the AI Copilot, complete with specific data source indicators.

2. **Live CV & Queue Vision**
   - **Cinematic Vision Viewport**: A dedicated simulated camera feed rendering real-time bounding boxes over shoppers, queue boundary zones, and low-stock polygons.
   - **Live Checkout Lane Breakdown**: Telemetry for Counters 1–4, showing active occupants, estimated wait times, and recommended open/close states.
   - **Queue Depth Trend**: A reactive Recharts graph mapping historical queue pressure against store thresholds.

3. **Inventory & Restocking**
   - **Shelf Fill Percentage Tracking**: Aisles 1–3 occupancy rates displaying live structural fill capacity.
   - **Restock Action Center**: Stock velocity metrics paired with interactive one-click "Dispatch Floor Team" triggers.

4. **Demo Mode Controller**
   - **On-Demand Scenario Simulator**: A floating control pill that dynamically forces the simulated store state into *Normal Traffic*, *Peak Rush*, or *Stock Depleted* modes for instant presentation capability.

---

##  Tech Stack

| Domain | Technology / Tool |
| :--- | :--- |
| **Frontend** | React 19, Vite, TailwindCSS, Recharts, Lucide-React |
| **Backend/API** | FastAPI (Python), WebSockets |
| **Edge CV** | OpenCV, YOLOv8-Retail |
| **On-Device LLM** | Ollama (llama3.2:3b local hosting) |
| **Hardware Target** | Qualcomm QCS / NPU Edge Devices |

---

##  Getting Started & Local Setup Guide

### Prerequisites
- **Node.js** 18+
- **Python** 3.10+
- **Ollama** installed locally

### 1. Frontend Setup (React/Vite)
Navigate to the `frontend` directory, install dependencies, and spin up the development server:
```bash
cd frontend
npm install
npm run dev
```
The dashboard will be available at `http://localhost:5173`.

### 2. Backend & Vision API Setup (Phase 2)
Navigate to the `backend` directory, install the Python requirements, and start the FastAPI server:
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```
The live WebSocket stream will broadcast at `ws://localhost:8000/ws/store-stream`.

### 3. Local LLM Setup (Ollama)
Ensure the local language model is running to power the Manager Copilot:
```bash
ollama run llama3.2:3b
```

---

##  Repository Structure

```text
Nexora-Retail/
├── frontend/               # React + Vite dashboard
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   └── tabs/       # Overview, Vision, Inventory, Copilot tabs
│   │   ├── hooks/          # useStoreStream WebSocket hook
│   │   ├── mock/           # Edge simulation and scenario data pump
│   │   ├── App.jsx         # Main router and floating Demo Controller
│   │   └── main.jsx        # React DOM entry
│   ├── tailwind.config.js
│   └── package.json
├── backend/                # FastAPI application (Phase 2)
│   ├── app/
│   │   ├── main.py         # Application entry and WebSocket routing
│   │   └── cv_engine/      # OpenCV + YOLO bounding box processing
│   └── requirements.txt
├── models/                 # Model weights (YOLO, etc.)
├── docs/                   # System architecture diagrams and proposals
└── README.md
```

---

##  Team & Hackathon Track

**Team:** Nexora
**Track:** On-Device AI / Edge Computing Operations

*Built to transform how edge-silicon empowers physical retail locations by cutting cloud latency out of the equation.*
