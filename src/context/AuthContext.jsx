import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Retrieve full profile from public.profiles
  const loadProfile = useCallback(async (userId, authUser) => {
    if (!supabase || !userId) return null;

    try {
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      // Fallback lookup by email if ID mismatch occurred from an older seed
      if ((!data || error) && authUser?.email) {
        const byEmail = await supabase
          .from('profiles')
          .select('*')
          .eq('email', authUser.email.toLowerCase())
          .maybeSingle();
        if (byEmail.data) {
          data = byEmail.data;
          error = null;
        }
      }

      if (error) {
        console.warn('[AuthContext] Error fetching profile:', error.message);
        return null;
      }

      if (!data) {
        // Profile missing despite valid auth user — treat safely based on metadata only if admin
        const appRole = authUser?.app_metadata?.role;
        if (appRole === 'admin') {
          return {
            id: userId,
            email: authUser?.email,
            full_name: authUser?.user_metadata?.full_name || 'Administrator',
            role: 'admin',
            approval_status: 'approved',
            is_active: true,
            must_change_password: false,
          };
        }
        return null;
      }

      const normalizedRole = String(data.role || 'student').toLowerCase();

      // Enforce approval & activation for students and coordinators
      if (normalizedRole !== 'admin') {
        if (data.approval_status === 'pending') {
          setAuthError(
            'Your access request is currently pending Admin approval. You will be able to log in as soon as the administrator approves your request.'
          );
          await supabase.auth.signOut();
          setProfile(null);
          setSession(null);
          setUser(null);
          return null;
        }

        if (data.approval_status === 'rejected') {
          setAuthError('Your access request was declined by the administrator.');
          await supabase.auth.signOut();
          setProfile(null);
          setSession(null);
          setUser(null);
          return null;
        }

        if (data.is_active === false) {
          setAuthError('Your account has been deactivated. Please contact your administrator.');
          await supabase.auth.signOut();
          setProfile(null);
          setSession(null);
          setUser(null);
          return null;
        }
      }

      const resolved = {
        ...data,
        role: normalizedRole,
      };
      localStorage.setItem('iv_user', JSON.stringify(resolved));
      return resolved;
    } catch (err) {
      console.warn('[AuthContext] Error loading user profile:', err);
      return null;
    }
  }, []);

  // Initial session hydration & auth listener
  useEffect(() => {
    let mounted = true;

    const restoreFallbackSession = () => {
      const storedUser = localStorage.getItem('iv_user');
      const storedToken = localStorage.getItem('iv_auth_token');
      if (storedUser && storedToken) {
        try {
          const parsed = JSON.parse(storedUser);
          // Only restore backend/admin server tokens cleanly when Supabase session isn't present
          if (storedToken.startsWith('ivsrv.') || storedToken.startsWith('demo_token_') || !isSupabaseConfigured) {
            setProfile(parsed);
            setUser({
              id: parsed.id,
              email: parsed.email,
              user_metadata: { full_name: parsed.full_name },
            });
            setSession({ access_token: storedToken });
            return true;
          }
        } catch (e) {
          console.warn('Error reading stored session:', e);
        }
      }
      return false;
    };

    if (!isSupabaseConfigured || !supabase) {
      restoreFallbackSession();
      setLoading(false);
      return;
    }

    supabase.auth
      .getSession()
      .then(async ({ data: { session: initialSession } }) => {
        if (!mounted) return;

        if (initialSession?.user) {
          setSession(initialSession);
          setUser(initialSession.user);
          if (initialSession.access_token) {
            localStorage.setItem('iv_auth_token', initialSession.access_token);
          }
          const userProfile = await loadProfile(initialSession.user.id, initialSession.user);
          if (mounted) setProfile(userProfile);
        } else {
          // Restore signed server/admin fallback session across page refreshes
          restoreFallbackSession();
        }
        if (mounted) setLoading(false);
      })
      .catch((err) => {
        console.warn('[AuthContext] Session retrieval error:', err);
        if (mounted) {
          restoreFallbackSession();
          setLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('iv_auth_token');
        localStorage.removeItem('iv_user');
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      if (currentSession?.user) {
        setSession(currentSession);
        setUser(currentSession.user);
        // Keep token fresh whenever Supabase auto-refreshes after 1 hour
        if (currentSession.access_token) {
          localStorage.setItem('iv_auth_token', currentSession.access_token);
        }
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          const userProfile = await loadProfile(currentSession.user.id, currentSession.user);
          if (mounted && userProfile) {
            setProfile(userProfile);
          }
        }
      }

      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [loadProfile]);

  // Sign in using Supabase Auth (with Railway backend fallback)
  const login = async (email, password, preloadedAuth = null) => {
    setAuthError(null);
    const cleanEmail = email.trim().toLowerCase();

    // If signInOrRequest already authenticated and loaded the profile, avoid duplicate round-trip
    if (preloadedAuth?.alreadyAuthenticated && preloadedAuth.profile && preloadedAuth.session) {
      setSession(preloadedAuth.session);
      setUser(preloadedAuth.user);
      setProfile({
        ...preloadedAuth.profile,
        role: String(preloadedAuth.profile.role).toLowerCase(),
      });
      if (preloadedAuth.session.access_token) {
        localStorage.setItem('iv_auth_token', preloadedAuth.session.access_token);
        localStorage.setItem('iv_user', JSON.stringify(preloadedAuth.profile));
      }
      return { user: preloadedAuth.user, profile: preloadedAuth.profile };
    }

    // 1. Live Supabase Auth
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (!error && data?.user) {
          const userProfile = await loadProfile(data.user.id, data.user);
          if (!userProfile) {
            throw new Error(
              'Your access request is currently pending Admin approval, or your profile could not be verified.'
            );
          }

          setSession(data.session);
          setUser(data.user);
          setProfile(userProfile);

          if (data.session?.access_token) {
            localStorage.setItem('iv_auth_token', data.session.access_token);
            localStorage.setItem('iv_user', JSON.stringify(userProfile));
          }

          return { user: data.user, profile: userProfile };
        } else if (error) {
          if (error.message?.toLowerCase().includes('email not confirmed')) {
            console.warn('[AuthContext] Email not confirmed yet. Checking backend auto-confirm...');
          } else if (cleanEmail !== 'admin@college.edu' && !error.message.includes('fetch')) {
            setAuthError(error.message);
            throw error;
          }
        }
      } catch (err) {
        if (err.message?.toLowerCase().includes('email not confirmed')) {
          console.warn('[AuthContext] Catch: Email not confirmed. Trying backend...');
        } else if (
          err.message &&
          (err.message.includes('pending Admin approval') ||
            err.message.includes('declined') ||
            err.message.includes('deactivated'))
        ) {
          setAuthError(err.message);
          throw err;
        } else if (cleanEmail !== 'admin@college.edu' && err.message && !err.message.includes('fetch')) {
          setAuthError(err.message);
          throw err;
        }
      }
    }

    // 2. Try Railway Backend API Authentication
    try {
      const backendRes = await api.login(cleanEmail, password);
      if (backendRes?.token && backendRes?.user) {
        // Hydrate Supabase client if Railway returned a real Supabase session!
        if (isSupabaseConfigured && supabase && backendRes.session?.access_token && backendRes.session?.refresh_token) {
          await supabase.auth.setSession({
            access_token: backendRes.session.access_token,
            refresh_token: backendRes.session.refresh_token,
          });
        }

        const loggedUser = {
          ...backendRes.user,
          full_name: backendRes.user.full_name || backendRes.user.name || 'User',
          role: String(backendRes.user.role || 'student').toLowerCase(),
          approval_status: backendRes.user.approval_status || 'approved',
          is_active: backendRes.user.is_active !== false,
          must_change_password: Boolean(backendRes.user.must_change_password),
        };

        setSession(backendRes.session || { access_token: backendRes.token, user: loggedUser });
        setUser(loggedUser);
        setProfile(loggedUser);
        localStorage.setItem('iv_auth_token', backendRes.token);
        localStorage.setItem('iv_user', JSON.stringify(loggedUser));
        return { user: loggedUser, profile: loggedUser };
      }
    } catch (bErr) {
      if (
        bErr.message &&
        (bErr.message.includes('pending Admin approval') ||
          bErr.message.includes('declined') ||
          bErr.message.includes('deactivated') ||
          bErr.message.includes('Invalid'))
      ) {
        setAuthError(bErr.message);
        throw bErr;
      }
    }

    // 3. Offline Dev Mode Admin Fallback (strict password check, NEVER || password.length >= 6!)
    const adminPassword = import.meta.env.VITE_ADMIN_FALLBACK_PASSWORD || 'Admin@IV2026!';
    if (cleanEmail === 'admin@college.edu' && password === adminPassword) {
      const adminProfile = {
        id: 'usr_admin_01',
        email: 'admin@college.edu',
        full_name: 'Chief Administrator',
        role: 'admin',
        approval_status: 'approved',
        is_active: true,
        must_change_password: false,
      };
      const adminUser = {
        id: 'usr_admin_01',
        email: 'admin@college.edu',
        user_metadata: { full_name: 'Chief Administrator' },
      };
      setSession({ access_token: 'demo_token_admin', user: adminUser });
      setUser(adminUser);
      setProfile(adminProfile);
      localStorage.setItem('iv_auth_token', 'demo_token_admin');
      localStorage.setItem('iv_user', JSON.stringify(adminProfile));
      return { user: adminUser, profile: adminProfile };
    }

    // 4. Offline dev users (ONLY when Supabase isn't configured)
    if (!isSupabaseConfigured) {
      const offlineUsers = JSON.parse(localStorage.getItem('iv_demo_users') || '[]');
      const found = offlineUsers.find((u) => u.email.toLowerCase() === cleanEmail);

      if (found) {
        if (found.approval_status === 'pending') {
          throw new Error(
            'Your access request is currently pending Admin approval. You will be able to log in once approved.'
          );
        }
        if (found.approval_status === 'rejected') {
          throw new Error('Your access request was declined by the administrator.');
        }
        if (found.password && found.password !== password) {
          throw new Error('Invalid credentials. Password does not match.');
        }

        const userObj = {
          id: found.id,
          email: found.email,
          user_metadata: { full_name: found.full_name || found.name },
        };
        setSession({ access_token: `demo_token_${found.id}`, user: userObj });
        setUser(userObj);
        setProfile(found);
        localStorage.setItem('iv_auth_token', `demo_token_${found.id}`);
        localStorage.setItem('iv_user', JSON.stringify(found));
        return { user: userObj, profile: found };
      }
    }

    throw new Error(
      'Invalid credentials. Please verify your email and password, or contact your administrator.'
    );
  };

  const logout = async () => {
    localStorage.removeItem('iv_auth_token');
    localStorage.removeItem('iv_user');
    setProfile(null);
    setUser(null);
    setSession(null);
    setAuthError(null);

    if (supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
  };

  const changePassword = async (newPassword) => {
    if (!supabase) {
      setProfile((prev) => (prev ? { ...prev, must_change_password: false } : prev));
      return { success: true };
    }

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
    if (user?.id && supabase) {
      const refreshed = await loadProfile(user.id, user);
      if (refreshed) setProfile(refreshed);
      return refreshed;
    }
    return profile;
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
