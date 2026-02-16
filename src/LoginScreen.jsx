import React, { useState } from 'react';
import { Lock, ArrowRight, AlertCircle, Waves, User, ShieldCheck, RefreshCw } from 'lucide-react';

const LoginScreen = ({ onLogin, onRegister }) => {
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
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
            const result = isRegisterMode
                ? await onRegister(username, password)
                : await onLogin(username, password, rememberMe);

            if (!result.success) {
                setError(result.message || 'Authentication failed');
                setIsShaking(true);
                setTimeout(() => setIsShaking(false), 500);
                if (!isRegisterMode) setPassword('');
            } else if (isRegisterMode) {
                // Success register -> switch to login
                setIsRegisterMode(false);
                setPassword('');
                setConfirmPassword('');
                setError('');
                alert("Registration successful! Please login.");
            }
        } catch (err) {
            setError('Connection error');
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 font-thai outline-none">
            <div className="w-full max-w-md">
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
                                    <label className="block text-slate-400 text-xs font-bold uppercase tracking-widest mb-2 ml-2">Username</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => {
                                                setUsername(e.target.value);
                                                setError('');
                                            }}
                                            className={`w-full bg-slate-950/50 border-2 ${error ? 'border-red-500/50' : 'border-slate-800 focus:border-orange-500'} rounded-2xl px-4 py-3 pl-10 text-lg font-bold text-white placeholder-slate-700 focus:outline-none focus:ring-4 ${error ? 'focus:ring-red-500/10' : 'focus:ring-orange-500/10'} transition-all`}
                                            placeholder="Username"
                                            disabled={isLoading}
                                            autoFocus
                                        />
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                                    </div>
                                </div>

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
                                            placeholder="Password"
                                            disabled={isLoading}
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
                                                placeholder="Confirm Password"
                                                disabled={isLoading}
                                            />
                                            <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                                        </div>
                                    </div>
                                )}

                                {!isRegisterMode && (
                                    <div className="flex items-center gap-2 ml-2">
                                        <input
                                            type="checkbox"
                                            id="rememberMe"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-800 bg-slate-950/50 text-orange-500 focus:ring-orange-500/20 transition-all cursor-pointer"
                                        />
                                        <label htmlFor="rememberMe" className="text-slate-400 text-xs font-bold uppercase tracking-widest cursor-pointer hover:text-slate-300 transition-colors">
                                            Remember Me
                                        </label>
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
                            disabled={isLoading || !username || !password || (isRegisterMode && !confirmPassword)}
                            className="w-full mt-6 bg-white hover:bg-slate-50 text-slate-900 font-black py-4 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group uppercase tracking-widest text-sm"
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
