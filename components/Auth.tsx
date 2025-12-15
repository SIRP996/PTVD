import React, { useState } from 'react';
import { Layout, ShieldCheck, Mail, Lock, ArrowRight } from 'lucide-react';
import { auth, googleProvider } from '../firebaseConfig';

interface AuthProps {
  // Callback không cần tham số user vì App.tsx sẽ lắng nghe onAuthStateChanged
  onLoginSuccess: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogleLogin = async () => {
    if (!auth) {
        setError("Lỗi cấu hình Firebase. Vui lòng kiểm tra firebaseConfig.ts");
        return;
    }

    setLoading(true);
    setError(null);
    
    try {
        await auth.signInWithPopup(googleProvider);
        onLoginSuccess();
    } catch (err: any) {
        console.error("Login Error:", err);
        setError("Đăng nhập Google thất bại: " + (err.message || "Lỗi không xác định"));
    } finally {
        setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
        setError("Lỗi cấu hình Firebase.");
        return;
    }
    if (!email || !password) {
        setError("Vui lòng điền đầy đủ email và mật khẩu.");
        return;
    }

    setLoading(true);
    setError(null);

    try {
        if (isSignUp) {
            await auth.createUserWithEmailAndPassword(email, password);
        } else {
            await auth.signInWithEmailAndPassword(email, password);
        }
        onLoginSuccess();
    } catch (err: any) {
        console.error("Auth Error:", err);
        // Mapping lỗi phổ biến sang tiếng Việt
        let msg = "Có lỗi xảy ra: " + err.message;
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
            msg = "Email hoặc mật khẩu không chính xác.";
        } else if (err.code === 'auth/email-already-in-use') {
            msg = "Email này đã được sử dụng.";
        } else if (err.code === 'auth/weak-password') {
            msg = "Mật khẩu phải có ít nhất 6 ký tự.";
        } else if (err.code === 'auth/invalid-email') {
            msg = "Định dạng email không hợp lệ.";
        }
        setError(msg);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-blue-600 p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700 opacity-90"></div>
            <div className="relative z-10">
                <div className="mx-auto bg-white/20 w-16 h-16 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm shadow-lg">
                    <Layout className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">TikTok Script Architect</h1>
                <p className="text-blue-100 text-sm">Hệ thống quản lý kịch bản chuyên nghiệp</p>
            </div>
        </div>
        
        <div className="p-8">
            <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">{isSignUp ? 'Tạo tài khoản mới' : 'Đăng nhập'}</h2>
                <p className="text-gray-500 text-sm mt-1">
                    {isSignUp ? 'Điền thông tin bên dưới để bắt đầu' : 'Chào mừng bạn quay trở lại!'}
                </p>
            </div>

            {error && (
                <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100 animate-pulse">
                    <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Email/Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
                <div>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="email"
                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                            placeholder="Email của bạn"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                </div>
                <div>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="password"
                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                            placeholder="Mật khẩu"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-md active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <>
                            {isSignUp ? 'Đăng ký ngay' : 'Đăng nhập'}
                            {!isSignUp && <ArrowRight className="w-4 h-4" />}
                        </>
                    )}
                </button>
            </form>

            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Hoặc tiếp tục với</span>
                </div>
            </div>

            <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-medium py-3 px-4 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed group"
            >
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>Google</span>
            </button>
            
            <div className="mt-8 text-center text-sm">
                <span className="text-gray-500">
                    {isSignUp ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}
                </span>
                <button 
                    onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
                    className="font-semibold text-blue-600 hover:text-blue-500 transition-colors"
                >
                    {isSignUp ? 'Đăng nhập' : 'Đăng ký ngay'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
