import { Mail, LockKeyhole, Smartphone, GraduationCap, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
function Login() {
    const [selectedRole, setSelectedRole] = useState("Student");
    const [showPassword, setShowPassword] = useState(false);
    return (
        <main className="login-page">
            <img src="/images/login-overlay.png" alt="" className="login-overlay" aria-hidden="true"/>
            <div className="brand-logo">
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
                    <div className="role-selector">
                        <button
                            type="button"
                            className={`role-option ${selectedRole === "Student" ? "active" : ""}`}
                            onClick={() => setSelectedRole("Student")}
                        >
                            <GraduationCap size={24} />
                            <span>Student</span>
                        </button>

                        <button
                            type="button"
                            className={`role-option ${selectedRole === "Coordinator" ? "active" : ""}`}
                            onClick={() => setSelectedRole("Coordinator")}
                        >
                            <ShieldCheck size={24} />
                            <span>Coordinator</span>
                        </button>
                    </div>
                    <form className="login-form">
                        <div className="form-group">
                            <Mail className="input-icon" size={19} strokeWidth={1.7} />
                            <input 
                                type="email"
                                id="email"
                                name="email"
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
                                placeholder="Password" 
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label = {showPassword ? "Hide password" : "Show password"}
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

                            <a href="#" className="forgot-password">
                                Forgot Password?
                            </a>
                        </div>

                        <button
                            type="submit"
                            className="login-button"
                        >
                            Sign In  
                        </button>
                    </form>

                    <div className="login-divider">
                        <span></span>
                        <p>Or continue with</p>
                        <span></span>
                    </div>
                    <div className="alternate-login">
                        <button 
                            className="social-login-button"
                            type="button"
                        >
                            <svg className="google-icon" viewBox="0 0 48 48" width="20" height="20" aria-label="Google"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44z"/><path fill="#FBBC05" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8l6.8-5.3z"/><path fill="#EA4335" d="M24 11.9c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 5.9 29.5 4 24 4A20 20 0 0 0 5.8 15.1l6.8 5.3c1.6-4.9 6.1-8.5 11.4-8.5z"/></svg>
                            Google
                        </button>
                        <button 
                            className="social-login-button"
                            type="button"
                        >
                            <span className="mobile-icon" aria-hidden="true"><Smartphone size={19} strokeWidth={1.8} /></span>
                            Mobile OTP
                        </button>
                    </div>
                    <div className="request-access">
                        <p>
                            New here?
                            <a href="#" className="request-access-link">
                                Request Access
                            </a>
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
    )
}

export default Login