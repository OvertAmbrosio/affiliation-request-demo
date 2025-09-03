import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Database } from 'sql.js';
import { initDatabase } from '../db/initDb';

interface DbContextType {
  db: Database | null;
  isLoading: boolean;
  error: Error | null;
  reinitializeDb: () => Promise<void>;
}

export const DbContext = createContext<DbContextType | undefined>(undefined);

export const DbProvider = ({ children }: { children: ReactNode }) => {
  const [db, setDb] = useState<Database | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const initialize = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const dbInstance = await initDatabase();
      setDb(dbInstance);
    } catch (e) {
      setError(e as Error);
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initialize();
  }, []);

  const reinitializeDb = async () => {
    await initialize();
  };

  return (
    <DbContext.Provider value={{ db, isLoading, error, reinitializeDb }}>
      {children}
    </DbContext.Provider>
  );
};

export const useDbContext = () => {
  const context = useContext(DbContext);
  if (context === undefined) {
    throw new Error('useDb must be used within a DbProvider');
  }
  return context;
};
