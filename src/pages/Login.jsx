function Login() {
    return (
        <main className="login-page">
            <section className="login-branding">
                <div className="brand-logo">
                    <h1>IV Connect</h1>
                    <p>Industrial Visit Management System</p>
                </div>

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
                <div className="login-header">
                    <h2>Welcome Back !</h2>
                    <p>Sign in to continue your journey with us.</p>
                </div>

                <div className="login-card">
                    <form className="login-form">
                        <div className="form-group">
                            <label htmlFor="email">Email Address</label>
                            <input 
                                type="email"
                                id="email"
                                name="email"
                                placeholder="Enter your registered email"
                                autoComplete="email" 
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input 
                                type="password" 
                                name="password" 
                                id="password" 
                                placeholder="Enter your password" 
                                autoComplete="current-password"
                            />
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
                    <button 
                        className="social-login-button"
                        type="button"
                    >
                        <span className="google-icon" aria-hidden="true">G</span>
                        Continue with Google
                    </button>
                    <button 
                        className="social-login-button"
                        type="button"
                    >
                        <span className="mobile-icon" aria-hidden="true">📱</span>
                        Continue with Mobile OTP
                    </button>
                    <div className="request-access">
                        <p>
                            Don't have an account?
                            <a href="#" className="request-access-link">
                                Request Access
                            </a>
                        </p>
                    </div>
                </div>
            </section>
        </main>
    )
}

export default Login