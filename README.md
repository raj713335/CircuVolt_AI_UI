# CircuVolt AI

CircuVolt AI is a cutting-edge platform designed to analyze, predict, and optimize the lifecycle of electric vehicle (EV) batteries. By leveraging AI-driven predictive modeling, advanced 3D visualizations, and deep design-for-recyclability algorithms, CircuVolt AI helps engineers, manufacturers, and recyclers maximize battery recovery and align with global circular economy standards (like the EU Battery Regulation).

##  Key Features

* **🚗 Interactive Car Studio**
  Explore a fully interactive, explodable 3D vehicle model built with React Three Fiber. Allows users to visually dissect the EV to identify where key battery components are located.
* **🔋 Advanced SOH Predictor**
  Input battery telemetry data (Capacity, Resistance, Temperature, Cycles, DoD) to get real-time State of Health (SoH) and Remaining Useful Life (RUL) predictions. Features highly analytical visual graphs inspired by advanced MathWorks research, mapping discharge voltage curves and long-term degradation forecasts. Includes a 3D explodable battery pack visualization!
* **🛠️ Design for Recyclability Advisor**
  Select from pre-configured EV component presets (Battery Packs, Motors, Inverters, etc.) and analyze how their design parameters (fasteners, adhesives, material mix) impact their end-of-life recyclability score. Provides actionable, LLM-generated redesign suggestions to improve scores.
* **♻️ Recovery Optimizer & Material Passport**
  Provides critical metrics, material flow breakdowns, and strategic insights for maximizing the recovery of precious metals and critical materials from battery scrap.

## 🛠️ Technology Stack

* **Frontend Framework**: React 18 with Vite
* **Styling**: Tailwind CSS (for sleek, custom utility-based design)
* **3D Rendering**: React Three Fiber & Drei (`@react-three/fiber`, `@react-three/drei`, `three.js`)
* **Data Visualization**: Recharts (Dynamic Radars, SHAP feature importance, and Voltage/Degradation Line Charts)
* **Icons**: Lucide React
* **Backend Integration**: Axios for communicating with the AI prediction and LLM analysis backend services.

## 🏁 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. **Clone the repository** (or navigate to the UI directory):
   ```bash
   cd CircuVolt_AI_UI
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173` to view the app!

## About the Design
The UI emphasizes a premium, highly analytical "dark-mode meets rich-dashboard" aesthetic. The interface relies on polished micro-interactions, clean serif/sans-serif typographic hierarchy, and complex data visualization to make dense battery chemistry data easily understandable.
