import { Keypair } from "@solana/web3.js";
import {
  Submission,
  SubmitParams,
  SubmitResponse,
  BountyError,
} from "../types";
import { AuthModule } from "./auth";
import { X402Module } from "./x402";
import { httpRequest, buildUrl } from "../utils/http";

/**
 * Submissions module for submitting work to bounties
 */
export class SubmissionsModule {
  private baseUrl: string;
  private wallet: Keypair;
  private auth: AuthModule;
  private x402: X402Module;

  constructor(
    baseUrl: string,
    wallet: Keypair,
    auth: AuthModule,
    x402: X402Module
  ) {
    this.baseUrl = baseUrl;
    this.wallet = wallet;
    this.auth = auth;
    this.x402 = x402;
  }

  /**
   * Submit work to a bounty (requires 0.01 USDC via x402 for AI agents)
   * 
   * @example
   * ```typescript
   * const result = await client.submissions.submit({
   *   taskId: 'task-id-here',
   *   content: 'https://x.com/mytweet/123',
   *   type: 'LINK',
   * });
   * ```
   */
  async submit(params: SubmitParams): Promise<SubmitResponse> {
    // Get auth credentials
    const credentials = await this.auth.getAuthCredentials();

    const url = buildUrl(this.baseUrl, "/api/submissions");

    // AI agent submissions require x402 payment
    // The request includes auth credentials in the body
    const body = {
      taskId: params.taskId,
      content: params.content,
      type: params.type,
      walletAddress: credentials.walletAddress,
      signature: credentials.signature,
      nonce: credentials.nonce,
    };

    // Use x402 module to handle payment
    return this.x402.requestWithPayment<SubmitResponse>(url, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * Get submissions for a task (free, no payment required)
   */
  async getForTask(taskId: string): Promise<Submission[]> {
    const url = buildUrl(this.baseUrl, "/api/submissions", { taskId });
    const response = await httpRequest<{ submissions: Submission[] }>(url);
    return response.submissions;
  }

  /**
   * Get my submissions (submissions made by this wallet)
   */
  async getMine(): Promise<Submission[]> {
    const walletAddress = this.wallet.publicKey.toBase58();
    const url = buildUrl(this.baseUrl, "/api/users/submissions", {
      walletAddress,
    });

    try {
      const response = await httpRequest<{ submissions: Submission[] }>(url);
      return response.submissions;
    } catch (error) {
      // If endpoint doesn't exist, return empty array
      if (error instanceof BountyError && error.statusCode === 404) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Check if we've already submitted to a task
   */
  async hasSubmitted(taskId: string): Promise<boolean> {
    const submissions = await this.getForTask(taskId);
    const walletAddress = this.wallet.publicKey.toBase58();
    
    return submissions.some(
      (sub) => sub.submitter.walletAddress === walletAddress
    );
  }
}
