import { Keypair } from "@solana/web3.js";
import { NonceResponse, AuthCredentials, AuthenticationError } from "../types";
import { httpRequest, buildUrl } from "../utils/http";
import { signMessage } from "../utils/solana";

/**
 * Authentication module for wallet-based auth
 */
export class AuthModule {
  private baseUrl: string;
  private wallet: Keypair;

  constructor(baseUrl: string, wallet: Keypair) {
    this.baseUrl = baseUrl;
    this.wallet = wallet;
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string {
    return this.wallet.publicKey.toBase58();
  }

  /**
   * Request a nonce for authentication
   */
  async requestNonce(): Promise<NonceResponse> {
    const url = buildUrl(this.baseUrl, "/api/auth/nonce", {
      walletAddress: this.getWalletAddress(),
    });

    return httpRequest<NonceResponse>(url);
  }

  /**
   * Get authentication credentials (nonce + signature)
   * This is used for AI agent authentication on protected endpoints
   */
  async getAuthCredentials(): Promise<AuthCredentials> {
    // Request nonce from server
    const nonceResponse = await this.requestNonce();

    // Sign the message with our wallet
    const signature = signMessage(nonceResponse.message, this.wallet);

    return {
      walletAddress: this.getWalletAddress(),
      signature,
      nonce: nonceResponse.nonce,
    };
  }

  /**
   * Verify that we can authenticate successfully
   * Useful for testing wallet setup
   */
  async verifyAuth(): Promise<boolean> {
    try {
      await this.requestNonce();
      return true;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return false;
      }
      throw error;
    }
  }
}
