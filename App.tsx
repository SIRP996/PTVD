import React, { useState, useEffect, useRef } from 'react';
import { VideoUploader } from './components/VideoUploader';
import { ScriptViewer } from './components/ScriptViewer';
import { ScriptLibrary } from './components/ScriptLibrary';
import { ProcessingOverlay } from './components/ProcessingOverlay'; // Import mới
import { Auth } from './components/Auth';
import { ScriptAnalysis, AnalysisStatus } from './types';
import { analyzeVideoFile, analyzeVideoUrl, optimizeScriptWithAI } from './services/geminiService';
import { saveScriptToDb, fetchScriptsFromDb, deleteScriptFromDb, migrateGuestDataToUser } from './services/firebaseService';
import { auth } from './firebaseConfig';
import firebase from 'firebase/compat/app';
import { Copy, Sparkles, Layout, Plus, CheckCircle, FileSpreadsheet, LogOut, User as UserIcon, AlertTriangle, Timer, WifiOff, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<firebase.User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [currentScript, setCurrentScript] = useState<ScriptAnalysis | null>(null);
  const [savedScripts, setSavedScripts] = useState<ScriptAnalysis[]>([]);
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  
  // State quản lý tiến trình
  const [processingState, setProcessingState] = useState<{current: number, total: number} | undefined>(undefined);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [processingItem, setProcessingItem] = useState<File | string | null>(null);
  
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Timer logic
  const [timer, setTimer] = useState(0);
  const timerIntervalRef = useRef<number | null>(null);

  useEffect(() => {
      if (status === AnalysisStatus.ANALYZING || status === AnalysisStatus.OPTIMIZING) {
          // Chỉ reset timer về 0 khi bắt đầu chu trình mới, không reset giữa các file
          // Logic này xử lý ở handleFileSelect
          if (!timerIntervalRef.current) {
            timerIntervalRef.current = window.setInterval(() => {
                setTimer(prev => prev + 1);
            }, 1000);
          }
      } else {
          if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
          }
      }
      return () => {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      };
  }, [status]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Auth logic
  useEffect(() => {
    if (!auth) {
        setLoadingAuth(false);
        return;
    }
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
        if (currentUser) {
           setUser(currentUser);
           try {
               const migratedCount = await migrateGuestDataToUser(currentUser.uid);
               if (migratedCount > 0) {
                   showNotification(`Đã đồng bộ ${migratedCount} kịch bản cũ!`, 'success');
               }
           } catch (e) { console.error(e); }
        } else if (user?.uid !== 'guest') {
           setUser(null);
        }
        setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // Load scripts
  useEffect(() => {
    if (user) {
        const loadScripts = async () => {
            setIsSyncing(true);
            try {
                const scripts = await fetchScriptsFromDb(user.uid);
                setSavedScripts(scripts);
            } catch (error) { console.error(error); } 
            finally { setIsSyncing(false); }
        };
        loadScripts();
    } else {
        setSavedScripts([]);
        setCurrentScript(null);
    }
  }, [user]);

  const handleLogout = async () => {
      if (user?.uid === 'guest') {
          setUser(null);
          return;
      }
      if (auth) await auth.signOut();
  };

  const handleGuestLogin = () => {
      const guestUser = {
          uid: 'guest',
          displayName: 'Khách (Guest)',
          email: 'guest@local',
          emailVerified: true,
          isAnonymous: true,
          photoURL: null,
          providerData: []
      } as unknown as firebase.User;
      setUser(guestUser);
  };

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
      setNotification({ msg, type });
      setTimeout(() => setNotification(null), 5000); 
  }

  const saveToCloudSafe = async (script: ScriptAnalysis) => {
      try {
          await saveScriptToDb(script);
      } catch (dbError: any) {
          console.error("FIREBASE SAVE ERROR:", dbError);
          showNotification("Lỗi lưu trữ (Kiểm tra mạng).", 'error');
      }
  };

  // --- BATCH PROCESSING LOGIC ĐƯỢC CẬP NHẬT ---
  const handleFileSelect = async (files: File[]) => {
    if (files.length === 0 || !user) return;

    setStatus(AnalysisStatus.ANALYZING);
    setTimer(0); // Reset timer
    setProcessingState({ current: 0, total: files.length });
    
    let successCount = 0;

    // Process sequentially
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // CẬP NHẬT STATE CHO TỪNG FILE
        setProcessingState({ current: i + 1, total: files.length });
        setProcessingItem(file); // Quan trọng: Cập nhật file đang xử lý để Overlay hiển thị
        setLoadingMessage(`Đang tải video ${i+1}...`);
        
        try {
            // Phân tích
            const result = await analyzeVideoFile(file, (msg) => setLoadingMessage(msg));
            
            const newScript: ScriptAnalysis = {
                id: `script-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                userId: user.uid,
                title: result.title || file.name,
                videoName: file.name,
                createdAt: Date.now(),
                tags: [],
                scenes: result.scenes || []
            };

            // LƯU DB NGAY LẬP TỨC
            await saveToCloudSafe(newScript);

            // Cập nhật danh sách kịch bản
            setSavedScripts(prev => [newScript, ...prev]);

            // LOGIC HIỂN THỊ:
            // Nếu đây là file đầu tiên, hiển thị ngay kịch bản cho người dùng xem.
            // Các file sau sẽ chạy ngầm (hiển thị qua ProcessingOverlay dạng widget).
            if (i === 0) {
                setCurrentScript(newScript);
            } else {
                showNotification(`Đã xong "${file.name}" (Xem ở cột phải)`, 'success');
            }
            
            successCount++;

        } catch (error: any) {
            console.error(`Error processing file ${file.name}:`, error);
            showNotification(`Lỗi phân tích ${file.name}: ${error.message}`, 'error');
        }

        // Delay nhỏ giữa các file để UI kịp render và tránh rate limit
        if (i < files.length - 1) {
            setLoadingMessage("Đang chuẩn bị video tiếp theo...");
            await new Promise(r => setTimeout(r, 1500));
        }
    }

    // Kết thúc batch
    setProcessingState(undefined);
    setProcessingItem(null);
    setStatus(AnalysisStatus.COMPLETE);
    setLoadingMessage('');
    
    if (successCount > 0) {
        showNotification(`Hoàn tất ${successCount}/${files.length} video!`, 'success');
    }
  };

  const handleUrlSubmit = async (url: string) => {
    if (!user) return;
    setStatus(AnalysisStatus.ANALYZING);
    setTimer(0);
    setProcessingState({ current: 1, total: 1 });
    setProcessingItem(url);
    
    try {
        const result = await analyzeVideoUrl(url, (msg) => setLoadingMessage(msg));
        const newScript: ScriptAnalysis = {
            id: `script-${Date.now()}`,
            userId: user.uid,
            title: result.title || "URL Analysis",
            videoName: url,
            createdAt: Date.now(),
            tags: [],
            scenes: result.scenes || []
        };

        await saveToCloudSafe(newScript);
        setSavedScripts(prev => [newScript, ...prev]);
        setCurrentScript(newScript);
        setStatus(AnalysisStatus.COMPLETE);

    } catch (error: any) {
        setStatus(AnalysisStatus.ERROR);
        showNotification(error.message || "Lỗi khi phân tích URL.", 'error');
    } finally {
        setProcessingItem(null);
        setProcessingState(undefined);
        setStatus(AnalysisStatus.IDLE);
    }
  };

  const handleCopyScript = () => {
    if (!currentScript) return;
    const headers = ["Sản phẩm", "Phân cảnh", "Mô tả hình ảnh", "Kịch bản phát ngôn"];
    const rows = currentScript.scenes.map((scene) => {
        const clean = (text: string) => (text || '').replace(/[\t\n\r]+/g, ' ').trim();
        const productCol = currentScript.tags.length > 0 ? currentScript.tags.join(", ") : "";
        return [
            clean(productCol),
            clean(`${scene.type} (${scene.startTime} - ${scene.endTime})`),
            clean(scene.visualDescription),
            clean(scene.audioScript)
        ].join("\t");
    });
    navigator.clipboard.writeText(headers.join("\t") + "\n" + rows.join("\n"));
    showNotification("Đã copy dữ liệu!", 'success');
  };

  const handleOpenGoogleSheets = () => {
    handleCopyScript();
    setTimeout(() => {
        window.open("https://sheets.new", "_blank");
        showNotification("Đã copy! Nhấn Ctrl+V vào Google Sheet.", 'success');
    }, 500);
  };

  const handleOptimize = async () => {
    if (!currentScript || !user) return;
    setStatus(AnalysisStatus.OPTIMIZING);
    try {
        const optimizedScenes = await optimizeScriptWithAI(currentScript);
        const updatedScript = { ...currentScript, scenes: optimizedScenes };
        
        setCurrentScript(updatedScript);
        setSavedScripts(prev => prev.map(s => s.id === updatedScript.id ? updatedScript : s));
        await saveToCloudSafe(updatedScript);
        setStatus(AnalysisStatus.COMPLETE);
    } catch (e) {
        setStatus(AnalysisStatus.ERROR);
        showNotification("Lỗi khi tối ưu hóa.", 'error');
    }
  };

  const updateCurrentTags = async (newTags: string[]) => {
      if (currentScript) {
          const updatedScript = { ...currentScript, tags: newTags };
          setCurrentScript(updatedScript);
          setSavedScripts(prev => prev.map(s => s.id === updatedScript.id ? updatedScript : s));
          saveToCloudSafe(updatedScript);
      }
  };

  const deleteScript = async (id: string) => {
      if(!window.confirm("Bạn có chắc muốn xóa kịch bản này vĩnh viễn?")) return;
      if (!user) return;

      try {
          await deleteScriptFromDb(id, user.uid);
          setSavedScripts(savedScripts.filter(s => s.id !== id));
          if (currentScript?.id === id) setCurrentScript(null);
          showNotification("Đã xóa kịch bản.", 'success');
      } catch (e) {
          showNotification("Lỗi khi xóa kịch bản.", 'error');
      }
  };

  if (loadingAuth) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
      );
  }

  if (!user) {
      return <Auth onLoginSuccess={() => {}} onGuestLogin={handleGuestLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      
      {/* PROCESSING OVERLAY: Hiển thị ở đây để luôn tồn tại dù View bên dưới thay đổi */}
      <ProcessingOverlay 
        status={status}
        processingItem={processingItem}
        processingState={processingState}
        message={loadingMessage}
        elapsedTime={timer}
        isMinimized={!!currentScript} // Nếu đã có kịch bản hiển thị -> Thu nhỏ Widget
      />

      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
                <div className="bg-blue-600 text-white p-1.5 rounded-lg">
                    <Layout className="w-6 h-6" />
                </div>
                <span className="font-bold text-xl tracking-tight text-gray-900 hidden sm:block">TikTok Script Architect</span>
                {isSyncing && <span className="text-xs text-gray-400 flex items-center gap-1 ml-2"><RefreshCw className="w-3 h-3 animate-spin"/> Đồng bộ...</span>}
            </div>
            
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 border-l border-gray-200 pl-4 ml-4">
                    <div className="hidden md:flex flex-col items-end">
                        <span className="text-xs font-semibold text-gray-700">{user.displayName}</span>
                        <span className="text-[10px] text-gray-400">{user.email}</span>
                    </div>
                    {user.photoURL ? (
                        <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full border border-gray-200" />
                    ) : (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${user.uid === 'guest' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                            <UserIcon className="w-4 h-4" />
                        </div>
                    )}
                    <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Sub-nav */}
      {currentScript && (
          <div className="bg-white border-b border-gray-200 shadow-sm py-2">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                 <button 
                    onClick={() => { setCurrentScript(null); setStatus(AnalysisStatus.IDLE); }}
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Tạo mới
                </button>
            </div>
          </div>
      )}

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        
        {notification && (
            <div className={`fixed top-20 right-8 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in-down border ${notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-gray-800 text-white border-gray-700'}`}>
                {notification.type === 'error' ? <AlertTriangle className="w-6 h-6 text-red-500" /> : <CheckCircle className="w-6 h-6 text-green-400" />}
                <span className="font-medium">{notification.msg}</span>
            </div>
        )}

        {/* --- TRƯỜNG HỢP 1: CHƯA CÓ KỊCH BẢN NÀO ĐƯỢC CHỌN (TRANG CHỦ) --- */}
        {!currentScript && (
             <div className="flex flex-col items-center justify-center min-h-[60vh]">
                {/* Chỉ hiển thị Intro Text nếu KHÔNG đang xử lý (vì nếu đang xử lý, Overlay to sẽ đè lên) */}
                {status !== AnalysisStatus.ANALYZING && (
                    <div className="text-center mb-10 max-w-2xl">
                        <h1 className="text-4xl font-extrabold text-gray-900 mb-4 sm:text-5xl">
                            Biến Video thành <span className="text-blue-600">Kịch bản chi tiết</span>
                        </h1>
                        <p className="text-lg text-gray-500">
                            Kéo thả hàng loạt video. AI phân tích tự động. Lưu trữ Cloud Realtime.
                        </p>
                    </div>
                )}
                
                {/* Nếu đang xử lý (Overlay Full Mode) -> Ẩn Uploader để tránh rối mắt */}
                {status !== AnalysisStatus.ANALYZING && (
                    <VideoUploader 
                        onFileSelect={handleFileSelect} 
                        onUrlSubmit={handleUrlSubmit}
                        isLoading={false}
                    />
                )}
                
                {/* Danh sách kịch bản gần đây */}
                {savedScripts.length > 0 && status !== AnalysisStatus.ANALYZING && (
                    <div className="mt-12 w-full max-w-4xl">
                        <div className="flex items-center gap-2 mb-4 text-gray-500 font-medium">
                            <Layout className="w-4 h-4" />
                            <span>Kịch bản gần đây {user.uid === 'guest' ? '(Trên máy này)' : '(Trên Cloud)'}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {savedScripts.slice(0, 3).map(script => (
                                <button 
                                    key={script.id}
                                    onClick={() => setCurrentScript(script)}
                                    className="text-left p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all group"
                                >
                                    <h4 className="font-semibold text-gray-800 truncate group-hover:text-blue-600">{script.title}</h4>
                                    <p className="text-xs text-gray-400 mt-1">{new Date(script.createdAt).toLocaleDateString()}</p>
                                    {script.userId === 'guest' && user.uid !== 'guest' && <span className="text-[10px] text-amber-500 flex items-center gap-1 mt-1"><WifiOff className="w-3 h-3"/> Chưa đồng bộ</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* --- TRƯỜNG HỢP 2: ĐANG XEM KỊCH BẢN (GIAO DIỆN CHÍNH) --- */}
        {currentScript && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-9 space-y-6">
                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm gap-4">
                        <div className="flex items-center gap-3">
                           <h2 className="text-lg font-bold text-gray-800 truncate max-w-[200px] sm:max-w-md" title={currentScript.title}>
                               {currentScript.title}
                           </h2>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button 
                                onClick={handleOptimize}
                                disabled={status === AnalysisStatus.OPTIMIZING}
                                className="flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 text-sm font-medium transition-colors border border-purple-100"
                            >
                                <Sparkles className="w-4 h-4" />
                                {status === AnalysisStatus.OPTIMIZING ? 'Đang viết lại...' : 'Tối ưu AI'}
                            </button>
                            <button onClick={handleCopyScript} className="flex items-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-medium transition-colors border border-gray-200">
                                <Copy className="w-4 h-4" /> Copy
                            </button>
                            <button onClick={handleOpenGoogleSheets} className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium shadow-sm transition-colors">
                                <FileSpreadsheet className="w-4 h-4" /> Sheet
                            </button>
                        </div>
                    </div>

                    <ScriptViewer analysis={currentScript} onUpdateTags={updateCurrentTags} />
                </div>

                <div className="lg:col-span-3">
                    <ScriptLibrary 
                        savedScripts={savedScripts} 
                        activeId={currentScript.id}
                        onSelect={(id) => setCurrentScript(savedScripts.find(s => s.id === id) || null)}
                        onDelete={deleteScript}
                    />
                </div>
            </div>
        )}
      </main>
    </div>
  );
};

export default App;