import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { api } from './lib/api';
import { SessionContext } from './lib/session';
import { AlertsProvider } from './components/AlertsContext';
import Shell from './components/Shell';
import Login from './pages/Login';
import ChatList from './pages/ChatList';
import Conversation from './pages/Conversation';
import Lync from './pages/Lync';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';

export default function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    api('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setUser(null));
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  }, []);

  if (user === undefined) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-paper">
        <span className="label animate-pulse">UNIBUD</span>
      </div>
    );
  }

  if (!user) {
    return <Login onSignedIn={setUser} />;
  }

  return (
    <SessionContext.Provider value={{ user, signOut }}>
      <AlertsProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Shell />}>
              <Route path="/" element={<Navigate to="/chat" replace />} />
              <Route path="/chat" element={<ChatList />} />
              <Route path="/chat/:id" element={<Conversation />} />
              <Route path="/lync" element={<Lync />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="*" element={<Navigate to="/chat" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AlertsProvider>
    </SessionContext.Provider>
  );
}
