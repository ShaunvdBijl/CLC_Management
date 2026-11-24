import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as signalR from '@microsoft/signalr';
import { apiFetch, getApiBase, getSessionEmail, setSessionEmail } from './api';
import type { NotificationItem, UserProfile } from '../types/api';

interface AuthContextValue {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithEmail: (email: string) => Promise<UserProfile>;
  signUp: (fullName: string, email: string, preferredCampusId: string | null) => Promise<UserProfile>;
  logout: () => void;
  latestToast: NotificationItem | null;
  dismissToast: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [sessionEmail, setSessionEmailState] = useState<string | null>(getSessionEmail());
  const [latestToast, setLatestToast] = useState<NotificationItem | null>(null);

  const meQuery = useQuery({
    queryKey: ['auth-me', sessionEmail],
    queryFn: () => apiFetch<UserProfile>('/api/v1/auth/me'),
    enabled: !!sessionEmail,
    retry: false,
  });

  useEffect(() => {
    if (!meQuery.data || !sessionEmail) return;

    const hubUrl = `${getApiBase()}/hubs/notifications?access_token=${encodeURIComponent(sessionEmail)}`;
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on('ReceiveNotification', (notification: NotificationItem) => {
      setLatestToast(notification);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    connection.start().catch(() => {});

    return () => {
      connection.stop().catch(() => {});
    };
  }, [meQuery.data?.id, sessionEmail, queryClient]);

  const loginWithEmail = async (email: string): Promise<UserProfile> => {
    const normalized = email.trim().toLowerCase();
    setSessionEmail(normalized);
    setSessionEmailState(normalized);
    try {
      const profile = await apiFetch<UserProfile>('/api/v1/auth/me');
      queryClient.setQueryData(['auth-me', normalized], profile);
      return profile;
    } catch (err) {
      setSessionEmail(null);
      setSessionEmailState(null);
      throw err;
    }
  };

  const signUp = async (
    fullName: string,
    email: string,
    preferredCampusId: string | null,
  ): Promise<UserProfile> => {
    const profile = await apiFetch<UserProfile>('/api/v1/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ fullName, email, preferredCampusId }),
    });
    const normalized = profile.email.toLowerCase();
    setSessionEmail(normalized);
    setSessionEmailState(normalized);
    queryClient.setQueryData(['auth-me', normalized], profile);
    return profile;
  };

  const logout = () => {
    setSessionEmail(null);
    setSessionEmailState(null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider
      value={{
        user: sessionEmail ? (meQuery.data ?? null) : null,
        isAuthenticated: !!sessionEmail && !!meQuery.data,
        isLoading: !!sessionEmail && meQuery.isLoading,
        loginWithEmail,
        signUp,
        logout,
        latestToast,
        dismissToast: () => setLatestToast(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function isAdmin(user: UserProfile | null): boolean {
  return user?.role === 'Admin';
}

export function isLeadership(user: UserProfile | null): boolean {
  return user?.role === 'Admin' || user?.role === 'CampusHead' || user?.role === 'Deputy';
}

export function isDeptHead(user: UserProfile | null): boolean {
  return (
    user?.role === 'Admin' ||
    user?.role === 'EventsHead' ||
    user?.role === 'ClubsHead' ||
    user?.role === 'MarketingHead'
  );
}
