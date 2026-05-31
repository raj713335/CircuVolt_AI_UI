import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';
import { useNavigate, useLocation } from 'react-router-dom';
import { predictSOH, generatePassport, recommendRecovery, getDesignSuggestions } from '../services/api';
import { useState, useCallback } from 'react';

/**
 * CopilotActions Component
 *
 * Registers CopilotKit frontend actions that the AI agent can invoke.
 * These actions bridge the AG-UI protocol with the application state,
 * allowing the agent to:
 * - Navigate between pages
 * - Trigger SOH predictions
 * - Generate passports
 * - Create recovery plans
 * - Analyze recyclability
 *
 * The AG-UI protocol handles:
 * - TOOL_CALL_START/ARGS/END events for action invocation
 * - STATE_SNAPSHOT/STATE_DELTA for state synchronization
 * - TEXT_MESSAGE streaming for responses
 */
export default function CopilotActions() {
  const navigate = useNavigate();
  const location = useLocation();

  // ── Readable State (shared with agent via AG-UI STATE events) ──

  useCopilotReadable({
    description: "Current page the user is viewing in CircularDrive AI",
    value: location.pathname,
  });

  useCopilotReadable({
    description: "CircularDrive AI capabilities and architecture",
    value: {
      name: "CircularDrive AI",
      version: "2.0.0",
      protocols: ["MCP", "A2A", "AG-UI"],
      agent_framework: "LangGraph",
      features: [
        "Battery SOH Prediction (ML-powered)",
        "Second-Life Grading (A/B/C/D with safety overrides)",
        "Material Passport (EU Reg 2023/1542)",
        "Recovery Optimization (disassembly + carbon impact)",
        "Design for Recyclability Analysis",
        "Circularity Scoring"
      ],
    },
  });

  // ── Frontend Actions (invokable by agent via AG-UI TOOL_CALL) ──

  useCopilotAction({
    name: "navigateTo",
    description: "Navigate to a specific page in the CircularDrive AI application",
    parameters: [
      {
        name: "page",
        type: "string",
        description: "Page to navigate to: 'dashboard', 'predict', 'passport', 'recovery', or 'design'",
        required: true,
      }
    ],
    handler: async ({ page }) => {
      const routes = {
        dashboard: '/',
        predict: '/predict',
        passport: '/passport',
        recovery: '/recovery',
        design: '/design',
      };
      const path = routes[page.toLowerCase()] || '/';
      navigate(path);
      return `Navigated to ${page} page`;
    },
  });

  useCopilotAction({
    name: "runSOHPrediction",
    description: "Run a battery SOH prediction with the given parameters and display results on the prediction page",
    parameters: [
      { name: "cycle_count", type: "number", description: "Number of charge/discharge cycles", required: true },
      { name: "voltage", type: "number", description: "Current voltage in Volts", required: true },
      { name: "current", type: "number", description: "Current in Amperes", required: true },
      { name: "temperature", type: "number", description: "Average temperature in Celsius", required: true },
      { name: "charge_capacity", type: "number", description: "Charge capacity in Ah", required: true },
      { name: "discharge_capacity", type: "number", description: "Discharge capacity in Ah", required: true },
      { name: "internal_resistance", type: "number", description: "Internal resistance in milliOhms", required: true },
      { name: "rated_capacity", type: "number", description: "Rated capacity in Ah", required: true },
    ],
    handler: async (params) => {
      const data = {
        ...params,
        depth_of_discharge: params.depth_of_discharge || 80,
        max_temperature: params.max_temperature || 35,
        energy_throughput: params.energy_throughput || 0,
      };
      try {
        const result = await predictSOH(data);
        navigate('/predict');
        return JSON.stringify(result);
      } catch (err) {
        return `Error: ${err.message}`;
      }
    },
  });

  useCopilotAction({
    name: "generatePassport",
    description: "Generate an EU-compliant material passport for a battery component",
    parameters: [
      { name: "component_id", type: "string", description: "Component identifier", required: true },
      { name: "manufacturer", type: "string", description: "Manufacturer name" },
      { name: "model", type: "string", description: "Model name" },
      { name: "chemistry", type: "string", description: "Battery chemistry (NMC, LFP, NCA)" },
    ],
    handler: async (params) => {
      try {
        const data = {
          component_id: params.component_id,
          battery_id: `BAT-${params.component_id}`,
          vehicle_id: `VEH-${params.component_id}`,
          manufacturer: params.manufacturer || "EV Motors India",
          model: params.model || "ElectraX 75",
          chemistry: params.chemistry || "NMC (Nickel Manganese Cobalt)",
          rated_capacity_kwh: 75.0,
          voltage: 400.0,
          module_count: 16,
          cell_count: 192,
          manufacturing_date: "2022-03-15",
          service_history: [],
        };
        const result = await generatePassport(data);
        navigate('/passport');
        return `Passport generated for ${params.component_id}. Completeness: ${result.completeness_score}%`;
      } catch (err) {
        return `Error: ${err.message}`;
      }
    },
  });

  useCopilotAction({
    name: "planRecovery",
    description: "Generate a disassembly and recovery plan for a battery",
    parameters: [
      { name: "component_id", type: "string", description: "Component ID", required: true },
      { name: "grade", type: "string", description: "Battery grade: A, B, C, or D", required: true },
      { name: "soh", type: "number", description: "SOH percentage", required: true },
    ],
    handler: async (params) => {
      try {
        const result = await recommendRecovery({
          component_id: params.component_id,
          grade: params.grade,
          soh: params.soh,
          chemistry: "NMC",
          module_count: 16,
          cell_count: 192,
          rated_capacity_kwh: 75.0,
        });
        navigate('/recovery');
        return JSON.stringify({
          recovery_score: result.recovery_score,
          co2_avoided: result.carbon_impact?.total_carbon_avoided_kgco2e,
          net_value: result.economic_value?.net_value_usd,
          steps: result.recovery_plan?.length,
        });
      } catch (err) {
        return `Error: ${err.message}`;
      }
    },
  });

  useCopilotAction({
    name: "analyzeDesign",
    description: "Analyze component design for recyclability",
    parameters: [
      { name: "component_name", type: "string", description: "Component name" },
      { name: "fastener_count", type: "number", description: "Number of fasteners" },
      { name: "adhesive_use", type: "string", description: "Low, Medium, or High" },
      { name: "modularity", type: "string", description: "Low, Medium, or High" },
    ],
    handler: async (params) => {
      try {
        const result = await getDesignSuggestions({
          component_name: params.component_name || "EV Battery Pack",
          fastener_count: params.fastener_count || 42,
          adhesive_use: params.adhesive_use || "High",
          material_mix: ["Aluminum", "Plastic", "Steel", "Copper"],
          labeling_quality: "Poor",
          modularity: params.modularity || "Low",
          hazard_separation: "Difficult",
        });
        navigate('/design');
        return `Recyclability Score: ${result.recyclability_score}/100. Suggestions: ${result.suggestions?.length || 0}`;
      } catch (err) {
        return `Error: ${err.message}`;
      }
    },
  });

  return null; // This component only registers actions, no UI
}
