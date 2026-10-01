import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, Users, Calendar, Music, MessageSquare, LogOut, Menu } from 'lucide-react';
import { useState } from 'react';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_12820478-844c-49f1-b6bd-7ca7ece32718/artifacts/wn18b1ap_Logomarca-Babecue.png';

export const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isVolunteer = user?.role === 'Voluntário';

  const allMenuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: true },
    { path: '/volunteers', label: 'Voluntários', icon: Users, adminOnly: true },
    { path: '/schedules', label: 'Escalas', icon: Calendar },
    { path: '/songs', label: 'Repertório', icon: Music },
    { path: '/chat', label: 'Mensagens', icon: MessageSquare, adminOnly: true },
  ];

  const menuItems = allMenuItems.filter(item => !(item.adminOnly && isVolunteer));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="h-screen flex bg-white" data-testid="main-layout">
      <aside className="w-64 bg-white border-r border-[#e28b95]/30 hidden md:flex flex-col" data-testid="sidebar">
        <div className="p-6 border-b border-[#e28b95]/30">
          <img src={LOGO_URL} alt="Red Music" className="h-12 w-auto" data-testid="sidebar-logo" />
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`menu-${item.path.slice(1)}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-md font-medium transition-colors ${
                  isActive
                    ? 'bg-[#f7e1e1] text-[#c72137]'
                    : 'text-[#4b5563] hover:bg-[#fcf7f6]'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#e28b95]/30">
          <div className="flex items-center gap-3 mb-3 px-4">
            <div className="w-10 h-10 rounded-full bg-[#f7e1e1] flex items-center justify-center text-[#c72137] font-bold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[#111111]" data-testid="user-name">{user?.name}</p>
              <p className="text-xs text-[#6b7280]">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className="w-full flex items-center gap-2 px-4 py-2 text-[#c72137] hover:bg-[#f7e1e1] rounded-md font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-[#e28b95]/30 flex items-center justify-between px-6" data-testid="header">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-[#4b5563]"
              data-testid="mobile-menu-button"
            >
              <Menu className="w-6 h-6" />
            </button>
            <img src={LOGO_URL} alt="Red Music" className="h-10 w-auto md:hidden" />
            <h1 className="text-2xl font-bold text-[#111111] tracking-tight hidden md:block">Red Music</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#6b7280]" data-testid="header-user-email">{user?.email}</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-[#fcf7f6] p-6 md:p-8" data-testid="main-content">
          <Outlet />
        </main>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-50" onClick={() => setMobileMenuOpen(false)}>
          <div className="w-64 h-full bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[#e28b95]/30">
              <img src={LOGO_URL} alt="Red Music" className="h-12 w-auto" />
            </div>
            <nav className="p-4 space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-md font-medium transition-colors ${
                      isActive
                        ? 'bg-[#f7e1e1] text-[#c72137]'
                        : 'text-[#4b5563] hover:bg-[#fcf7f6]'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
};
