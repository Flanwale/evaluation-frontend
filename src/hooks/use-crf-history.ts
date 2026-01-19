// src/hooks/use-crf-history.ts
import { useState, useCallback, useRef } from "react";

export function useCrfHistory<T>(initialState: T) {
  const [past, setPast] = useState<T[]>([]);
  const [present, setPresent] = useState<T>(initialState);
  const [future, setFuture] = useState<T[]>([]);
  const isDirtyRef = useRef(false);

  // 核心：更新数据并记录历史
  const update = useCallback((newPresent: T) => {
    setPast((prev) => [...prev, present]);
    setPresent(newPresent);
    setFuture([]);
    isDirtyRef.current = true;
  }, [present]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    setFuture((prev) => [present, ...prev]);
    setPresent(previous);
    setPast(newPast);
  }, [past, present]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    setPast((prev) => [...prev, present]);
    setPresent(next);
    setFuture(newFuture);
  }, [future, present]);

  // 重置：通常用于从数据库加载新数据时
  const initialize = useCallback((data: T) => {
    setPresent(data);
    setPast([]);
    setFuture([]);
    isDirtyRef.current = false;
  }, []);

  return {
    values: present,
    setValue: update,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    initialize,
    isDirty: isDirtyRef.current
  };
}