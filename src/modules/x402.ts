import { Keypair, Connection, VersionedTransaction } from "@solana/web3.js";
import { createX402Client, X402Client } from "x402-solana/client";
import { PaymentRequiredError, BountyError } from "../types";

/**
 * Wallet adapter that wraps a Keypair for x402-solana
 */
class KeypairWalletAdapter {
  private keypair: Keypair;

  constructor(keypair: Keypair) {
    this.keypair = keypair;
  }

  get publicKey() {
    return {
      toString: () => this.keypair.publicKey.toBase58(),
    };
  }

  async signTransaction(tx: VersionedTransaction): Promise<VersionedTransaction> {
    tx.sign([this.keypair]);
    return tx;
  }
}

/**
 * x402 Payment module for handling paid API endpoints
 */
export class X402Module {
  private wallet: Keypair;
  private rpcUrl: string;
  private client: X402Client | null = null;

  constructor(wallet: Keypair, _facilitatorUrl: string, rpcUrl: string) {
    this.wallet = wallet;
    this.rpcUrl = rpcUrl;
  }

  /**
   * Get or create the x402 payment client
   */
  private getClient(): X402Client {
    if (!this.client) {
      const walletAdapter = new KeypairWalletAdapter(this.wallet);
      this.client = createX402Client({
        wallet: walletAdapter,
        network: "solana", // mainnet
        rpcUrl: this.rpcUrl,
      });
    }
    return this.client;
  }

  /**
   * Make a request with x402 payment handling
   * Automatically handles 402 responses by making payment and retrying
   */
  async requestWithPayment<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const client = this.getClient();

    try {
      // Use x402 client's fetch which handles 402 automatically
      const response = await client.fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers as Record<string, string>),
        },
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json() as { error?: string };
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Not JSON
        }
        throw new BountyError(errorMessage, response.status);
      }

      return await response.json() as T;
    } catch (error) {
      if (error instanceof BountyError) {
        throw error;
      }
      // Handle x402 payment failures
      if (error instanceof Error && error.message.includes("402")) {
        throw new PaymentRequiredError(
          "Failed to process x402 payment: " + error.message,
          {}
        );
      }
      throw new BountyError(
        error instanceof Error ? error.message : "Request failed"
      );
    }
  }

  /**
   * Check if we have enough USDC for a payment
   */
  async checkBalance(requiredAmount: number): Promise<{
    sufficient: boolean;
    balance: number;
    required: number;
  }> {
    const connection = new Connection(this.rpcUrl, "confirmed");
    const { getUsdcBalance } = await import("../utils/solana");
    const balance = await getUsdcBalance(
      connection,
      this.wallet.publicKey.toBase58()
    );

    return {
      sufficient: balance >= requiredAmount,
      balance,
      required: requiredAmount,
    };
  }
}
