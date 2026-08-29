# Qualcomm Edge AI Retail Intelligence Platform - Backend Core

**SIH Problem Statement ID**: SIH26-26179  
**Sponsor**: Qualcomm Inc.  
**Theme**: Smart Automation (Edge AI & Retail Intelligence)  
**Maintainer**: Backend Engineering Team  

---

## ⚡ Quick Start

### 1. Install Dependencies
```powershell
pip install -r requirements.txt
```

### 2. Seed Database (Optional)
```powershell
python seed_data.py
```

### 3. Run Backend API Server
```powershell
python run.py
```
- **REST API Base URL**: `http://127.0.0.1:8000`
- **Interactive Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Live WebSockets Endpoint**: `ws://127.0.0.1:8000/ws/api/v1/dashboard/live`

---

## 🧪 Automated Testing

Run the Pytest suite to verify all REST endpoints, WebSocket broadcasts, database operations, and LLaMA Copilot integration:

```powershell
python -m pytest tests/ -v
```
