# Nexora Retail Intelligence Engine (NRIE)

**Smart India Hackathon (SIH) 2026 | Problem Statement ID: SIH26-26179**  
**Sponsor & Partner**: Qualcomm Inc.  
**Theme**: Smart Automation (Hardware / Edge AI Integration)  
**Team**: Nexora  
**Deployment Model**: 100% Local On-Device / Local Store Computer Execution  

---

## 🌟 Executive Summary

**Nexora Retail Intelligence Engine (NRIE)** is an edge-first, 100% local AI platform built for physical retail environments (supermarkets, department stores, Kirana chains). Designed specifically for **Qualcomm Snapdragon SNPE / Edge AI hardware**, NRIE runs completely offline on the shopkeeper's local store computer:

- **100% Offline & Local Operation**: Zero reliance on external cloud APIs or internet connections.
- **On-Device Shopper Privacy**: All camera feeds are anonymized locally on-device. Zero video frames leave the store premises.
- **Local SQLite Database**: All telemetry logs, alerts, queue metrics, and heatmaps are saved locally.
- **Local LLaMA 3.2 Copilot**: Powered by a locally stored Small Language Model (via Ollama / ONNX).

---

## 📁 Repository Structure

```
Nexora-Retail/
└── backend/                       # Production FastAPI Backend & Local LLaMA Copilot Engine
    ├── app/
    │   ├── api/v1/                # REST & WebSocket Routers (edge, analytics, queue, inventory, alerts, copilot)
    │   ├── models/                # Async SQLAlchemy Domain ORM Models
    │   ├── schemas/               # Pydantic Schemas
    │   ├── services/              # LLaMA Copilot, Rule Engine, Heatmaps & Simulator
    │   ├── static/                # Integrated Local Web Dashboard (http://localhost:8000/dashboard)
    │   ├── config.py
    │   ├── database.py
    │   └── main.py
    ├── tests/                     # Automated Pytest Suite (9/9 Passed)
    ├── seed_data.py               # Database Seeding Script
    ├── requirements.txt           # Python Dependencies
    └── run.py                     # Local Server Launcher
```

---

## 🚀 How to Run Locally on the Shopkeeper's Computer

### 1. Install Backend Dependencies
```powershell
cd backend
pip install -r requirements.txt
```

### 2. Seed Database (Optional)
```powershell
python seed_data.py
```

### 3. Start Local Server
```powershell
python run.py
```

### 4. Access Local Interfaces
- 🖥️ **Local Store Dashboard**: [http://localhost:8000/dashboard](http://localhost:8000/dashboard)
- 📜 **Local Swagger OpenAPI Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- ⚡ **Local WebSocket Connection**: `ws://localhost:8000/ws/api/v1/dashboard/live`
