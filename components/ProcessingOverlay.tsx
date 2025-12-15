import React, { useEffect, useState } from 'react';
import { Loader2, Film, CheckCircle, AlertCircle } from 'lucide-react';

interface ProcessingOverlayProps {
  status: 'ANALYZING' | 'OPTIMIZING' | 'IDLE' | 'COMPLETE' | 'ERROR';
  processingItem: File | string | null;
  processingState?: { current: number; total: number };
  message: string;
  elapsedTime: number;
  isMinimized: boolean; // True: Hiển thị dạng Widget góc phải, False: Full màn hình
}

export const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({
  status,
  processingItem,
  processingState,
  message,
  elapsedTime,
  isMinimized
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Tạo URL preview cho video
  useEffect(() => {
    if (processingItem instanceof File) {
      const url = URL.createObjectURL(processingItem);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [processingItem]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (status === 'IDLE' || status === 'COMPLETE' || status === 'ERROR') return null;

  // --- GIAO DIỆN MINI (WIDGET GÓC PHẢI) ---
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 w-96 bg-white rounded-xl shadow-2xl border border-blue-100 overflow-hidden animate-slide-up">
        <div className="bg-blue-600 px-4 py-3 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="font-semibold text-sm">
               Đang xử lý {processingState ? `${processingState.current}/${processingState.total}` : '...'}
            </span>
          </div>
          <span className="text-xs bg-blue-500 px-2 py-0.5 rounded font-mono">
            {formatTime(elapsedTime)}
          </span>
        </div>
        
        <div className="p-4 flex gap-3">
          {/* Thumbnail */}
          <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden border border-gray-200 relative">
             {previewUrl ? (
                 <video src={previewUrl} className="w-full h-full object-cover" muted />
             ) : (
                 <div className="w-full h-full flex items-center justify-center">
                     <Film className="w-6 h-6 text-gray-400" />
                 </div>
             )}
          </div>
          
          <div className="flex-1 min-w-0">
             <p className="text-sm font-medium text-gray-900 truncate mb-1">
                {processingItem instanceof File ? processingItem.name : 'Đang tải URL...'}
             </p>
             <p className="text-xs text-gray-500 animate-pulse">{message}</p>
             
             {/* Progress Bar */}
             <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
                <div 
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" 
                    style={{ width: processingState ? `${(processingState.current / processingState.total) * 100}%` : '100%' }}
                ></div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  // --- GIAO DIỆN FULL (GIỮA MÀN HÌNH) ---
  return (
    <div className="flex flex-col items-center justify-center w-full py-12 animate-fade-in">
        <div className="relative w-full max-w-lg bg-white rounded-2xl p-8 text-center shadow-lg border border-blue-50">
            {/* Video Preview Circle */}
            <div className="mx-auto w-32 h-32 relative mb-6">
                <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-20"></div>
                <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-white shadow-xl bg-gray-900">
                    {previewUrl ? (
                        <video src={previewUrl} className="w-full h-full object-cover opacity-80" autoPlay muted loop />
                    ) : (
                         <div className="w-full h-full flex items-center justify-center bg-gray-100">
                             <Film className="w-10 h-10 text-gray-400" />
                         </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Loader2 className="w-10 h-10 text-white animate-spin" />
                    </div>
                </div>
            </div>

            <h3 className="text-xl font-bold text-blue-600 mb-2">
                Đang xử lý {processingState ? `${processingState.current} / ${processingState.total}` : ''} video
            </h3>
            <p className="text-gray-600 font-medium truncate px-4">
                {processingItem instanceof File ? processingItem.name : 'Đang phân tích liên kết...'}
            </p>
            
            <div className="mt-6 flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 text-amber-700 rounded-full border border-amber-100 text-sm font-semibold">
                    <span>Thời gian: {formatTime(elapsedTime)}</span>
                </div>
                <p className="text-sm text-gray-400 mt-2 font-mono">{message}</p>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="flex items-start gap-3 text-left p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p>Hệ thống đang sử dụng AI để phân tích hình ảnh và âm thanh. Vui lòng <strong>không tắt trình duyệt</strong> cho đến khi hoàn tất.</p>
                </div>
            </div>
        </div>
    </div>
  );
};