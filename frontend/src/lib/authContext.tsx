import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as signalR from '@microsoft/signalr';
import { apiFetch, getApiBase, getDevUserEmail, setDevUserEmail } from './api';
import type { NotificationItem, UserProfile } from '../types/api';

interface AuthContextValue {
  user: UserProfile | null;
  devUsers: UserProfile[];
  isLoading: boolean;
  switchDevUser: (email: string) => void;
  latestToast: NotificationItem | null;
  dismissToast: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [devEmail, setDevEmailState] = useState<string>(getDevUserEmail());
  const [latestToast, setLatestToast] = useState<NotificationItem | null>(null);

  const meQuery = useQuery({
    queryKey: ['auth-me', devEmail],
    queryFn: () => apiFetch<UserProfile>('/api/v1/auth/me'),
    retry: false,
  });

  const devUsersQuery = useQuery({
    queryKey: ['dev-users'],
    queryFn: () => apiFetch<UserProfile[]>('/api/v1/auth/dev-users'),
    retry: false,
  });

  useEffect(() => {
    if (!meQuery.data) return;

    const hubUrl = `${getApiBase()}/hubs/notifications?access_token=${encodeURIComponent(devEmail)}`;
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
  }, [meQuery.data?.id, devEmail, queryClient]);

  const switchDevUser = (email: string) => {
    setDevUserEmail(email);
    setDevEmailState(email);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider
      value={{
        user: meQuery.data ?? null,
        devUsers: devUsersQuery.data ?? [],
        isLoading: meQuery.isLoading,
        switchDevUser,
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

export function isLeadership(user: UserProfile | null): boolean {
  return user?.role === 'CampusHead' || user?.role === 'Deputy';
}

export function isDeptHead(user: UserProfile | null): boolean {
  return user?.role === 'EventsHead' || user?.role === 'ClubsHead' || user?.role === 'MarketingHead';
}
