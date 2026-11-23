"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type User = { name: string }; // en mayúsculas, máx. 10 caracteres
export type SavedScore = {
  game: string;
  score: number;
  name: string;
  at: number;
};

// localStorage
// "av_user"   → JSON de User, o ausente si es invitado
// "av_scores" → JSON de SavedScore[]
const USER_KEY = "av_user";
const SCORES_KEY = "av_scores";

type SessionContextValue = {
  user: User | null;
  login: (user: User) => void;
  signOut: () => void;
  saveScore: (entry: Omit<SavedScore, "at">) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { name?: unknown }).name === "string"
  );
}

// Store mínimo sobre localStorage para useSyncExternalStore. El snapshot es el
// string crudo (estable entre lecturas); en el servidor y en el primer render
// de hidratación se usa el snapshot de invitado (null), sin errores de hidratación.
const listeners = new Set<() => void>();
let memoryUser: string | null = null; // respaldo si localStorage está bloqueado

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === USER_KEY || e.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): string | null {
  try {
    return localStorage.getItem(USER_KEY);
  } catch {
    return memoryUser;
  }
}

function getServerSnapshot(): string | null {
  return null;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const user = useMemo<User | null>(() => {
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      return isUser(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }, [raw]);

  const login = useCallback((next: User) => {
    const json = JSON.stringify(next);
    memoryUser = json;
    try {
      localStorage.setItem(USER_KEY, json);
    } catch {
      // sin persistencia, la sesión vive solo en memoria
    }
    emit();
  }, []);

  const signOut = useCallback(() => {
    memoryUser = null;
    try {
      localStorage.removeItem(USER_KEY);
    } catch {
      // nada que borrar si el almacenamiento no está disponible
    }
    emit();
  }, []);

  const saveScore = useCallback((entry: Omit<SavedScore, "at">) => {
    try {
      const stored = localStorage.getItem(SCORES_KEY);
      const parsed: unknown = stored ? JSON.parse(stored) : [];
      const all: SavedScore[] = Array.isArray(parsed) ? parsed : [];
      all.push({ ...entry, at: Date.now() });
      localStorage.setItem(SCORES_KEY, JSON.stringify(all));
    } catch {
      // la app funciona sin persistir
    }
  }, []);

  const value = useMemo(
    () => ({ user, login, signOut, saveScore }),
    [user, login, signOut, saveScore],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession debe usarse dentro de <SessionProvider>");
  }
  return ctx;
}
