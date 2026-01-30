/**
 * RLM Integration Module
 *
 * Connects RLM with agents and CLI for enhanced reasoning capabilities.
 */

export { RLMOrchestrator } from './RLMOrchestrator';
export { AgentRLMBridge } from './AgentRLMBridge';

export type {
  RLMOrchestratorConfig,
  RLMSolveRequest,
  RLMAnalyzeRequest,
  RLMSolveResult,
  RLMAnalyzeResult,
  RLMExecutionMetrics,
  RLMOrchestratorState,
  AgentRLMBridgeConfig,
  AgentReasoningResult,
  RLMOrchestratorEvents,
} from './types';

export {
  DEFAULT_RLM_ORCHESTRATOR_CONFIG,
  DEFAULT_AGENT_RLM_BRIDGE_CONFIG,
} from './types';
