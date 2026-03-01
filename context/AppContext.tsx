import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

/* ─── Types ────────────────────────────────────────────────────────────── */

export type DataRow = Record<string, string | number>;

export interface DataStore {
  id: string;
  headers: string[];
  rows: DataRow[];
  fileName: string;
  rowCount: number;
}

export interface ChartData {
  type: 'bar' | 'pie' | 'line';
  labels: string[];
  values: number[];
  title: string;
  colors?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  queryLogic?: string;
  explanation?: string;
  chartData?: ChartData;
  isLoading?: boolean;
  confidence?: string;
}

/* ─── Context shape ────────────────────────────────────────────────────── */

interface Ctx {
  dataStores: DataStore[];
  activeDataStoreId: string | null;
  addDataStore: (ds: DataStore) => void;
  removeDataStore: (id: string) => void;
  setActiveDataStore: (id: string) => void;
  updateRow: (rowIndex: number, newData: DataRow) => void;
  addRow: (newRow: DataRow) => void;
  deleteRow: (rowIndex: number) => void;
  updateCell: (rowIndex: number, column: string, value: string | number) => void;
  bulkUpdateCells: (updates: Array<{ rowIndex: number; column: string; value: string | number }>) => void;
  getActiveDataStore: () => DataStore | null;
  apiKey: string;
  messages: ChatMessage[];
  addMessage: (m: ChatMessage) => void;
  updateMessage: (id: string, u: Partial<ChatMessage>) => void;
  clearMessages: () => void;
  savedInsights: ChatMessage[];
  saveInsight: (m: ChatMessage) => void;
  keyReady: boolean;
}

const AppContext = createContext<Ctx | null>(null);

// TODO: Replace with your Mistral API key
const MISTRAL_API_KEY = '2RUtXUdaWZZl6T3QWhxi3mOUGO4zL1Go';

/* ─── Provider ─────────────────────────────────────────────────────────── */

export function AppProvider({ children }: { children: ReactNode }) {
  const [dataStores, setDataStores] = useState<DataStore[]>([]);
  const [activeDataStoreId, setActiveDataStoreId] = useState<string | null>(null);
  const [keyReady, setKeyReady] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [savedInsights, setSaved] = useState<ChatMessage[]>([]);

  /* Initialize key on mount */
  useEffect(() => {
    setKeyReady(true);
  }, []);

  const addDataStore = useCallback((ds: DataStore) => {
    setDataStores(prev => [...prev, ds]);
    setActiveDataStoreId(ds.id);
  }, []);

  const removeDataStore = useCallback((id: string) => {
    setDataStores(prev => prev.filter(d => d.id !== id));
    setActiveDataStoreId(prev => prev === id ? (dataStores[0]?.id || null) : prev);
  }, [dataStores]);

  const setActiveDataStore = useCallback((id: string) => {
    if (dataStores.find(d => d.id === id)) {
      setActiveDataStoreId(id);
    }
  }, [dataStores]);

  const getActiveDataStore = useCallback((): DataStore | null => {
    return dataStores.find(d => d.id === activeDataStoreId) || null;
  }, [dataStores, activeDataStoreId]);

  const addMessage = useCallback((m: ChatMessage) => setMessages(p => [...p, m]), []);
  const updateMessage = useCallback(
    (id: string, u: Partial<ChatMessage>) =>
      setMessages(p => p.map(m => (m.id === id ? { ...m, ...u } : m))),
    [],
  );
  const clearMessages = useCallback(() => setMessages([]), []);
  const saveInsight = useCallback((m: ChatMessage) => {
    setSaved(p => (p.some(x => x.id === m.id) ? p : [...p, m]));
  }, []);

  const updateRow = useCallback((rowIndex: number, newData: DataRow) => {
    setDataStores(prev => prev.map(ds => {
      if (ds.id !== activeDataStoreId || rowIndex < 0 || rowIndex >= ds.rows.length) return ds;
      const newRows = [...ds.rows];
      newRows[rowIndex] = { ...newRows[rowIndex], ...newData };
      return { ...ds, rows: newRows };
    }));
  }, [activeDataStoreId]);

  const addRow = useCallback((newRow: DataRow) => {
    setDataStores(prev => prev.map(ds => {
      if (ds.id !== activeDataStoreId) return ds;
      return { ...ds, rows: [...ds.rows, newRow], rowCount: ds.rowCount + 1 };
    }));
  }, [activeDataStoreId]);

  const deleteRow = useCallback((rowIndex: number) => {
    setDataStores(prev => prev.map(ds => {
      if (ds.id !== activeDataStoreId || rowIndex < 0 || rowIndex >= ds.rows.length) return ds;
      const newRows = ds.rows.filter((_, i) => i !== rowIndex);
      return { ...ds, rows: newRows, rowCount: ds.rowCount - 1 };
    }));
  }, [activeDataStoreId]);

  const updateCell = useCallback((rowIndex: number, column: string, value: string | number) => {
    setDataStores(prev => prev.map(ds => {
      if (ds.id !== activeDataStoreId || rowIndex < 0 || rowIndex >= ds.rows.length) return ds;
      if (!ds.headers.includes(column)) return ds;
      const newRows = [...ds.rows];
      newRows[rowIndex] = { ...newRows[rowIndex], [column]: value };
      return { ...ds, rows: newRows };
    }));
  }, [activeDataStoreId]);

  const bulkUpdateCells = useCallback((updates: Array<{ rowIndex: number; column: string; value: string | number }>) => {
    setDataStores(prev => prev.map(ds => {
      if (ds.id !== activeDataStoreId) return ds;
      const newRows = [...ds.rows];
      updates.forEach(({ rowIndex, column, value }) => {
        if (rowIndex >= 0 && rowIndex < newRows.length && ds.headers.includes(column)) {
          newRows[rowIndex] = { ...newRows[rowIndex], [column]: value };
        }
      });
      return { ...ds, rows: newRows };
    }));
  }, [activeDataStoreId]);

  return (
    <AppContext.Provider
      value={{
        dataStores, activeDataStoreId,
        addDataStore, removeDataStore, setActiveDataStore, getActiveDataStore,
        updateRow, addRow, deleteRow, updateCell, bulkUpdateCells,
        apiKey: MISTRAL_API_KEY, keyReady,
        messages, addMessage, updateMessage, clearMessages,
        savedInsights, saveInsight,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => {
  const c = useContext(AppContext);
  if (!c) throw new Error('useAppContext must be used within AppProvider');
  return c;
};