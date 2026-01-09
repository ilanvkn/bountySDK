import { Keypair } from "@solana/web3.js";

// ============================================================================
// Client Configuration
// ============================================================================

export interface BountyClientConfig {
  /** Base URL of the Bounty API (default: https://app.bountydot.money) */
  baseUrl?: string;
  /** Solana wallet keypair for signing transactions and authentication */
  wallet: Keypair;
  /** Solana RPC URL (default: https://api.mainnet-beta.solana.com) */
  rpcUrl?: string;
  /** x402 facilitator URL (default: https://facilitator.payai.network) */
  facilitatorUrl?: string;
}

// ============================================================================
// Task Types
// ============================================================================

export type TaskStatus = "OPEN" | "JUDGING" | "COMPLETED" | "CANCELLED";
export type TaskType = "CUSTOM" | "DAILY";
export type TaskCategory = "THREAD" | "MEME" | "CODE" | "DESIGN" | "WRITING" | "OTHER";
export type SubmissionType = "LINK" | "IMAGE" | "TEXT" | "CODE";

export interface Task {
  id: string;
  title: string;
  description: string;
  reward: number;
  category: TaskCategory;
  submissionType: SubmissionType;
  type: TaskType;
  status: TaskStatus;
  deadline: string;
  createdAt: string;
  submissionCount: number;
  creator: {
    wallet: string;
    name: string | null;
  };
}

export interface TaskWithX402 extends Task {
  x402: {
    submitEndpoint: string;
    submitPrice: string;
    method: string;
    network: string;
    payTo: string;
    expectedReward: string;
  };
}

export interface CreateTaskParams {
  /** Task title */
  title: string;
  /** Detailed description of what you want */
  description: string;
  /** Category of the task */
  category: TaskCategory;
  /** Type of submission expected */
  submissionType: SubmissionType;
  /** Reward amount in USDC */
  reward: number;
  /** Hours until deadline (minimum 1 hour) */
  deadlineHours: number;
}

export interface DiscoverTasksParams {
  /** Filter by category */
  category?: TaskCategory;
  /** Minimum reward in USDC */
  minReward?: number;
  /** Maximum reward in USDC */
  maxReward?: number;
  /** Filter by submission type */
  submissionType?: SubmissionType;
  /** Maximum results (default 50, max 100) */
  limit?: number;
  /** Pagination offset */
  offset?: number;
}

export interface DiscoverTasksResponse {
  tasks: TaskWithX402[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  meta: {
    network: string;
    treasury: string;
    baseUrl: string;
    timestamp: string;
  };
  x402: {
    paid: boolean;
    fee: string;
  };
}

export interface CreateTaskResponse {
  task: Task & {
    escrowTx: {
      id: string;
      type: string;
      amount: number;
      status: string;
      txSignature: string;
    };
  };
}

// ============================================================================
// Submission Types
// ============================================================================

export interface Submission {
  id: string;
  content: string;
  type: SubmissionType;
  score: number | null;
  isWinner: boolean;
  aiReasoning: string | null;
  createdAt: string;
  submitter: {
    id: string;
    walletAddress: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

export interface SubmitParams {
  /** ID of the task to submit to */
  taskId: string;
  /** Submission content (URL, text, or image URL) */
  content: string;
  /** Type of submission */
  type: SubmissionType;
}

export interface SubmitResponse {
  success: boolean;
  submission: {
    id: string;
    content: string;
    type: SubmissionType;
    createdAt: string;
    submitter: {
      id: string;
      walletAddress: string;
      name: string | null;
      avatarUrl: string | null;
    };
  };
  task: {
    id: string;
    title: string;
    reward: number;
  };
  x402: {
    network: string;
    treasury: string;
    potentialReward: {
      amount: number;
      microUnits: string;
      currency: string;
    };
    paymentEndpoint: string;
    winnerWallet: string;
    note: string;
    submissionFee: {
      paid: boolean;
      amount: string;
    };
  };
}

// ============================================================================
// Auth Types
// ============================================================================

export interface NonceResponse {
  nonce: string;
  message: string;
  walletAddress: string;
  expiresIn: string;
  instructions: {
    step1: string;
    step2: string;
    step3: string;
  };
}

export interface AuthCredentials {
  walletAddress: string;
  signature: string;
  nonce: string;
}

// ============================================================================
// Escrow Types
// ============================================================================

export interface EscrowInfo {
  escrowAddress: string;
  balance: number;
}

// ============================================================================
// Error Types
// ============================================================================

export class BountyError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "BountyError";
  }
}

export class PaymentRequiredError extends BountyError {
  constructor(
    message: string,
    public paymentRequirements: unknown
  ) {
    super(message, 402);
    this.name = "PaymentRequiredError";
  }
}

export class AuthenticationError extends BountyError {
  constructor(message: string) {
    super(message, 401);
    this.name = "AuthenticationError";
  }
}

export class InsufficientFundsError extends BountyError {
  constructor(
    message: string,
    public required: number,
    public available: number
  ) {
    super(message, 400);
    this.name = "InsufficientFundsError";
  }
}
