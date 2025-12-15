import React from 'react';
import { Layout, ShieldCheck } from 'lucide-react';

export interface User {
    uid: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
}

interface AuthProps {
  onLoginSuccess: (user: User) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    
    // Simulate API delay for mock login
    setTimeout(() => {
        // Mock User Login
        const mockUser: User = {
            uid: "demo-user-123",
            displayName: "Demo User",
            email: "demo@tiktokscript.com",
            photoURL: null
        };
        setLoading(false);
        onLoginSuccess(mockUser);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-blue-600 p-8 text-center">
            <div className="mx-auto bg-white/20 w-16 h-16 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
                <Layout className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">TikTok Script Architect</h1>
            <p className="text-blue-100 text-sm">Công cụ AI tối ưu kịch bản video ngắn</p>
        </div>
        
        <div className="p-8">
            <div className="text-center mb-8">
                <h2 className="text-xl font-bold text-gray-800">Chào mừng!</h2>
                <p className="text-gray-500 text-sm mt-2">Đăng nhập để lưu trữ và quản lý kịch bản.</p>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    {error}
                </div>
            )}

            <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-3 px-4 rounded-xl transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {loading ? (
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                ) : (
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                )}
                <span>Tiếp tục với Google (Demo)</span>
            </button>
            
            <p className="mt-6 text-center text-xs text-gray-400">
                Chế độ Demo: Dữ liệu sẽ được lưu trên trình duyệt của bạn.
            </p>
        </div>
      </div>
    </div>
  );
};
