import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Helper to retrieve the full profile from public.profiles
  const loadProfile = useCallback(async (userId, authUser) => {
    if (!supabase || !userId) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        const metadataRole = authUser?.app_metadata?.role || authUser?.user_metadata?.role || 'student';
        return {
          id: userId,
          email: authUser?.email,
          full_name: authUser?.user_metadata?.full_name || 'User',
          role: String(metadataRole).toLowerCase(),
          approval_status: 'approved',
          is_active: true,
          must_change_password: false,
        };
      }

      // Check approval and active status (Admins are always authorized)
      if (data.role !== 'admin') {
        if (data.approval_status === 'pending') {
          await supabase.auth.signOut();
          setAuthError('Your access request is currently pending Admin approval. You will be able to log in as soon as the administrator approves your request.');
          setProfile(null);
          setSession(null);
          setUser(null);
          return null;
        }

        if (data.approval_status === 'rejected') {
          await supabase.auth.signOut();
          setAuthError('Your access request was declined by the administrator.');
          setProfile(null);
          setSession(null);
          setUser(null);
          return null;
        }

        if (!data.is_active) {
          await supabase.auth.signOut();
          setAuthError('Your account has been deactivated. Please contact your administrator.');
          setProfile(null);
          setSession(null);
          setUser(null);
          return null;
        }
      }

      return {
        ...data,
        role: String(data.role).toLowerCase(),
      };
    } catch (err) {
      console.warn('[AuthContext] Error loading user profile:', err);
      return null;
    }
  }, []);

  // Initial session hydration and auth state listener
  useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!mounted) return;

      if (initialSession?.user) {
        setSession(initialSession);
        setUser(initialSession.user);
        const userProfile = await loadProfile(initialSession.user.id, initialSession.user);
        if (mounted) setProfile(userProfile);
      }
      if (mounted) setLoading(false);
    }).catch((err) => {
      console.warn('[AuthContext] Session retrieval error:', err);
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;

        setSession(currentSession);
        setUser(currentSession?.user || null);

        if (currentSession?.user) {
          const userProfile = await loadProfile(currentSession.user.id, currentSession.user);
          if (mounted) setProfile(userProfile);
        } else {
          if (mounted) setProfile(null);
        }
        if (mounted) setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [loadProfile]);

  // Sign in using Supabase Auth
  const login = async (email, password) => {
    setAuthError(null);

    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase client is not configured.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setAuthError(error.message);
      throw error;
    }

    const userProfile = await loadProfile(data.user.id, data.user);
    if (!userProfile) {
      throw new Error('Your account is currently pending Admin approval.');
    }

    setSession(data.session);
    setUser(data.user);
    setProfile(userProfile);

    if (data.session?.access_token) {
      localStorage.setItem('iv_auth_token', data.session.access_token);
      localStorage.setItem('iv_user', JSON.stringify(userProfile));
    }

    return { user: data.user, profile: userProfile };
  };

  const logout = async () => {
    localStorage.removeItem('iv_auth_token');
    localStorage.removeItem('iv_user');
    setProfile(null);
    setUser(null);
    setSession(null);
    setAuthError(null);

    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  const changePassword = async (newPassword) => {
    if (!supabase) throw new Error('Supabase is not configured.');

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;

    try {
      const token = session?.access_token || localStorage.getItem('iv_auth_token');
      const apiUrl = import.meta.env.VITE_API_URL 
        ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api/auth/password-changed` 
        : '/api/auth/password-changed';

      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    } catch (err) {
      console.warn('[AuthContext] Backend password-changed notification notice:', err);
    }

    setProfile((prev) => (prev ? { ...prev, must_change_password: false } : prev));
    return { success: true };
  };

  const refreshProfile = async () => {
    if (user?.id) {
      const refreshed = await loadProfile(user.id, user);
      setProfile(refreshed);
      return refreshed;
    }
    return null;
  };

  const value = {
    session,
    user,
    profile,
    loading,
    authError,
    setAuthError,
    login,
    logout,
    changePassword,
    refreshProfile,
    isConfigured: isSupabaseConfigured,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
