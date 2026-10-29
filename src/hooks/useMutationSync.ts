"use client";

import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import { useAppDispatch } from "@/redux/hooks";
import { mutate as swrMutate } from "swr";

export type MutationStatus = "idle" | "loading" | "success" | "error";

export interface UseMutationSyncOptions {
  /** SWR cache keys to mutate (revalidate) after success */
  invalidateSWRKeys?: string[];
  /** Toast message on success. If true, uses a default message. */
  successMessage?: string | true;
  /** Toast message on error. If true, uses the error string directly. */
  errorMessage?: string | true;
  /** Called on success with the unwrapped result */
  onSuccess?: (data: unknown) => void;
  /** Called on error with the error message string */
  onError?: (error: string) => void;
  /** Called when mutation settles (success or error) */
  onSettled?: () => void;
}

export interface UseMutationSyncReturn {
  /**
   * Execute a mutation by dispatching a thunk action.
   * Returns the unwrapped result on success, or throws on error.
   */
  execute: (thunkAction: any) => Promise<unknown>;
  /** Current status of the mutation */
  status: MutationStatus;
  /** True while mutation is in flight */
  loading: boolean;
  /** Error message if status is 'error' */
  error: string | null;
  /** Reset back to idle */
  reset: () => void;
}

export function useMutationSync(
  options?: UseMutationSyncOptions,
): UseMutationSyncReturn {
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<MutationStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (thunkAction: any): Promise<unknown> => {
      setStatus("loading");
      setError(null);

      try {
        const result = await dispatch(thunkAction).unwrap();
        setStatus("success");

        if (options?.successMessage) {
          const msg =
            options.successMessage === true
              ? "Updated successfully"
              : options.successMessage;
          toast.success(msg);
        }

        if (options?.invalidateSWRKeys) {
          for (const key of options.invalidateSWRKeys) {
            await swrMutate(key);
          }
        }

        options?.onSuccess?.(result);
        options?.onSettled?.();
        return result;
      } catch (err) {
        const msg =
          typeof err === "string"
            ? err
            : err instanceof Error
              ? err.message
              : "Operation failed";
        setStatus("error");
        setError(msg);

        if (options?.errorMessage) {
          const display =
            options.errorMessage === true ? msg : options.errorMessage;
          toast.error(display);
        } else {
          toast.error(msg);
        }

        options?.onError?.(msg);
        options?.onSettled?.();
        throw err;
      }
    },
    [dispatch, options],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return {
    execute,
    status,
    loading: status === "loading",
    error,
    reset,
  };
}

export default useMutationSync;
