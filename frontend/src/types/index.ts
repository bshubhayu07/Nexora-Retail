// Normalized Domain Models for Decision Interface
import {
  OverviewKPIDTO,
  HeatmapGridResponseDTO,
  QueueStatusResponseDTO,
  ShelfStatusResponseDTO,
  AlertLogResponseDTO,
  EdgeHardwareTelemetryDTO,
  CopilotChatResponseDTO,
  SimulatorStatusResponseDTO,
  AnalyticsTrendsResponseDTO
} from './api';

export type PriorityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NORMAL';

export type ActionStatus = 'AVAILABLE' | 'EXECUTING' | 'SUCCESS' | 'VERIFYING' | 'RESOLVED' | 'FAILED';

export interface OperationalAction {
  id: string;
  type: 'OPEN_COUNTER' | 'CLOSE_COUNTER' | 'DISPATCH_RESTOCK' | 'ACKNOWLEDGE_ALERT';
  label: string;
  entityId: string;
  endpoint: string;
  method: 'POST';
  payload?: any;
  status: ActionStatus;
  resultMessage?: string;
  timestamp?: string;
}

export interface Situation {
  id: string;
  priority: PriorityLevel;
  type: 'QUEUE_CONGESTION' | 'STOCKOUT_RISK' | 'HARDWARE_ALERT' | 'NORMAL_OPERATIONS';
  title: string;
  entity: string;
  summary: string;
  reason?: string;
  impact?: string;
  recommendation?: string;
  action?: OperationalAction;
  timestamp: string;
  source: string;
  isResolved?: boolean;
}

export interface LiveStoreState {
  overview: OverviewKPIDTO | null;
  queues: QueueStatusResponseDTO[];
  shelves: ShelfStatusResponseDTO[];
  alerts: AlertLogResponseDTO[];
  hardware: EdgeHardwareTelemetryDTO | null;
  heatmap: HeatmapGridResponseDTO | null;
  trends: AnalyticsTrendsResponseDTO | null;
  simulator: SimulatorStatusResponseDTO | null;
  situations: Situation[];
  primarySituation: Situation | null;
  isWsConnected: boolean;
  lastUpdated: Date | null;
  isLoading: boolean;
  error: string | null;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isLiveLlama?: boolean;
  modelName?: string;
  sources?: string[];
  suggestedAction?: {
    label: string;
    route?: string;
    entityId?: string;
  };
}

export type AppRoute =
  | 'command-center'
  | 'shoppers'
  | 'operations'
  | 'queues'
  | 'inventory'
  | 'insights'
  | 'activity'
  | 'copilot'
  | 'diagnostics';
