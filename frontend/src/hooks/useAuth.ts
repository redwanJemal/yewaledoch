/**
 * Authentication hook for YeWaledoch
 * Forked from Gebeya — adapted for parenting community roles.
 */

import { useEffect, useState } from 'react';
import { useTelegram } from '@/lib/telegram';
import { authApi, usersApi, setAccessToken, getAccessToken, type User } from '@/lib/api';

export function useAuth() {
  const { initData, isReady, isInTelegram } = useTelegram();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;

    const init = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Check if we have a token
        const existingToken = getAccessToken();

        if (existingToken) {
          try {
            const userData = await usersApi.me();
            setUser(userData);
            setIsLoading(false);
            return;
          } catch {
            // Token invalid, clear it
            setAccessToken(null);
          }
        }

        // If in Telegram, login with initData
        if (initData && isInTelegram) {
          const result = await authApi.telegram(initData);
          setAccessToken(result.access_token);
          setUser(result.user);
        } else if (!isInTelegram) {
          // Dev mode - create mock user
          console.log('Dev mode: Creating mock user');
          setUser({
            id: 'dev-user',
            telegram_id: 123456789,
            username: 'dev_user',
            first_name: 'Dev',
            last_name: 'User',
            photo_url: null,
            phone: null,
            phone_verified: false,
            role: 'admin',
            parenting_role: 'dad',
            children_data: [],
            city: 'Addis Ababa',
            reputation: 100,
            post_count: 0,
            comment_count: 0,
            expert_specialty: null,
            expert_bio: null,
            expert_verified: false,
            language: 'am',
            settings: {},
            created_at: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.error('Auth error:', e);
        setError(e instanceof Error ? e.message : 'Authentication failed');
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [isReady, initData, isInTelegram]);

  const refreshUser = async () => {
    try {
      const userData = await usersApi.me();
      setUser(userData);
    } catch (e) {
      console.error('Failed to refresh user:', e);
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    refreshUser,
  };
}
