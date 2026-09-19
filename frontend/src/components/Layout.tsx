import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheckIcon } from './icons';

function initials(nombre: string): string {
  const parts = nombre.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <>
      <header className="topbar app-topbar">
        <div className="topbar-inner">
          <NavLink to="/planillas" className="topbar-brand">
            <span className="topbar-logo">
              <ShieldCheckIcon size={17} />
            </span>
            SIGMA
          </NavLink>
          <nav className="topbar-nav">
            <NavLink to="/planillas" className={({ isActive }) => `topbar-link${isActive ? ' active' : ''}`} end>
              Planillas
            </NavLink>
            <NavLink to="/correcciones" className={({ isActive }) => `topbar-link${isActive ? ' active' : ''}`}>
              Correcciones
            </NavLink>
            <NavLink to="/catalogo" className={({ isActive }) => `topbar-link${isActive ? ' active' : ''}`}>
              Catálogo
            </NavLink>
          </nav>
          <div className="topbar-right">
            {user && (
              <>
                <div className="user-meta">
                  <span className="name">{user.nombre}</span>
                  <span className="role">{user.rol}</span>
                </div>
                <div className="avatar" title={user.nombre}>
                  {initials(user.nombre)}
                </div>
                <button className="btn btn-ghost" onClick={logout} title="Cerrar sesión">
                  Salir
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
    </>
  );
}
