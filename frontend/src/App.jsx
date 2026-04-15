import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import NuevoMovimiento from './pages/NuevoMovimiento.jsx';
import Movimientos from './pages/Movimientos.jsx';
import Vencimientos from './pages/Vencimientos.jsx';
import PorObra from './pages/PorObra.jsx';
import FlujoDeFondos from './pages/FlujoDeFondos.jsx';
import Configuracion from './pages/Configuracion.jsx';
import Login from './pages/Login.jsx';

// ── Contexto de autenticación ─────────────────────────────────
export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function RequireAuth({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { user } = useAuth();
  if (!user || user.rol !== 'admin') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem('finobras_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });

  function login(userData, token) {
    localStorage.setItem('finobras_token', token);
    localStorage.setItem('finobras_user', JSON.stringify(userData));
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem('finobras_token');
    localStorage.removeItem('finobras_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

          <Route path="/*" element={
            <RequireAuth>
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                  <Routes>
                    <Route index element={<Dashboard />} />
                    <Route path="nuevo" element={<NuevoMovimiento />} />
                    <Route path="movimientos" element={<Movimientos />} />
                    <Route path="vencimientos" element={<Vencimientos />} />
                    <Route path="por-obra" element={<PorObra />} />
                    <Route path="flujo" element={<FlujoDeFondos />} />
                    <Route path="config" element={
                      <RequireAdmin><Configuracion /></RequireAdmin>
                    } />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
              </div>
            </RequireAuth>
          } />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
