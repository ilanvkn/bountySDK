import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  getAccount,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import nacl from "tweetnacl";
import bs58 from "bs58";

// USDC Mint Address on Solana Mainnet
export const USDC_MINT = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);

// USDC has 6 decimals
export const USDC_DECIMALS = 6;

/**
 * Convert USDC amount to raw units (with 6 decimals)
 */
export function usdcToRaw(amount: number): bigint {
  return BigInt(Math.round(amount * Math.pow(10, USDC_DECIMALS)));
}

/**
 * Convert raw units to USDC amount
 */
export function rawToUsdc(raw: bigint): number {
  return Number(raw) / Math.pow(10, USDC_DECIMALS);
}

/**
 * Get USDC balance for a wallet
 */
export async function getUsdcBalance(
  connection: Connection,
  walletAddress: string
): Promise<number> {
  try {
    const wallet = new PublicKey(walletAddress);
    const tokenAccount = await getAssociatedTokenAddress(USDC_MINT, wallet);
    const account = await getAccount(connection, tokenAccount);
    return rawToUsdc(account.amount);
  } catch {
    return 0;
  }
}

/**
 * Transfer USDC from one wallet to another
 */
export async function transferUsdc(
  connection: Connection,
  fromKeypair: Keypair,
  toWallet: string,
  amount: number
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    const fromPubkey = fromKeypair.publicKey;
    const toPubkey = new PublicKey(toWallet);

    // Get token accounts
    const fromTokenAccount = await getAssociatedTokenAddress(
      USDC_MINT,
      fromPubkey
    );
    const toTokenAccount = await getAssociatedTokenAddress(USDC_MINT, toPubkey);

    // Check if destination token account exists
    const transaction = new Transaction();

    try {
      await getAccount(connection, toTokenAccount);
    } catch {
      // Create associated token account if it doesn't exist
      transaction.add(
        createAssociatedTokenAccountInstruction(
          fromPubkey,
          toTokenAccount,
          toPubkey,
          USDC_MINT
        )
      );
    }

    // Add transfer instruction
    const rawAmount = usdcToRaw(amount);
    transaction.add(
      createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        fromPubkey,
        rawAmount
      )
    );

    // Send transaction
    const signature = await sendAndConfirmTransaction(connection, transaction, [
      fromKeypair,
    ]);

    return { success: true, signature };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transfer failed";
    return { success: false, error: message };
  }
}

/**
 * Sign a message with a Solana keypair
 */
export function signMessage(message: string, keypair: Keypair): string {
  const messageBytes = new TextEncoder().encode(message);
  const signature = nacl.sign.detached(messageBytes, keypair.secretKey);
  return bs58.encode(signature);
}

/**
 * Verify a signature
 */
export function verifySignature(
  message: string,
  signature: string,
  publicKey: string
): boolean {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = bs58.decode(publicKey);
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch {
    return false;
  }
}
