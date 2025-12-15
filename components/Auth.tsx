import React from 'react';
import { Layout, ShieldCheck, LogIn } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebaseConfig';

interface AuthProps {
  // Callback không cần tham số user vì App.tsx sẽ lắng nghe onAuthStateChanged
  onLoginSuccess: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleGoogleLogin = async () => {
    if (!auth) {
        setError("Lỗi cấu hình Firebase. Vui lòng kiểm tra firebaseConfig.ts");
        return;
    }

    setLoading(true);
    setError(null);
    
    try {
        await signInWithPopup(auth, googleProvider);
        onLoginSuccess();
    } catch (err: any) {
        console.error("Login Error:", err);
        setError("Đăng nhập thất bại: " + (err.message || "Lỗi không xác định"));
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
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
            <div className="text-center mb-8">
                <h2 className="text-xl font-bold text-gray-800">Đăng nhập</h2>
                <p className="text-gray-500 text-sm mt-2">Kết nối tài khoản Google để đồng bộ dữ liệu.</p>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100">
                    <ShieldCheck className="w-4 h-4" />
                    {error}
                </div>
            )}

            <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-medium py-3 px-4 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed group"
            >
                {loading ? (
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                ) : (
                    <>
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span>Đăng nhập với Google</span>
                    </>
                )}
            </button>
            
            <p className="mt-8 text-center text-xs text-gray-400">
                Dữ liệu của bạn được bảo mật và lưu trữ trên Cloud Firestore.
            </p>
        </div>
      </div>
    </div>
  );
};
