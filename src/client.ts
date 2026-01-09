import { Connection, Keypair } from "@solana/web3.js";
import { BountyClientConfig } from "./types";
import { AuthModule } from "./modules/auth";
import { TasksModule } from "./modules/tasks";
import { SubmissionsModule } from "./modules/submissions";
import { X402Module } from "./modules/x402";
import { getUsdcBalance } from "./utils/solana";

// Default configuration
const DEFAULT_BASE_URL = "https://app.bountydot.money";
const DEFAULT_RPC_URL = "https://api.mainnet-beta.solana.com";
const DEFAULT_FACILITATOR_URL = "https://facilitator.payai.network";

/**
 * Bounty SDK Client
 * 
 * Main entry point for interacting with the Bounty platform.
 * 
 * @example
 * ```typescript
 * import { BountyClient } from '@bountydotmoney/sdk';
 * import { Keypair } from '@solana/web3.js';
 * 
 * // Initialize with your wallet
 * const client = new BountyClient({
 *   wallet: Keypair.fromSecretKey(yourSecretKey),
 * });
 * 
 * // Discover open bounties
 * const bounties = await client.tasks.discover({ category: 'MEME' });
 * 
 * // Submit to a bounty
 * await client.submissions.submit({
 *   taskId: bounties.tasks[0].id,
 *   content: 'https://x.com/mytweet',
 *   type: 'LINK',
 * });
 * ```
 */
export class BountyClient {
  /** Tasks module for creating and discovering bounties */
  public readonly tasks: TasksModule;
  
  /** Submissions module for submitting work to bounties */
  public readonly submissions: SubmissionsModule;
  
  /** Auth module for wallet authentication */
  public readonly auth: AuthModule;

  private readonly wallet: Keypair;
  private readonly baseUrl: string;
  private readonly rpcUrl: string;
  private readonly x402: X402Module;

  /**
   * Create a new Bounty client
   * 
   * @param config - Client configuration
   */
  constructor(config: BountyClientConfig) {
    this.wallet = config.wallet;
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    this.rpcUrl = config.rpcUrl || DEFAULT_RPC_URL;
    const facilitatorUrl = config.facilitatorUrl || DEFAULT_FACILITATOR_URL;

    // Initialize modules
    this.auth = new AuthModule(this.baseUrl, this.wallet);
    this.x402 = new X402Module(this.wallet, facilitatorUrl, this.rpcUrl);
    this.tasks = new TasksModule(
      this.baseUrl,
      this.wallet,
      this.rpcUrl,
      this.auth,
      this.x402
    );
    this.submissions = new SubmissionsModule(
      this.baseUrl,
      this.wallet,
      this.auth,
      this.x402
    );
  }

  /**
   * Get the wallet address
   */
  getWalletAddress(): string {
    return this.wallet.publicKey.toBase58();
  }

  /**
   * Get the USDC balance of the wallet
   */
  async getUsdcBalance(): Promise<number> {
    const connection = new Connection(this.rpcUrl, "confirmed");
    return getUsdcBalance(connection, this.getWalletAddress());
  }

  /**
   * Check if the wallet has enough USDC for an operation
   * 
   * @param amount - Required amount in USDC
   */
  async hasEnoughUsdc(amount: number): Promise<boolean> {
    const balance = await this.getUsdcBalance();
    return balance >= amount;
  }

  /**
   * Get the base URL being used
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Get the RPC URL being used
   */
  getRpcUrl(): string {
    return this.rpcUrl;
  }
}
