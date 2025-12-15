import { db } from "../firebaseConfig";
import { ScriptAnalysis } from "../types";

const COLLECTION_NAME = "scripts";
const GUEST_STORAGE_KEY = "tiktok_scripts_guest";

// --- HELPERS FOR GUEST MODE ---
const getGuestScripts = (): ScriptAnalysis[] => {
  try {
    const data = localStorage.getItem(GUEST_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) { return []; }
};

const saveGuestScripts = (scripts: ScriptAnalysis[]) => {
  localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(scripts));
};

// --- MIGRATION SERVICE (New) ---
export const migrateGuestDataToUser = async (realUserId: string) => {
  if (!db) return 0;
  
  const guestScripts = getGuestScripts();
  if (guestScripts.length === 0) return 0;

  console.log(`Found ${guestScripts.length} guest scripts to migrate...`);
  let count = 0;

  const batch = db.batch();
  let hasData = false;

  for (const script of guestScripts) {
    // Chỉ migrate những script chưa có owner hoặc owner là guest
    if (script.userId === 'guest') {
        const newScript = { ...script, userId: realUserId };
        const docRef = db.collection(COLLECTION_NAME).doc(script.id);
        batch.set(docRef, newScript);
        hasData = true;
        count++;
    }
  }

  if (hasData) {
      await batch.commit();
      // Xóa data guest sau khi đã sync thành công để tránh duplicate lần sau
      localStorage.removeItem(GUEST_STORAGE_KEY);
  }
  
  return count;
};

// --- MAIN SERVICES ---

export const saveScriptToDb = async (script: ScriptAnalysis) => {
  // GUEST MODE
  if (script.userId === 'guest') {
    const scripts = getGuestScripts();
    const index = scripts.findIndex(s => s.id === script.id);
    if (index >= 0) {
      scripts[index] = script;
    } else {
      scripts.push(script);
    }
    saveGuestScripts(scripts);
    console.log("Saved to LocalStorage (Guest):", script.id);
    return;
  }

  // FIREBASE MODE
  if (!db) throw new Error("Firebase DB not initialized");
  try {
    await db.collection(COLLECTION_NAME).doc(script.id).set(script);
    console.log("Saved to Firestore:", script.id);
  } catch (e) {
    console.error("Error saving to Firebase:", e);
    throw e;
  }
};

export const fetchScriptsFromDb = async (userId: string): Promise<ScriptAnalysis[]> => {
  // GUEST MODE
  if (userId === 'guest') {
    const scripts = getGuestScripts();
    return scripts.sort((a, b) => b.createdAt - a.createdAt);
  }

  // FIREBASE MODE
  if (!db) throw new Error("Firebase DB not initialized");
  try {
    const querySnapshot = await db.collection(COLLECTION_NAME)
      .where("userId", "==", userId)
      .get();
    
    const scripts: ScriptAnalysis[] = [];
    querySnapshot.forEach((doc) => {
      scripts.push(doc.data() as ScriptAnalysis);
    });
    
    return scripts.sort((a, b) => b.createdAt - a.createdAt);
  } catch (e) {
    console.error("Error fetching from Firebase:", e);
    return [];
  }
};

export const deleteScriptFromDb = async (id: string, userId?: string) => {
  // GUEST MODE CHECK
  // Nếu userId là guest hoặc tìm thấy trong localStorage thì xóa ở local
  if (userId === 'guest') {
    const scripts = getGuestScripts();
    const newScripts = scripts.filter(s => s.id !== id);
    saveGuestScripts(newScripts);
    console.log("Deleted from LocalStorage:", id);
    return;
  }

  // FIREBASE MODE
  if (!db) throw new Error("Firebase DB not initialized");
  try {
    await db.collection(COLLECTION_NAME).doc(id).delete();
    console.log("Deleted from Firestore:", id);
  } catch (e) {
    console.error("Error deleting from Firebase:", e);
    throw e;
  }
};