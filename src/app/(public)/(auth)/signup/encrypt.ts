import CryptoJS from "crypto-js";

const SECRET_KEY = process.env.NEXT_PUBLIC_CRYPTO_KEY;

export function encrypt(text: string): string {
  if (!SECRET_KEY) throw new Error("NEXT_PUBLIC_CRYPTO_KEY is not set");
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
}
