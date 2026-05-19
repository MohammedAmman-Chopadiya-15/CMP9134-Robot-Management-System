# Robot Management Mission Control System

A robust and scalable Robot Management System, consisting of multiple containers, which is meant for managing, monitoring, and auditing the autonomous units in a safe way. The system makes use of a highly performant **FastAPI** backend for managing the navigation process, asynchronous **WebSocket** telemetry channel for real-time monitoring, **React/Tailwind** operator dashboard, and a built-in **SQLite** database.

---

## Architecture & Network Topology

The infrastructure is fully containerized and runs isolated inside a dedicated Docker bridge network. 

* **Frontend:** A React application compiled and served via an Nginx reverse proxy on port `80`.
* **Backend:** A FastAPI engine exposing REST endpoints for operations and a WebSocket hub for telemetry on port `8000`.
* **Robot Simulator (`robot-sim`):** A mock hardware endpoint simulating telemetry updates and movement behaviors.

---

## Tech Stack & Compliance

* **Backend Framework:** FastAPI (Python 3.11+)
* **Database Layer:** SQLAlchemy ORM with a serverless SQLite engine.
* **Frontend:** React, Tailwind CSS, Lucide Icons.
* **Testing Engine:** pytest, unittest.mock.
* **Standards Compliance:** Conforms to WCAG 2.1 AA contrast standards (18.7:1 main text contrast ratio).

---

## Quick Start & Installation

### Prerequisites
Ensure you have the following installed on your host system:
* [Docker Desktop](https://www.docker.com/products/docker-desktop/)
* Git

### Step 1: Clone the Repository
```bash
git clone https://github.com/MohammedAmman-Chopadiya-15/CMP9134-Robot-Management-System.git
cd CMP9134-Robot-Management-System
```

### Step 2: Spin Up the Infrastructure
Launch all services concurrently using Docker Compose:

```bash
docker compose up -d --build
```

This command initializes the isolated `robot-network` bridge, provisions the database tables via SQLAlchemy, links the hardware simulator, and starts up the web server.

### Step 3: Access the Applications
* **Mission Control Dashboard (Frontend):** Open `http://localhost:5173`
* **Interactive API Documentation (Swagger):** Open `http://localhost:8000/docs`

---

## Testing Protocol

### 1. Automated Testing Suite
To run the multi-layered `pytest` verification matrix locally (checking coordinate boundaries, Role-Based Access Control logic, and simulated hardware network loss), execute:

```bash
docker compose exec backend pytest -v
```

### 2. Manual End-to-End Verification Plan
Follow this step-by-step test script to verify safety bounds, user constraints, and error recovery:

#### Test Case A: User Role Isolation (RBAC Verification)
1. Navigate to the web application interface.
2. Register/Login as a user with a `viewer` role assignment.
3. Observe the directional control buttons in the right panel. They should display a **"Locked"** overlay.
4. Attempt to submit a manual override coordinate. The UI should block input or gracefully reject execution, ensuring view-only integrity.

#### Test Case B: Navigation and Audit Log Tracking
1. Log in using an account with a `commander` role.
2. Click the **Up** button on the navigation pad.
3. Confirm that the **Live HUD** coordinates modify dynamically to reflect the shift.
4. Verify that the **Audit Trail** panel immediately appends a persistent, timestamped entry logging the movement action.

#### Test Case C: Coordinate Boundary Safety Verification
1. Locate the **Manual Override** section on the dashboard.
2. Input an out-of-bounds target coordinate (e.g., $X = 25$, $Y = 25$) exceeding the designated $21 \times 21$ spatial matrix boundary.
3. Submit the input via the **GoTo** button.
4. Assert that the system blocks the execution path, firing a "Target Reachable?" alert or warning boundary message, while keeping the unit safely inside the operational workspace.

#### Test Case D: Graceful Failure & System Recovery
1. Simulate a hardware disconnect event by temporarily stopping the simulator engine container:
   ```bash
   docker compose stop robot-sim
   ```
2. Observe the dashboard's status indicator. The metric will instantly transition to **"Signal Lost"** without triggering a core runtime crash on the backend.
3. Restart the simulator to re-establish communications:
   ```bash
   docker compose start robot-sim
   ```
4. Verify that the system automatically re-establishes socket synchronization, resuming live telemetry feeds on the map.