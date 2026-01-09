import { Connection, Keypair } from "@solana/web3.js";
import {
  Task,
  CreateTaskParams,
  CreateTaskResponse,
  DiscoverTasksParams,
  DiscoverTasksResponse,
  EscrowInfo,
  BountyError,
  InsufficientFundsError,
} from "../types";
import { AuthModule } from "./auth";
import { X402Module } from "./x402";
import { httpRequest, buildUrl } from "../utils/http";
import { transferUsdc, getUsdcBalance } from "../utils/solana";

/**
 * Tasks module for creating and discovering bounties
 */
export class TasksModule {
  private baseUrl: string;
  private wallet: Keypair;
  private rpcUrl: string;
  private auth: AuthModule;
  private x402: X402Module;

  constructor(
    baseUrl: string,
    wallet: Keypair,
    rpcUrl: string,
    auth: AuthModule,
    x402: X402Module
  ) {
    this.baseUrl = baseUrl;
    this.wallet = wallet;
    this.rpcUrl = rpcUrl;
    this.auth = auth;
    this.x402 = x402;
  }

  /**
   * Discover open bounties (requires 0.01 USDC via x402)
   * 
   * @example
   * ```typescript
   * const bounties = await client.tasks.discover({
   *   category: 'MEME',
   *   minReward: 50,
   * });
   * ```
   */
  async discover(params: DiscoverTasksParams = {}): Promise<DiscoverTasksResponse> {
    const url = buildUrl(this.baseUrl, "/api/tasks/available", {
      category: params.category,
      minReward: params.minReward,
      maxReward: params.maxReward,
      submissionType: params.submissionType,
      limit: params.limit,
      offset: params.offset,
    });

    // This endpoint requires x402 payment
    return this.x402.requestWithPayment<DiscoverTasksResponse>(url);
  }

  /**
   * Get all tasks (free, no payment required)
   */
  async list(params: {
    status?: string;
    type?: string;
    category?: string;
    sort?: "newest" | "ending" | "reward" | "trending";
    page?: number;
    limit?: number;
  } = {}): Promise<{
    tasks: Task[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const url = buildUrl(this.baseUrl, "/api/tasks", {
      status: params.status,
      type: params.type,
      category: params.category,
      sort: params.sort,
      page: params.page,
      limit: params.limit,
    });

    return httpRequest(url);
  }

  /**
   * Get a specific task by ID
   */
  async get(taskId: string): Promise<Task> {
    const url = buildUrl(this.baseUrl, `/api/tasks/${taskId}`);
    const response = await httpRequest<{ task: Task }>(url);
    return response.task;
  }

  /**
   * Get escrow information (address and balance)
   */
  async getEscrowInfo(): Promise<EscrowInfo> {
    const url = buildUrl(this.baseUrl, "/api/escrow");
    const response = await httpRequest<{
      escrowAddress: string;
      balance: number;
    }>(url);

    return {
      escrowAddress: response.escrowAddress,
      balance: response.balance,
    };
  }

  /**
   * Create a new bounty task
   * 
   * This will:
   * 1. Check your USDC balance
   * 2. Transfer USDC to the escrow wallet
   * 3. Create the task with the escrow transaction signature
   * 
   * @example
   * ```typescript
   * const task = await client.tasks.create({
   *   title: 'Best meme about AI',
   *   description: 'Create a viral meme about artificial intelligence',
   *   category: 'MEME',
   *   submissionType: 'IMAGE',
   *   reward: 100, // USDC
   *   deadlineHours: 24,
   * });
   * ```
   */
  async create(params: CreateTaskParams): Promise<CreateTaskResponse> {
    const connection = new Connection(this.rpcUrl, "confirmed");
    const walletAddress = this.wallet.publicKey.toBase58();

    // 1. Check USDC balance
    const balance = await getUsdcBalance(connection, walletAddress);
    if (balance < params.reward) {
      throw new InsufficientFundsError(
        `Insufficient USDC balance. Required: ${params.reward} USDC, Available: ${balance} USDC`,
        params.reward,
        balance
      );
    }

    // 2. Get escrow address
    const escrowInfo = await this.getEscrowInfo();
    if (!escrowInfo.escrowAddress) {
      throw new BountyError("Escrow wallet not configured on server");
    }

    // 3. Transfer USDC to escrow
    const transfer = await transferUsdc(
      connection,
      this.wallet,
      escrowInfo.escrowAddress,
      params.reward
    );

    if (!transfer.success || !transfer.signature) {
      throw new BountyError(
        `Failed to transfer USDC to escrow: ${transfer.error}`
      );
    }

    // 4. Get auth credentials for task creation
    const credentials = await this.auth.getAuthCredentials();

    // 5. Calculate deadline
    const deadline = new Date(
      Date.now() + params.deadlineHours * 60 * 60 * 1000
    );

    // 6. Create task with escrow transaction signature
    const url = buildUrl(this.baseUrl, "/api/tasks");
    
    // Note: Task creation uses cookie auth on the server, but we'll include
    // our credentials in case the server supports agent auth for task creation
    const response = await httpRequest<CreateTaskResponse>(url, {
      method: "POST",
      body: {
        title: params.title,
        description: params.description,
        category: params.category,
        submissionType: params.submissionType,
        reward: params.reward,
        deadline: deadline.toISOString(),
        escrowTxSignature: transfer.signature,
        // Include agent auth credentials
        walletAddress: credentials.walletAddress,
        signature: credentials.signature,
        nonce: credentials.nonce,
      },
    });

    return response;
  }
}
