import React, { useState, useEffect, useRef } from 'react';
import { VideoUploader } from './components/VideoUploader';
import { ScriptViewer } from './components/ScriptViewer';
import { ScriptLibrary } from './components/ScriptLibrary';
import { Auth } from './components/Auth';
import { ScriptAnalysis, AnalysisStatus } from './types';
import { analyzeVideoFile, analyzeVideoUrl, optimizeScriptWithAI } from './services/geminiService';
import { saveScriptToDb, fetchScriptsFromDb, deleteScriptFromDb } from './services/firebaseService';
import { auth } from './firebaseConfig';
import firebase from 'firebase/compat/app'; // Updated to compat import
import { Save, Copy, Sparkles, Layout, Plus, CheckCircle, FileSpreadsheet, Cloud, LogOut, User as UserIcon, AlertTriangle, Timer } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<firebase.User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [currentScript, setCurrentScript] = useState<ScriptAnalysis | null>(null);
  const [savedScripts, setSavedScripts] = useState<ScriptAnalysis[]>([]);
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [processingState, setProcessingState] = useState<{current: number, total: number} | undefined>(undefined);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Timer logic
  const [timer, setTimer] = useState(0);
  const timerIntervalRef = useRef<number | null>(null);

  useEffect(() => {
      if (status === AnalysisStatus.ANALYZING || status === AnalysisStatus.OPTIMIZING) {
          setTimer(0);
          timerIntervalRef.current = window.setInterval(() => {
              setTimer(prev => prev + 1);
          }, 1000);
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

  // Format Timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Monitor Real Firebase Auth State
  useEffect(() => {
    if (!auth) {
        setLoadingAuth(false);
        return;
    }
    // Using namespaced onAuthStateChanged
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
        setUser(currentUser);
        setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // Load scripts when user logs in (Real Firestore Fetch)
  useEffect(() => {
    if (user) {
        const loadScripts = async () => {
            setIsSyncing(true);
            try {
                const scripts = await fetchScriptsFromDb(user.uid);
                setSavedScripts(scripts);
            } catch (error) {
                console.error("Failed to load scripts", error);
                showNotification("Lỗi tải dữ liệu từ Cloud.", 'error');
            } finally {
                setIsSyncing(false);
            }
        };
        loadScripts();
    } else {
        setSavedScripts([]);
        setCurrentScript(null);
    }
  }, [user]);

  const handleLogout = async () => {
      if (auth) {
        await auth.signOut();
        showNotification("Đã đăng xuất.", 'success');
      }
  };

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
      setNotification({ msg, type });
      setTimeout(() => setNotification(null), 5000); 
  }

  // BATCH PROCESSING LOGIC
  const handleFileSelect = async (files: File[]) => {
    if (files.length === 0 || !user) return;

    setStatus(AnalysisStatus.ANALYZING);
    setProcessingState({ current: 0, total: files.length });
    
    let successCount = 0;

    // Process sequentially
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProcessingState({ current: i + 1, total: files.length });
        
        try {
            // Hiển thị thông báo đang xử lý file nào để người dùng biết app không bị treo
            showNotification(`Đang đọc file ${i+1}/${files.length}: ${file.name}...`, 'success');
            
            const result = await analyzeVideoFile(file);
            
            const newScript: ScriptAnalysis = {
                id: `script-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                userId: user.uid,
                title: result.title || file.name,
                videoName: file.name,
                createdAt: Date.now(),
                tags: [],
                scenes: result.scenes || []
            };

            await saveScriptToDb(newScript);

            setSavedScripts(prev => [newScript, ...prev]);
            setCurrentScript(newScript);
            successCount++;

        } catch (error: any) {
            console.error(`Error processing file ${file.name}:`, error);
            // Hiển thị lỗi cụ thể
            showNotification(`Lỗi ${file.name}: ${error.message}`, 'error');
            // Dừng lại 1 chút để người dùng kịp đọc lỗi trước khi qua file tiếp theo
            await new Promise(r => setTimeout(r, 2000));
        }
    }

    setProcessingState(undefined);
    setStatus(AnalysisStatus.COMPLETE);
    
    if (successCount > 0) {
        showNotification(`Đã hoàn thành ${successCount}/${files.length} video!`, 'success');
    } else {
        showNotification("Không thể xử lý video nào. Vui lòng kiểm tra lại file.", 'error');
    }
  };

  const handleUrlSubmit = async (url: string) => {
    if (!user) return;
    setStatus(AnalysisStatus.ANALYZING);
    showNotification("Đang tải và phân tích video từ URL...", 'success');
    
    try {
        const result = await analyzeVideoUrl(url);
        
        const newScript: ScriptAnalysis = {
            id: `script-${Date.now()}`,
            userId: user.uid,
            title: result.title || "URL Analysis",
            videoName: url,
            createdAt: Date.now(),
            tags: [],
            scenes: result.scenes || []
        };

        await saveScriptToDb(newScript);

        setCurrentScript(newScript);
        setSavedScripts(prev => [newScript, ...prev]);
        setStatus(AnalysisStatus.COMPLETE);
        showNotification("Đã lưu kịch bản vào Cloud!", 'success');
    } catch (error: any) {
        console.error(error);
        setStatus(AnalysisStatus.ERROR);
        showNotification(error.message || "Lỗi khi phân tích URL.", 'error');
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

    const tsvContent = headers.join("\t") + "\n" + rows.join("\n");
    
    navigator.clipboard.writeText(tsvContent);
    showNotification("Đã copy dữ liệu dạng bảng!", 'success');
  };

  const handleOpenGoogleSheets = () => {
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
    const tsvContent = headers.join("\t") + "\n" + rows.join("\n");

    navigator.clipboard.writeText(tsvContent)
      .then(() => {
          window.open("https://sheets.new", "_blank");
          showNotification("Đã copy! Nhấn Ctrl+V vào Google Sheet.", 'success');
      })
      .catch((err) => {
          console.error('Could not copy text: ', err);
          showNotification("Lỗi copy clipboard.", 'error');
      });
  };

  const handleOptimize = async () => {
    if (!currentScript) return;
    setStatus(AnalysisStatus.OPTIMIZING);
    try {
        const optimizedScenes = await optimizeScriptWithAI(currentScript);
        const updatedScript = {
            ...currentScript,
            scenes: optimizedScenes
        };
        
        await saveScriptToDb(updatedScript);

        setCurrentScript(updatedScript);
        setSavedScripts(prev => prev.map(s => s.id === updatedScript.id ? updatedScript : s));
        
        showNotification("Đã tối ưu và cập nhật Cloud!", 'success');
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

          try {
            await saveScriptToDb(updatedScript);
          } catch (e) {
            showNotification("Lỗi lưu tag lên Cloud!", 'error');
          }
      }
  };

  const deleteScript = async (id: string) => {
      if(!window.confirm("Bạn có chắc muốn xóa kịch bản này vĩnh viễn trên Cloud?")) return;

      try {
          await deleteScriptFromDb(id);
          setSavedScripts(savedScripts.filter(s => s.id !== id));
          if (currentScript?.id === id) {
              setCurrentScript(null);
          }
          showNotification("Đã xóa kịch bản.", 'success');
      } catch (e) {
          showNotification("Lỗi khi xóa kịch bản.", 'error');
      }
  };

  // --- RENDERING ---

  if (loadingAuth) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
      );
  }

  if (!user) {
      return <Auth onLoginSuccess={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
                <div className="bg-blue-600 text-white p-1.5 rounded-lg">
                    <Layout className="w-6 h-6" />
                </div>
                <span className="font-bold text-xl tracking-tight text-gray-900 hidden sm:block">TikTok Script Architect</span>
                {isSyncing && <span className="text-xs text-gray-400 flex items-center gap-1 ml-2"><Cloud className="w-3 h-3 animate-bounce"/> Đồng bộ...</span>}
            </div>
            
            <div className="flex items-center gap-4">
                 {/* User Profile / Logout */}
                <div className="flex items-center gap-3 border-l border-gray-200 pl-4 ml-4">
                    <div className="hidden md:flex flex-col items-end">
                        <span className="text-xs font-semibold text-gray-700">{user.displayName}</span>
                        <span className="text-[10px] text-gray-400">{user.email}</span>
                    </div>
                    {user.photoURL ? (
                        <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full border border-gray-200" />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <UserIcon className="w-4 h-4" />
                        </div>
                    )}
                    <button 
                        onClick={handleLogout}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Đăng xuất"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Sub-nav for actions */}
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

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {notification && (
            <div className={`fixed top-20 right-8 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in-down border ${notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-gray-800 text-white border-gray-700'}`}>
                {notification.type === 'error' ? <AlertTriangle className="w-6 h-6 text-red-500" /> : <CheckCircle className="w-6 h-6 text-green-400" />}
                <span className="font-medium">{notification.msg}</span>
            </div>
        )}

        {/* Input Area (Only show if no script selected or idle) */}
        {!currentScript && (
             <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="text-center mb-10 max-w-2xl">
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-4 sm:text-5xl">
                        Biến Video thành <span className="text-blue-600">Kịch bản chi tiết</span>
                    </h1>
                    <p className="text-lg text-gray-500">
                        Kéo thả hàng loạt video. AI phân tích tự động. Lưu trữ Cloud Realtime.
                    </p>
                </div>
                <VideoUploader 
                    onFileSelect={handleFileSelect} 
                    onUrlSubmit={handleUrlSubmit}
                    isLoading={status === AnalysisStatus.ANALYZING} 
                    processingCount={processingState}
                    elapsedTime={timer}
                />
                
                {savedScripts.length > 0 && (
                    <div className="mt-12 w-full max-w-4xl">
                        <div className="flex items-center gap-2 mb-4 text-gray-500 font-medium">
                            <Layout className="w-4 h-4" />
                            <span>Kịch bản gần đây trên Cloud</span>
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
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* Main Workspace */}
        {currentScript && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Content: Script Viewer */}
                <div className="lg:col-span-9 space-y-6">
                    
                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm gap-4">
                        <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2 ${status === AnalysisStatus.OPTIMIZING || status === AnalysisStatus.ANALYZING ? 'bg-yellow-100 text-yellow-800 animate-pulse' : 'bg-green-100 text-green-800'}`}>
                                {status === AnalysisStatus.OPTIMIZING || status === AnalysisStatus.ANALYZING ? <Timer className="w-3 h-3"/> : null}
                                {status === AnalysisStatus.OPTIMIZING ? `Đang tối ưu AI (${formatTime(timer)})...` : 
                                 status === AnalysisStatus.ANALYZING ? `Đang xử lý ${processingState?.current}/${processingState?.total} (${formatTime(timer)})...` : 'Sẵn sàng'}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button 
                                onClick={handleOptimize}
                                disabled={status === AnalysisStatus.OPTIMIZING || status === AnalysisStatus.ANALYZING}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 font-medium transition-colors border border-purple-100"
                            >
                                <Sparkles className="w-4 h-4" />
                                Tối ưu AI
                            </button>
                            <button 
                                onClick={handleCopyScript}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors border border-gray-200"
                            >
                                <Copy className="w-4 h-4" />
                                Copy
                            </button>
                            <button 
                                onClick={handleOpenGoogleSheets}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-sm shadow-green-200 transition-colors"
                            >
                                <FileSpreadsheet className="w-4 h-4" />
                                Sheet
                            </button>
                        </div>
                    </div>

                    <ScriptViewer analysis={currentScript} onUpdateTags={updateCurrentTags} />
                </div>

                {/* Right Content: Sidebar */}
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