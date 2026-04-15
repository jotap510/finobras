import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../App.jsx';

const links = [
  { to: '/',            label: 'Dashboard',     exact: true },
  { to: '/nuevo',       label: '+ Movimiento' },
  { to: '/movimientos', label: 'Movimientos' },
  { to: '/vencimientos',label: 'Vencimientos' },
  { to: '/por-obra',    label: 'Por Obra' },
  { to: '/flujo',       label: 'Flujo de Fondos' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="bg-blue-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <span className="font-bold text-lg tracking-tight">FinObras</span>

            {/* Links */}
            <div className="hidden md:flex items-center gap-1">
              {links.map(({ to, label, exact }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={exact}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-700 text-white'
                        : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}

              {user?.rol === 'admin' && (
                <NavLink
                  to="/config"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isActive ? 'bg-blue-700 text-white' : 'text-blue-100 hover:bg-blue-800'
                    }`
                  }
                >
                  Config
                </NavLink>
              )}
            </div>
          </div>

          {/* Usuario */}
          <div className="flex items-center gap-3">
            <span className="text-blue-200 text-sm hidden sm:block">
              {user?.nombre}
              <span className="ml-1 text-xs text-blue-400">({user?.rol})</span>
            </span>
            <button
              onClick={handleLogout}
              className="text-blue-200 hover:text-white text-sm px-2 py-1 rounded hover:bg-blue-800 transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
