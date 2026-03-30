import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { setAccessToken, authApi } from '@/lib/api';
import { toast } from 'sonner';

export default function LoginPage() {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [initData, setInitData] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'token' | 'telegram'>('token');

  const handleTokenLogin = async () => {
    if (!token.trim()) return;
    setLoading(true);
    try {
      setAccessToken(token.trim());
      // Verify the token works
      const user = await authApi.me();
      if (user.role !== 'admin') {
        setAccessToken(null);
        toast.error('Access denied. Admin role required.');
        return;
      }
      toast.success('Logged in successfully');
      navigate('/');
    } catch {
      setAccessToken(null);
      toast.error('Invalid token');
    } finally {
      setLoading(false);
    }
  };

  const handleTelegramLogin = async () => {
    if (!initData.trim()) return;
    setLoading(true);
    try {
      const result = await authApi.telegram(initData.trim());
      if (result.user.role !== 'admin') {
        toast.error('Access denied. Admin role required.');
        return;
      }
      setAccessToken(result.access_token);
      toast.success('Logged in successfully');
      navigate('/');
    } catch {
      toast.error('Invalid Telegram initData');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">YeWaledoch Admin</h1>
          <p className="text-gray-500 mt-1">Sign in to the admin backoffice</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {/* Mode toggle */}
          <div className="flex rounded-lg border border-gray-200 mb-6">
            <button
              onClick={() => setMode('token')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                mode === 'token'
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              JWT Token
            </button>
            <button
              onClick={() => setMode('telegram')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                mode === 'telegram'
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Telegram initData
            </button>
          </div>

          {mode === 'token' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  JWT Token
                </label>
                <textarea
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste your JWT token here..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none font-mono"
                />
              </div>
              <button
                onClick={handleTokenLogin}
                disabled={loading || !token.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <LogIn size={18} />
                {loading ? 'Verifying...' : 'Sign In'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telegram initData
                </label>
                <textarea
                  value={initData}
                  onChange={(e) => setInitData(e.target.value)}
                  placeholder="Paste Telegram initData string here..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none font-mono"
                />
              </div>
              <button
                onClick={handleTelegramLogin}
                disabled={loading || !initData.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <LogIn size={18} />
                {loading ? 'Authenticating...' : 'Sign In with Telegram'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
