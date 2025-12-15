import { db } from "../firebaseConfig";
import { collection, doc, setDoc, getDocs, deleteDoc, query, where, orderBy } from "firebase/firestore";
import { ScriptAnalysis } from "../types";

const COLLECTION_NAME = "scripts";

// --- MAIN SERVICES (REAL FIREBASE) ---

export const saveScriptToDb = async (script: ScriptAnalysis) => {
  if (!db) throw new Error("Firebase DB not initialized");
  
  try {
    const docRef = doc(db, COLLECTION_NAME, script.id);
    await setDoc(docRef, script);
    console.log("Saved to Firestore:", script.id);
  } catch (e) {
    console.error("Error saving to Firebase:", e);
    throw e;
  }
};

export const fetchScriptsFromDb = async (userId: string): Promise<ScriptAnalysis[]> => {
  if (!db) throw new Error("Firebase DB not initialized");

  try {
    // Truy vấn: Lấy tất cả script của userId này
    const q = query(
      collection(db, COLLECTION_NAME), 
      where("userId", "==", userId)
    );
    
    const querySnapshot = await getDocs(q);
    const scripts: ScriptAnalysis[] = [];
    querySnapshot.forEach((doc) => {
      scripts.push(doc.data() as ScriptAnalysis);
    });
    
    // Sắp xếp giảm dần theo thời gian (mới nhất lên đầu)
    // Lưu ý: Nếu Firestore báo lỗi index, hãy click vào link trong console log để tạo index
    return scripts.sort((a, b) => b.createdAt - a.createdAt);
  } catch (e) {
    console.error("Error fetching from Firebase:", e);
    return [];
  }
};

export const deleteScriptFromDb = async (id: string) => {
  if (!db) throw new Error("Firebase DB not initialized");

  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    console.log("Deleted from Firestore:", id);
  } catch (e) {
    console.error("Error deleting from Firebase:", e);
    throw e;
  }
};
