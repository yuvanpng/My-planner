import { useState, useEffect } from 'react';
import { Lock, LogIn, AlertCircle } from 'lucide-react';

const AUTH_KEY = 'planner_is_authenticated';

export default function PasswordLock({ children }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const authStatus = localStorage.getItem(AUTH_KEY);
        if (authStatus === 'true') {
            setIsAuthenticated(true);
        }
        setIsLoading(false);
    }, []);

    function handleSubmit(e) {
        e.preventDefault();
        const correctPassword = import.meta.env.VITE_APP_PASSWORD || 'planner123';
        
        if (password === correctPassword) {
            localStorage.setItem(AUTH_KEY, 'true');
            setIsAuthenticated(true);
            setError('');
        } else {
            setError('Incorrect password. Please try again.');
            setPassword('');
            // Shake animation effect could be added here via class
        }
    }

    if (isLoading) {
        return (
            <div className="login-screen">
                <div className="login-loader"></div>
            </div>
        );
    }

    if (isAuthenticated) {
        return children;
    }

    return (
        <div className="login-screen">
            <div className="login-container">
                <div className="login-header">
                    <div className="login-icon">
                        <Lock size={32} />
                    </div>
                    <h1>My Planner</h1>
                    <p>Enter password to unlock your workspace</p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className={`login-input-group ${error ? 'has-error' : ''}`}>
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="login-error">
                            <AlertCircle size={14} />
                            <span>{error}</span>
                        </div>
                    )}

                    <button type="submit" className="login-btn">
                        <span>Unlock</span>
                        <LogIn size={18} />
                    </button>
                </form>

                <div className="login-footer">
                    <p>Private workspace for your daily planning</p>
                </div>
            </div>
        </div>
    );
}
