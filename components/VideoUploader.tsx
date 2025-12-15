import React, { useCallback, useState, useEffect } from 'react';
import { UploadCloud, Link as LinkIcon, AlertCircle, Layers, Timer, Terminal, Video as VideoIcon } from 'lucide-react';

interface VideoUploaderProps {
  onFileSelect: (files: File[]) => void;
  onUrlSubmit: (url: string) => void;
  isLoading: boolean;
  processingCount?: { current: number; total: number };
  elapsedTime?: number;
  loadingMessage?: string;
  currentProcessingItem?: File | string | null; // Prop mới
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({ 
    onFileSelect, 
    onUrlSubmit, 
    isLoading, 
    processingCount, 
    elapsedTime = 0,
    loadingMessage = '',
    currentProcessingItem
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);

  // Tạo URL preview cho video file
  useEffect(() => {
    if (currentProcessingItem instanceof File) {
        const url = URL.createObjectURL(currentProcessingItem);
        setVideoPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    } else {
        setVideoPreviewUrl(null);
    }
  }, [currentProcessingItem]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
      const droppedFiles = Array.from(e.dataTransfer.files) as File[];
      
      droppedFiles.forEach((file) => {
          if (file.type.startsWith('video/') || file.name.match(/\.(mp4|mov|avi|wmv|flv|webm|mkv)$/i)) {
              files.push(file);
          }
      });
      
      if (files.length > 0) {
        onFileSelect(files);
      } else {
        alert("Vui lòng chỉ kéo thả file Video (MP4, MOV, WebM...)!");
      }
    }
  }, [onFileSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      const validFiles = files.filter(f => f.type.startsWith('video/') || f.name.match(/\.(mp4|mov|avi|wmv|flv|webm|mkv)$/i));
      
      if (validFiles.length > 0) {
          onFileSelect(validFiles);
      } else {
          alert("Bạn đã chọn file không phải video.");
      }
      e.target.value = '';
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
        className={`relative flex flex-col items-center justify-center w-full min-h-[12rem] border-2 border-dashed rounded-xl transition-colors duration-200 ease-in-out ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:bg-gray-50'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center w-full px-4">
            {isLoading ? (
                <div className="flex flex-col items-center w-full gap-4">
                     
                     {/* VIDEO PREVIEW SECTION */}
                     <div className="relative group">
                         {videoPreviewUrl ? (
                             <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-blue-200 shadow-md">
                                 <video 
                                    src={videoPreviewUrl} 
                                    className="w-full h-full object-cover" 
                                    autoPlay 
                                    muted 
                                    loop 
                                    playsInline 
                                 />
                                 <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                                     <div className="w-8 h-8 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                                 </div>
                             </div>
                         ) : currentProcessingItem && typeof currentProcessingItem === 'string' ? (
                             <div className="w-24 h-24 rounded-lg bg-gray-100 flex flex-col items-center justify-center border-2 border-dashed border-gray-300">
                                 <LinkIcon className="w-8 h-8 text-gray-400 mb-2" />
                                 <span className="text-[10px] text-gray-500 max-w-[80px] truncate px-1">URL Processing</span>
                             </div>
                         ) : (
                             <div className="relative">
                                <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></div>
                                <Layers className="relative w-12 h-12 text-blue-500" />
                             </div>
                         )}
                     </div>

                     <div className="flex flex-col items-center">
                        <p className="text-lg text-blue-600 font-bold animate-pulse">
                            {processingCount ? `Đang xử lý ${processingCount.current} / ${processingCount.total} video` : 'Đang phân tích...'}
                        </p>
                        {currentProcessingItem instanceof File && <p className="text-xs text-gray-400 mt-1">{currentProcessingItem.name}</p>}
                     </div>
                     
                     {/* Timer Display */}
                     <div className="flex items-center gap-2 text-amber-700 bg-amber-100 px-4 py-1.5 rounded-full text-sm font-bold border border-amber-300 shadow-sm animate-pulse">
                        <Timer className="w-4 h-4" />
                        <span>Thời gian: {formatTime(elapsedTime)}</span>
                     </div>
                     
                     {/* LOG DISPLAY AREA */}
                     <div className="flex items-center gap-2 text-sm text-gray-500 font-mono bg-gray-50 px-3 py-1 rounded border border-gray-100 max-w-md w-full justify-center truncate">
                        <Terminal className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{loadingMessage || 'Đang khởi tạo...'}</span>
                     </div>

                </div>
            ) : (
                <>
                    <UploadCloud className="w-12 h-12 text-gray-400 mb-3" />
                    <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold text-blue-600">Click để chọn nhiều file</span> hoặc kéo thả vào đây
                    </p>
                    <p className="text-xs text-gray-400">Hỗ trợ MP4, WebM, MOV.</p>
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
        <p>Tip: Dùng file &lt; 30MB để AI xử lý nhanh nhất. Nếu tải từ TikTok bị lỗi, hãy tải video về máy rồi Upload file thủ công.</p>
      </div>
    </div>
  );
};