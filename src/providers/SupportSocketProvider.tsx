"use client";

import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from "react";
import { supportSocketManager } from "@/lib/support-socket-manager";
import { SUPPORT_AGENT_URL } from "@/utils/API_URL";
import { fastAPIAuthService } from "@/lib/fastapi-auth";
import type { ConnectionState } from "@/lib/support-socket-manager";
import { useUser } from "@/hooks/useUser";

interface SupportSocketContextValue {
  isConnected: boolean;
  connectionState: ConnectionState;
  send: (data: string | object) => boolean;
  connect: (sessionId: string) => Promise<void>;
  disconnect: () => void;
  reconnect: () => void;
  onMessage: (handler: (data: any) => void) => () => void;
}

const SupportSocketContext = createContext<SupportSocketContextValue | null>(null);

export function SupportSocketProvider({ children }: { children: React.ReactNode }) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const messageHandlersRef = useRef<Set<(data: any) => void>>(new Set());
  const currentSessionIdRef = useRef<string>("");
  const cleanupFnsRef = useRef<Set<() => void>>(new Set());

  const { mongoUser, isLoaded } = useUser();

  useEffect(() => {
    supportSocketManager.setTokenFetcher(() => fastAPIAuthService.getAccessToken());
  }, []);

  useEffect(() => {
    const unsub1 = supportSocketManager.on("onStateChange", (state: ConnectionState) => {
      setConnectionState(state);
    });

    const unsub2 = supportSocketManager.on("onMessage", (data: any) => {
      messageHandlersRef.current.forEach((handler) => {
        try {
          handler(data);
        } catch (e) {
          console.error("[SocketProvider] Handler error:", e);
        }
      });
    });

    cleanupFnsRef.current.add(unsub1);
    cleanupFnsRef.current.add(unsub2);

    return () => {
      unsub1();
      unsub2();
      supportSocketManager.destroy();
    };
  }, []);

  const buildWsUrl = useCallback((sessionId: string, token: string): string => {
    const baseWsUrl = SUPPORT_AGENT_URL
      .replace(/^http:/, "ws:")
      .replace(/^https:/, "wss:")
      .replace(/\/$/, "");
    return `${baseWsUrl}/assistant/ws/chat/${sessionId}?token=${encodeURIComponent(token)}`;
  }, []);

  const connect = useCallback(async (sessionId: string) => {
    if (!sessionId) return;

    const token = await fastAPIAuthService.getAccessToken();
    if (!token) return;

    currentSessionIdRef.current = sessionId;
    const url = buildWsUrl(sessionId, token);
    await supportSocketManager.connect(url, token, sessionId);
  }, [buildWsUrl]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!mongoUser) {
      if (supportSocketManager.isConnected() || supportSocketManager.getConnectionState() !== "disconnected") {
        console.log("[SocketProvider] User logged out, disconnecting support socket");
        supportSocketManager.disconnect();
      }
      return;
    }

    const state = supportSocketManager.getConnectionState();
    if (state === "connected" || state === "connecting" || state === "reconnecting") {
      return;
    }

    let sessionId = "";
    if (typeof window !== "undefined") {
      const storedHistory = localStorage.getItem("supportAgentChatSessions");
      if (storedHistory) {
        try {
          const sessions = JSON.parse(storedHistory);
          if (Array.isArray(sessions) && sessions.length > 0) {
            const mostRecent = sessions.reduce((a: any, b: any) => {
              const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
              const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
              return timeA > timeB ? a : b;
            });
            if (mostRecent && mostRecent.id) {
              sessionId = mostRecent.id;
            }
          }
        } catch (e) {
          console.error("[SocketProvider] Failed to parse history", e);
        }
      }
    }

    if (!sessionId) {
      sessionId = `session-${Math.random().toString(36).substring(2, 9)}`;
    }

    console.log("[SocketProvider] Auto-connecting support socket in background with sessionId:", sessionId);
    connect(sessionId).catch((err) => {
      console.error("[SocketProvider] Failed to auto-connect support socket:", err);
    });
  }, [isLoaded, mongoUser, connect]);

  const disconnect = useCallback(() => {
    supportSocketManager.disconnect();
  }, []);

  const reconnect = useCallback(() => {
    supportSocketManager.reconnect();
  }, []);

  const send = useCallback((data: string | object): boolean => {
    return supportSocketManager.send(data);
  }, []);

  const onMessage = useCallback((handler: (data: any) => void): (() => void) => {
    messageHandlersRef.current.add(handler);
    return () => {
      messageHandlersRef.current.delete(handler);
    };
  }, []);

  const value: SupportSocketContextValue = {
    isConnected: supportSocketManager.isConnected(),
    connectionState,
    send,
    connect,
    disconnect,
    reconnect,
    onMessage,
  };

  return (
    <SupportSocketContext.Provider value={value}>
      {children}
    </SupportSocketContext.Provider>
  );
}

export function useSupportSocket(): SupportSocketContextValue {
  const ctx = useContext(SupportSocketContext);
  if (!ctx) {
    throw new Error("useSupportSocket must be used within a SupportSocketProvider");
  }
  return ctx;
}
