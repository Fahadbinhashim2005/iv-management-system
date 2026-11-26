import { Mail, LockKeyhole, GraduationCap, ShieldCheck, Crown, Eye, EyeOff, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

function Login() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login, logout, user, profile, loading } = useAuth();

    const [selectedRole, setSelectedRole] = useState(
        () => localStorage.getItem("iv_saved_role") || "Student"
    );
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState(
        () => localStorage.getItem("iv_saved_email") || ""
    );
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [statusBanner, setStatusBanner] = useState(null);

    // If user is already signed in, skip login screen on reload / direct visit
    useEffect(() => {
        if (loading || !user || !profile?.role || profile.is_active === false) return;
        const returnTo = searchParams.get("returnTo");
        const safeReturnTo =
            returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")
                ? returnTo
                : null;
        const role = String(profile.role).toLowerCase();
        navigate(safeReturnTo || `/${role}/dashboard`, { replace: true });
    }, [loading, user, profile, navigate, searchParams]); // { type: 'success' | 'pending' | 'error', message: string }

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setStatusBanner(null);

        if (!email.trim() || !password) {
            setStatusBanner({
                type: 'error',
                message: "Please enter both your email/ID and password.",
            });
            return;
        }

        try {
            setSubmitting(true);

            // Step 1: Check status or register first-time access request
            const checkRes = await api.signInOrRequest(email, password, selectedRole);

            if (checkRes.status === 'request_created') {
                // First-time typing! Access request was dispatched to Admin
                setStatusBanner({
                    type: 'success',
                    message: `Access Request Submitted! Since this is your first time signing in, a request has been sent to the Admin. As soon as the Admin approves your account, you can log in right here with this password to view your dashboard.`,
                });
                setPassword("");
                setSubmitting(false);
                return;
            }

            if (checkRes.status === 'pending') {
                setStatusBanner({
                    type: 'pending',
                    message: "Your access request is currently pending Admin approval. You will be able to log in as soon as the administrator approves your request.",
                });
                setSubmitting(false);
                return;
            }

            if (checkRes.status === 'rejected') {
                setStatusBanner({
                    type: 'error',
                    message: "Your access request was declined by the administrator. Please contact your department office.",
                });
                setSubmitting(false);
                return;
            }

            if (checkRes.status === 'inactive') {
                setStatusBanner({
                    type: 'error',
                    message: "Your account has been deactivated. Please contact your administrator.",
                });
                setSubmitting(false);
                return;
            }

            if (checkRes.status === 'wrong_password') {
                setStatusBanner({
                    type: 'error',
                    message: "Incorrect password for an existing account. Please double-check your password and try again.",
                });
                setSubmitting(false);
                return;
            }

            // Step 2: Account is approved! Authenticate via Supabase Auth
            const { profile } = await login(email, password, checkRes);

            const userRole = (profile?.role || "").toLowerCase();
            const chosenTab = selectedRole.toLowerCase();

            if (userRole !== chosenTab && userRole !== 'admin') {
                await logout();
                setStatusBanner({
                    type: 'error',
                    message: `This account is authorized as '${profile?.role}'. Please switch to the ${profile?.role} tab to continue.`,
                });
                setSubmitting(false);
                return;
            }

            // Successfully approved and verified — save convenience email/role for next login
            localStorage.setItem("iv_saved_email", email.trim());
            localStorage.setItem("iv_saved_role", selectedRole);

            const returnTo = searchParams.get("returnTo");
            const safeReturnTo =
                returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")
                    ? returnTo
                    : null;
            navigate(safeReturnTo || `/${userRole}/dashboard`, { replace: true });
        } catch (err) {
            console.error("Login/Request error:", err);
            const errText = err.message || "Invalid credentials or unauthorized login.";
            
            if (errText.includes("pending Admin approval")) {
                setStatusBanner({
                    type: 'pending',
                    message: "Your access request is currently pending Admin approval. You will be able to log in once approved.",
                });
            } else {
                setStatusBanner({
                    type: 'error',
                    message: errText,
                });
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="login-page">
            <img src="/images/login-overlay.png" alt="" className="login-overlay" aria-hidden="true"/>
            <div 
                className="brand-logo" 
                style={{ cursor: "pointer" }}
                onClick={() => navigate("/")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate('/'); }}
            >
                <h1>IV Connect</h1>
                <p>Industrial Visit Management System</p>
            </div>
            <section className="login-branding">
                <div className="brand-content">
                    <h2>Every Journey Begins With Connection...</h2>
                    <p>Plan, manage and experience industrial visits seamlessly with IV Connect...</p>
                </div>
                <div className="brand-features">
                    <div className="feature-item">
                        <span>📍</span>
                        <p>Smart Visit Planning </p>
                    </div>
                    <div className="feature-item">
                        <span>🚌</span>
                        <p>Travel Coordination</p>
                    </div>
                    <div className="feature-item">
                        <span>📋</span>
                        <p>Digital Attendance</p>
                    </div>
                    <div className="feature-item">
                        <span>🤝</span>
                        <p>Seamless Collaboration</p>
                    </div>
                </div>
            </section>

            <section className="login-section">
                <div className="login-card">
                    <div className="login-header">
                        <h2>Sign In</h2>
                        <p>Access your IV dashboard</p>
                    </div>

                    {/* Role tabs */}
                    <div className="role-selector" role="group" aria-label="Select portal role">
                        <button
                            type="button"
                            aria-pressed={selectedRole === "Student"}
                            className={`role-option ${selectedRole === "Student" ? "active" : ""}`}
                            onClick={() => { setSelectedRole("Student"); setStatusBanner(null); }}
                        >
                            <GraduationCap size={20} />
                            <span>Student</span>
                        </button>

                        <button
                            type="button"
                            aria-pressed={selectedRole === "Coordinator"}
                            className={`role-option ${selectedRole === "Coordinator" ? "active" : ""}`}
                            onClick={() => { setSelectedRole("Coordinator"); setStatusBanner(null); }}
                        >
                            <ShieldCheck size={20} />
                            <span>Coordinator</span>
                        </button>

                        <button
                            type="button"
                            aria-pressed={selectedRole === "Admin"}
                            className={`role-option ${selectedRole === "Admin" ? "active" : ""}`}
                            onClick={() => { setSelectedRole("Admin"); setStatusBanner(null); }}
                        >
                            <Crown size={20} />
                            <span>Admin</span>
                        </button>
                    </div>

                    {/* Status Feedback Banner */}
                    {statusBanner && (
                        <div className={`flex items-start gap-2.5 rounded-2xl p-3.5 text-xs font-semibold mb-4 border ${
                            statusBanner.type === 'success'
                                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                : statusBanner.type === 'pending'
                                ? 'bg-amber-50 text-amber-900 border-amber-300'
                                : 'bg-red-50 text-red-800 border-red-200'
                        }`}>
                            {statusBanner.type === 'success' ? (
                                <CheckCircle2 size={18} className="text-emerald-700 shrink-0 mt-0.5" />
                            ) : statusBanner.type === 'pending' ? (
                                <Clock size={18} className="text-amber-700 shrink-0 mt-0.5" />
                            ) : (
                                <AlertCircle size={18} className="text-red-700 shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1 leading-relaxed">
                                {statusBanner.message}
                            </div>
                        </div>
                    )}

                    <form className="login-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <Mail className="input-icon" size={19} strokeWidth={1.7} />
                            <input 
                                type="email"
                                id="email"
                                name="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email / College ID"
                                autoComplete="email" 
                            />
                        </div>
                        <div className="form-group">
                            <LockKeyhole className="input-icon" size={19} strokeWidth={1.7} />
                            <input 
                                type={showPassword ? "text" : "password"}
                                name="password" 
                                id="password" 
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password" 
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? (<EyeOff size={22} strokeWidth={1.7} />) : (<Eye size={22} strokeWidth={1.7} />)}
                            </button>
                        </div>
                        <div className="login-options">
                            <label className="remember-me">
                                <input 
                                    type="checkbox" 
                                    name="rememberMe" 
                                />
                                Remember Me
                            </label>
                            <button
                                type="button"
                                className="forgot-password"
                                onClick={() =>
                                    setStatusBanner({
                                        type: "pending",
                                        message: "First-time sign-ins automatically send an approval request to the Admin. For password resets, contact your department administrator.",
                                    })
                                }
                            >
                                Help & Support
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="login-button disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {submitting ? "Checking Authorization..." : "Sign In"}  
                        </button>
                    </form>

                    <div className="login-divider">
                        <span></span>
                        <p>Instant Self-Request & Admin Approval</p>
                        <span></span>
                    </div>

                    <div className="request-access">
                        <p className="text-[11px] text-gray-500 leading-normal">
                            First time here? Just enter your email and desired password above and click <strong>Sign In</strong>. An access request will be sent to the administrator.
                        </p>
                    </div>

                    <div className="login-landscape">
                        <img
                            src="/images/login-svg.png"
                            alt="Kerala landscape with palm trees, road and tourist bus"
                        />
                    </div>
                </div>
            </section>
        </main>
    );
}

export default Login;
