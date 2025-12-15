import { ScriptAnalysis } from "../types";

const LOCAL_STORAGE_KEY = "tiktok_scripts";

// --- HELPERS ---
const getLocalScripts = (userId?: string): ScriptAnalysis[] => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    const scripts: ScriptAnalysis[] = stored ? JSON.parse(stored) : [];
    // Nếu có userId, chỉ trả về script của user đó
    if (userId) {
        return scripts.filter(s => s.userId === userId);
    }
    return scripts;
  } catch (e) {
    return [];
  }
};

const saveLocalScripts = (scripts: ScriptAnalysis[]) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(scripts));
};

// --- MAIN SERVICES ---

export const saveScriptToDb = async (script: ScriptAnalysis) => {
  console.log("Saving to LocalStorage...");
  // Lấy tất cả scripts trong local
  let allScripts = getLocalScripts(); 
  // Tìm và update hoặc thêm mới
  const idx = allScripts.findIndex(s => s.id === script.id);
  if (idx >= 0) allScripts[idx] = script;
  else allScripts.unshift(script);
  
  saveLocalScripts(allScripts);
};

export const fetchScriptsFromDb = async (userId: string): Promise<ScriptAnalysis[]> => {
    // Fallback to LocalStorage directly since Firebase is disabled
    return getLocalScripts(userId);
};

export const deleteScriptFromDb = async (id: string) => {
    const scripts = getLocalScripts().filter(s => s.id !== id);
    saveLocalScripts(scripts);
};
