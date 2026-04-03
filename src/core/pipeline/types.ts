export interface PipelineLock {
  sessionId: string;
  pid: number;
  phase: string;
  startedAt: string;
  changeName: string;
}

export interface PendingPrompt {
  id: string;
  prompt: string;
}

export interface RunStartResult {
  status: 'ready' | 'blocked';
  sessionId: string;
  phase: string;
  changeName: string;
  preHooks: { executed: Array<{ id: string; status: string; output: string }>; pending: Array<{ id: string; prompt: string }> };
  preGates: Array<{ id: string; passed: boolean; description: string; details: Record<string, unknown>; ai_review_needed?: boolean }>;
  pendingPrompts: PendingPrompt[];
  failedGates?: Array<{ id: string; description: string; details: Record<string, unknown> }>;
}

export interface RunCompleteResult {
  status: 'passed' | 'failed' | 'blocked';
  sessionId: string;
  phase: string;
  changeName: string;
  postGates: Array<{ id: string; passed: boolean; description: string; details: Record<string, unknown> }>;
  postHooks: { executed: Array<{ id: string; status: string; output: string }>; pending: Array<{ id: string; prompt: string }> };
  unresolvedPrompts?: string[];
  failedGates?: Array<{ id: string; description: string; details: Record<string, unknown> }>;
  synthesis: {
    version: string;
    timestamp: string;
    sessionId: string;
    phase: string;
    total: number;
    passed: number;
    failed: number;
    results: Array<{ id: string; passed: boolean; ai_review_needed?: boolean }>;
  };
}

export interface ResolvedGateResult {
  version: string;
  id: string;
  passed: boolean;
  resolvedBy: string;
  resolvedAt: string;
  details?: Record<string, unknown>;
}
