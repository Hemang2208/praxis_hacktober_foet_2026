import CryptoJS from "crypto-js";
import process from "process";

const DEFAULT_KEY = "351d6b1a0c2630ee3a8e61e45864e4656b0a441ff36094e4656b0a441";
const getSecretKey = (): string => process.env.NEXT_PUBLIC_CRYPTO_KEY || DEFAULT_KEY;

export const decrypt = (encryptedText: string): string => {
  try {
    const key = getSecretKey();
    const bytes = CryptoJS.AES.decrypt(encryptedText, key);
    const text = bytes.toString(CryptoJS.enc.Utf8);
    if (!text) {
      throw new Error("Decryption failed - possibly wrong key");
    }
    return text;
  } catch (error) {
    throw new Error("Decryption failed: " + (error as Error).message);
  }
};

export const encrypt = (decryptedText: string): string => {
  const key = getSecretKey();
  const encrypted = CryptoJS.AES.encrypt(decryptedText, key);
  return encrypted.toString();
};
