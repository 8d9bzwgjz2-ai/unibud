import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

const AlertsContext = createContext({ unread: 0, refresh: () => {} });

export function AlertsProvider({ children }) {
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const data = await api('/notifications/unread');
      setUnread(data.unread);
    } catch {
      // A dropped poll should not disturb the screen.
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 12000);
    return () => clearInterval(timer);
  }, [refresh]);

  return (
    <AlertsContext.Provider value={{ unread, refresh }}>{children}</AlertsContext.Provider>
  );
}

export const useAlerts = () => useContext(AlertsContext);
