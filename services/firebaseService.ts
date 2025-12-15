import { db } from "../firebaseConfig";
import { ScriptAnalysis } from "../types";

const COLLECTION_NAME = "scripts";

// --- MAIN SERVICES (FIREBASE NAMESPACED SYNTAX) ---

export const saveScriptToDb = async (script: ScriptAnalysis) => {
  if (!db) throw new Error("Firebase DB not initialized");
  
  try {
    // V8/Compat syntax: db.collection().doc().set()
    await db.collection(COLLECTION_NAME).doc(script.id).set(script);
    console.log("Saved to Firestore:", script.id);
  } catch (e) {
    console.error("Error saving to Firebase:", e);
    throw e;
  }
};

export const fetchScriptsFromDb = async (userId: string): Promise<ScriptAnalysis[]> => {
  if (!db) throw new Error("Firebase DB not initialized");

  try {
    // V8/Compat syntax: db.collection().where().get()
    const querySnapshot = await db.collection(COLLECTION_NAME)
      .where("userId", "==", userId)
      .get();
    
    const scripts: ScriptAnalysis[] = [];
    querySnapshot.forEach((doc) => {
      scripts.push(doc.data() as ScriptAnalysis);
    });
    
    // Sort logic (unchanged)
    return scripts.sort((a, b) => b.createdAt - a.createdAt);
  } catch (e) {
    console.error("Error fetching from Firebase:", e);
    return [];
  }
};

export const deleteScriptFromDb = async (id: string) => {
  if (!db) throw new Error("Firebase DB not initialized");

  try {
    // V8/Compat syntax
    await db.collection(COLLECTION_NAME).doc(id).delete();
    console.log("Deleted from Firestore:", id);
  } catch (e) {
    console.error("Error deleting from Firebase:", e);
    throw e;
  }
};
