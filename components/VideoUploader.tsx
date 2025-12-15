import React, { useCallback, useState } from 'react';
import { UploadCloud, Link as LinkIcon, AlertCircle, Layers } from 'lucide-react';

interface VideoUploaderProps {
  onFileSelect: (files: File[]) => void;
  onUrlSubmit: (url: string) => void;
  isLoading: boolean;
  processingCount?: { current: number; total: number };
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({ onFileSelect, onUrlSubmit, isLoading, processingCount }) => {
  const [dragActive, setDragActive] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  // Hàm kiểm tra file video an toàn hơn (check cả đuôi file)
  const isValidVideoFile = (file: File) => {
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska', 'video/avi'];
    const validExtensions = ['.mp4', '.mov', '.webm', '.mkv', '.avi', '.flv', '.wmv'];
    
    // 1. Check theo Mime Type chuẩn
    if (file.type && file.type.startsWith('video/')) return true;
    if (validTypes.includes(file.type)) return true;

    // 2. Fallback: Check theo đuôi file (nếu Mime Type bị rỗng)
    const fileName = file.name.toLowerCase();
    return validExtensions.some(ext => fileName.endsWith(ext));
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files: File[] = [];
      Array.from(e.dataTransfer.files).forEach((file: any) => {
          if (isValidVideoFile(file)) {
              files.push(file);
          } else {
              console.warn("File bị bỏ qua do không phải video:", file.name, file.type);
          }
      });
      
      if (files.length > 0) {
        onFileSelect(files);
      } else {
        alert("Không tìm thấy file video hợp lệ. Vui lòng tải lên file .MP4, .MOV, .WebM.");
      }
    }
  }, [onFileSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      // Input native filter đã lọc rồi, nhưng check lại cho chắc
      const validFiles = files.filter(isValidVideoFile);
      if (validFiles.length > 0) {
          onFileSelect(validFiles);
      }
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onUrlSubmit(urlInput);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto mb-8 space-y-4">
        
      {/* URL Input */}
      <div className="flex gap-2">
        <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LinkIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
                type="text"
                placeholder="Dán link TikTok (vd: https://vt.tiktok.com/...) hoặc link MP4..."
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                disabled={isLoading}
            />
        </div>
        <button 
            onClick={handleUrlSubmit}
            disabled={isLoading || !urlInput}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
            Phân tích
        </button>
      </div>

      {/* Drag & Drop Area */}
      <div 
        className={`relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl transition-colors duration-200 ease-in-out ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:bg-gray-50'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center pointer-events-none">
            {isLoading ? (
                <div className="flex flex-col items-center">
                     <div className="relative">
                        <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></div>
                        <Layers className="relative w-12 h-12 text-blue-500 mb-3" />
                     </div>
                     <p className="text-lg text-blue-600 font-bold animate-pulse">
                        {processingCount ? `Đang xử lý ${processingCount.current} / ${processingCount.total} video` : 'Đang phân tích...'}
                     </p>
                     <p className="text-xs text-gray-400 mt-1">Đừng tắt trình duyệt nhé!</p>
                </div>
            ) : (
                <>
                    <UploadCloud className="w-12 h-12 text-gray-400 mb-3" />
                    <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold text-blue-600">Click để chọn nhiều file</span> hoặc kéo thả 1 lúc 20 video vào đây
                    </p>
                    <p className="text-xs text-gray-400">Hỗ trợ MP4, WebM, MOV. Batch Processing sẵn sàng.</p>
                </>
            )}
        </div>
        <input 
            type="file" 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            onChange={handleChange}
            accept="video/*, .mp4, .mov, .webm, .mkv, .avi"
            multiple 
            disabled={isLoading}
        />
      </div>

      <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p>Tip: Bạn có thể kéo thả hàng loạt video vào ô trên. Hệ thống sẽ tự động xếp hàng và xử lý từng video một.</p>
      </div>
    </div>
  );
};