import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FileEdit,
  FileText,
  Users,
  Flag,
  Rss,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { getAccessToken, setAccessToken, authApi } from './lib/api';
import DashboardPage from './pages/DashboardPage';
import DraftQueuePage from './pages/DraftQueuePage';
import DraftEditPage from './pages/DraftEditPage';
import ContentManagementPage from './pages/ContentManagementPage';
import UserManagementPage from './pages/UserManagementPage';
import ReportsPage from './pages/ReportsPage';
import ScraperPage from './pages/ScraperPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/drafts', icon: FileEdit, label: 'Draft Queue' },
  { to: '/content', icon: FileText, label: 'Content' },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/reports', icon: Flag, label: 'Reports' },
  { to: '/scraper', icon: Rss, label: 'Scraper' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

function AdminLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminName, setAdminName] = useState<string | null>(null);

  useEffect(() => {
    authApi.me().then((user) => {
      setAdminName(user.first_name || user.username || 'Admin');
    }).catch(() => {
      // Token might be invalid
    });
  }, []);

  const handleLogout = () => {
    setAccessToken(null);
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform lg:translate-x-0 lg:static lg:z-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <h1 className="text-lg font-bold text-gray-900">YeWaledoch Admin</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          {adminName && (
            <p className="text-xs text-gray-500 mb-2 px-3">
              Signed in as <span className="font-medium text-gray-700">{adminName}</span>
            </p>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <header className="h-16 flex items-center px-4 border-b border-gray-200 bg-white lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            <Menu size={24} />
          </button>
          <h1 className="ml-3 text-lg font-bold text-gray-900">YeWaledoch Admin</h1>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/drafts" element={<DraftQueuePage />} />
            <Route path="/drafts/:draftId" element={<DraftEditPage />} />
            <Route path="/content" element={<ContentManagementPage />} />
            <Route path="/users" element={<UserManagementPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/scraper" element={<ScraperPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const token = getAccessToken();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={token ? <AdminLayout /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
}
