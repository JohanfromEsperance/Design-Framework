import { createContext, useContext, useRef, useCallback, useState } from "react";

interface SaveContextValue {
  register: (fn: () => void) => void;
  unregister: () => void;
  save: () => void;
  hasSaveFn: boolean;
}

const noop = () => {};

const SaveContext = createContext<SaveContextValue>({
  register: noop,
  unregister: noop,
  save: noop,
  hasSaveFn: false,
});

export function SaveProvider({ children }: { children: React.ReactNode }) {
  const saveFnRef = useRef<(() => void) | null>(null);
  const [hasSaveFn, setHasSaveFn] = useState(false);

  const register = useCallback((fn: () => void) => {
    saveFnRef.current = fn;
    setHasSaveFn(true);
  }, []);

  const unregister = useCallback(() => {
    saveFnRef.current = null;
    setHasSaveFn(false);
  }, []);

  const save = useCallback(() => {
    saveFnRef.current?.();
  }, []);

  return (
    <SaveContext.Provider value={{ register, unregister, save, hasSaveFn }}>
      {children}
    </SaveContext.Provider>
  );
}

export const useSaveContext = () => useContext(SaveContext);
