import { createContext, useContext } from 'react';

export const SessionContext = createContext({ user: null, signOut: () => {} });

export const useSession = () => useContext(SessionContext);
