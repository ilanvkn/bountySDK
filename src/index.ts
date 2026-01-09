// Main client export
export { BountyClient } from "./client";

// Type exports
export type {
  // Config
  BountyClientConfig,
  
  // Tasks
  Task,
  TaskWithX402,
  TaskStatus,
  TaskType,
  TaskCategory,
  SubmissionType,
  CreateTaskParams,
  CreateTaskResponse,
  DiscoverTasksParams,
  DiscoverTasksResponse,
  
  // Submissions
  Submission,
  SubmitParams,
  SubmitResponse,
  
  // Auth
  NonceResponse,
  AuthCredentials,
  
  // Escrow
  EscrowInfo,
} from "./types";

// Error exports
export {
  BountyError,
  PaymentRequiredError,
  AuthenticationError,
  InsufficientFundsError,
} from "./types";

// Utility exports (for advanced usage)
export { signMessage, verifySignature, getUsdcBalance, transferUsdc } from "./utils/solana";
