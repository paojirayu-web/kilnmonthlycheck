import React, { useState } from 'react';
import { Lock, ArrowRight, AlertCircle, Waves, User, ShieldCheck, RefreshCw, Activity } from 'lucide-react';

const LoginScreen = ({ onLogin, onRegister, onSocialLogin }) => {
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [id, setId] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isShaking, setIsShaking] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (isRegisterMode && password !== confirmPassword) {
            setError('Passwords do not match');
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);
            return;
        }

        setIsLoading(true);
        try {
            console.log("Submit start - mode:", isRegisterMode ? 'Register' : 'Login');
            const result = isRegisterMode
                ? await onRegister(id, email, password)
                : await onLogin(id, password);

            console.log("Auth result detail:", result);

            if (!result.success) {
                setError(result.message || 'Authentication failed');
                setIsShaking(true);
                setTimeout(() => setIsShaking(false), 500);
            } else if (isRegisterMode) {
                // Success path for registration
                setError('Registration successful! Redirecting to login...');
                setTimeout(() => {
                    setIsRegisterMode(false);
                    setPassword('');
                    setConfirmPassword('');
                    setError('');
                }, 2500);
            }
        } catch (err) {
            console.error("LoginScreen Submission Error:", err);
            setError('System error: ' + (err.message || 'Unknown'));
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 py-8 font-thai outline-none overflow-y-auto">
            <div className="w-full max-w-md my-auto">
                {/* Abstract Background Elements */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>

                <div className="relative bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl">
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 mb-6 group hover:scale-110 transition-transform duration-500">
                            <Lock className="text-white w-8 h-8" />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight mb-2 flex items-center gap-3">
                            CROWNKILN <span className="px-2 py-0.5 bg-slate-800 rounded-lg text-xs text-slate-400 font-bold border border-slate-700">SECURE</span>
                        </h1>
                        <p className="text-slate-400 text-sm font-medium">
                            {isRegisterMode ? 'Create New Account' : 'Authorized Personnel Only'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className={`relative transition-transform duration-300 ${isShaking ? 'shake' : ''}`}>
                            <style>
                                {`
                  @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
                    20%, 40%, 60%, 80% { transform: translateX(4px); }
                  }
                  .shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
                `}
                            </style>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-slate-400 text-xs font-bold uppercase tracking-widest mb-2 ml-2">
                                        Username
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={id}
                                            onChange={(e) => {
                                                setId(e.target.value);
                                                setError('');
                                            }}
                                            className={`w-full bg-slate-950/50 border-2 ${error ? 'border-red-500/50' : 'border-slate-800 focus:border-orange-500'} rounded-2xl px-4 py-3 pl-10 text-lg font-bold text-white placeholder-slate-700 focus:outline-none focus:ring-4 ${error ? 'focus:ring-red-500/10' : 'focus:ring-orange-500/10'} transition-all`}
                                            placeholder="Enter your username"
                                            disabled={isLoading}
                                            required
                                        />
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                                    </div>
                                </div>

                                {isRegisterMode && (
                                    <div className="animate-in slide-in-from-top-4 duration-300">
                                        <label className="block text-slate-400 text-xs font-bold uppercase tracking-widest mb-2 ml-2">Email (For verification)</label>
                                        <div className="relative">
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => {
                                                    setEmail(e.target.value);
                                                    setError('');
                                                }}
                                                className={`w-full bg-slate-950/50 border-2 ${error ? 'border-red-500/50' : 'border-slate-800 focus:border-orange-500'} rounded-2xl px-4 py-3 pl-10 text-lg font-bold text-white placeholder-slate-700 focus:outline-none focus:ring-4 transition-all`}
                                                placeholder="you@email.com"
                                                disabled={isLoading}
                                                required={isRegisterMode}
                                            />
                                            <Activity className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-slate-400 text-xs font-bold uppercase tracking-widest mb-2 ml-2">Password</label>
                                    <div className="relative">
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => {
                                                setPassword(e.target.value);
                                                setError('');
                                            }}
                                            className={`w-full bg-slate-950/50 border-2 ${error ? 'border-red-500/50' : 'border-slate-800 focus:border-orange-500'} rounded-2xl px-4 py-3 pl-10 text-lg font-bold text-white placeholder-slate-700 focus:outline-none focus:ring-4 ${error ? 'focus:ring-red-500/10' : 'focus:ring-orange-500/10'} transition-all`}
                                            placeholder="••••••••"
                                            disabled={isLoading}
                                            required
                                        />
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                                    </div>
                                </div>

                                {isRegisterMode && (
                                    <div className="animate-in slide-in-from-top-4 duration-300">
                                        <label className="block text-slate-400 text-xs font-bold uppercase tracking-widest mb-2 ml-2">Confirm Password</label>
                                        <div className="relative">
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => {
                                                    setConfirmPassword(e.target.value);
                                                    setError('');
                                                }}
                                                className={`w-full bg-slate-950/50 border-2 ${error === 'Passwords do not match' ? 'border-red-500/50' : 'border-slate-800 focus:border-orange-500'} rounded-2xl px-4 py-3 pl-10 text-lg font-bold text-white placeholder-slate-700 focus:outline-none focus:ring-4 transition-all`}
                                                placeholder="••••••••"
                                                disabled={isLoading}
                                            />
                                            <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="absolute -bottom-8 left-0 right-0 text-center flex items-center justify-center gap-1.5 text-red-400 animate-in fade-in slide-in-from-top-2">
                                    <AlertCircle size={12} />
                                    <span className="text-xs font-bold uppercase tracking-wide">{error}</span>
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !id || !password || (isRegisterMode && (!confirmPassword || !email))}
                            className="w-full mt-8 bg-white hover:bg-slate-50 text-slate-900 font-black py-4 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group uppercase tracking-widest text-sm"
                        >
                            {isLoading ? (
                                <RefreshCw size={18} className="animate-spin" />
                            ) : (
                                <>
                                    <span>{isRegisterMode ? 'Creating Account' : 'Unlock Dashboard'}</span>
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    {!isRegisterMode && (
                        <>
                            <div className="relative my-8">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-800"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-slate-900 px-2 text-slate-500 font-bold tracking-widest">Or continue with</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => onSocialLogin('google')}
                                    className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl border border-slate-700 transition-all hover:scale-[1.02]"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    <span className="text-xs font-bold uppercase tracking-wider">Google</span>
                                </button>
                                <button
                                    onClick={() => onSocialLogin('github')}
                                    className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl border border-slate-700 transition-all hover:scale-[1.02]"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                                    </svg>
                                    <span className="text-xs font-bold uppercase tracking-wider">GitHub</span>
                                </button>
                            </div>
                        </>
                    )}

                    <div className="mt-8 text-center space-y-4">
                        <button
                            type="button"
                            onClick={() => {
                                setIsRegisterMode(!isRegisterMode);
                                setError('');
                            }}
                            className="text-orange-500 text-xs font-bold uppercase tracking-widest hover:text-orange-400 transition-colors"
                        >
                            {isRegisterMode ? 'Already have an account? Login' : 'Need an account? Register'}
                        </button>
                        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                            Restricted Access • Monitoring Station
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
