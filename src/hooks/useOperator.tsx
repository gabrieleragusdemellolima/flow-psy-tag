import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export interface Operator {
  name: string;
  number: string;
}

interface OperatorCtx {
  operator: Operator | null;
  setOperator: (op: Operator | null) => void;
  clearOperator: () => void;
}

const STORAGE_KEY = 'tagflow.operator';

const OperatorContext = createContext<OperatorCtx>({
  operator: null,
  setOperator: () => {},
  clearOperator: () => {},
});

export function OperatorProvider({ children }: { children: ReactNode }) {
  const [operator, setOperatorState] = useState<Operator | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.name && parsed?.number) return parsed as Operator;
      return null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (operator) localStorage.setItem(STORAGE_KEY, JSON.stringify(operator));
    else localStorage.removeItem(STORAGE_KEY);
  }, [operator]);

  const setOperator = (op: Operator | null) => setOperatorState(op);
  const clearOperator = () => setOperatorState(null);

  return (
    <OperatorContext.Provider value={{ operator, setOperator, clearOperator }}>
      {children}
    </OperatorContext.Provider>
  );
}

export const useOperator = () => useContext(OperatorContext);
