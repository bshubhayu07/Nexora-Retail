# Team Nexora - Smart India Hackathon (SIH)

## Problem Statement Details

* **Problem Statement ID:** 26179
* **Project Title:** AI-Powered Retail Intelligence Platform
* **Team Name:** Nexora
* **Domain:** Smart Automation / Computer Vision / Edge AI / Retail Analytics

---

## Background

India's retail sector includes millions of neighborhood stores, supermarkets, pharmacies, and large-format retail outlets that serve high customer volumes every day. Retailers face challenges such as inventory shrinkage, stock-outs, long billing queues, inefficient shelf replenishment, and limited visibility into shopper behavior. Many stores, especially in Tier-2 and Tier-3 cities, also operate with constrained internet connectivity and require solutions that can function reliably without continuous cloud access.

Recent advances in edge AI allow cameras and sensors to perform real-time analytics directly on local devices, enabling faster decisions, improved privacy, reduced bandwidth consumption, and uninterrupted operation even during connectivity outages. Hybrid and edge AI approaches are increasingly being adopted for real-time monitoring and decision support across multiple industries.

---

## Description

Design an **Intelligent Retail Analytics System** that uses smart cameras and on-device AI to monitor retail operations in real time. The system should analyze shopper movement, inventory levels, and checkout queues without requiring constant cloud processing.

The solution should automatically identify customer traffic patterns, measure dwell time in different store sections, detect out-of-stock products, monitor shelf compliance, and predict queue congestion before it impacts customer experience. AI inference should happen locally on the edge devices to enable low-latency decisions while preserving customer privacy and minimizing network dependency.

The system should convert video streams into actionable business insights that help retailers improve operational efficiency, optimize staffing, increase product availability, and enhance customer satisfaction. Edge-based analytics can provide real-time intelligence while reducing dependence on cloud connectivity.

---

## Expected Solution Requirements

### 1. Shopper Analytics
* **Footfall Tracking:** Detect and count customers entering and exiting the store.
* **Traffic Patterns:** Analyze footfall trends by time, day, and store zone.
* **Dwell Time Analysis:** Measure shopper dwell time near products and promotional displays.
* **Heatmaps:** Generate heatmaps showing customer movement patterns and high-density zones.

### 2. Inventory Monitoring
* **Out-of-Stock Detection:** Detect low-stock and out-of-stock situations using shelf-facing cameras.
* **Planogram Compliance:** Monitor planogram compliance and product placement.
* **Replenishment Alerts:** Alert store staff in real time when replenishment is required.
* **Merchandise Availability:** Track merchandise availability in real time.

### 3. Queue Intelligence
* **Queue Length Monitoring:** Monitor checkout counters and queue lengths.
* **Predictive Congestion:** Predict queue congestion before it becomes excessive.
* **Counter Recommendations:** Recommend opening additional billing counters dynamically.
* **Wait Time Metrics:** Measure average waiting and service times per counter.

### 4. Edge AI Processing
* **Local Inference:** Run computer vision models locally on edge hardware (YOLO/ByteTrack/ONNX/TensorRT).
* **Offline Resilience:** Operate smoothly even during internet disruptions.
* **Bandwidth Optimization:** Reduce cloud bandwidth and operational costs by transmitting only metadata/insights.
* **Low-Latency Response:** Support rapid, real-time decision-making.

### 5. Privacy-Aware Analytics
* **Anonymous Tracking:** Use anonymous people detection and tracking (bounding boxes / embeddings without face storage).
* **PII Compliance:** Avoid storing personally identifiable information (PII).
* **Local Processing:** Process sensitive video streams locally on the edge.

### 6. Store Operations Dashboard
* **Real-time Alerts:** Trigger instant alerts for stock shortages, long queues, and anomaly events.
* **Analytics Reports:** Produce daily, weekly, and custom analytics reports.
* **KPI Visualization:** Visualize footfall, conversion indicators, inventory status, and staff efficiency.

### 7. Scalable Deployment
* **Multi-Store Scale:** Support deployment across small Kirana stores, supermarkets, and large retail chains.
* **Integrations:** Integrate with POS systems, Inventory Management Systems, and ERPs.
* **Centralized Fleet Management:** Allow centralized monitoring across multiple store locations.
