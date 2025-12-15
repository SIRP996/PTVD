import { GoogleGenAI, Type } from "@google/genai";
import { Scene, ScriptAnalysis } from "../types";

// --- CONFIG ---
const MAX_FILE_SIZE_MB = 50;
const TIMEOUT_AI_MS = 120000; // 2 phút tối đa cho 1 request AI
const TIMEOUT_FETCH_MS = 30000;

// Khởi tạo AI Client một lần (Singleton pattern để ổn định như code cũ)
// Sử dụng fallback string rỗng để tránh crash nếu env chưa load kịp (dù Vite đã handle)
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// Schema
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    scenes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          startTime: { type: Type.STRING },
          endTime: { type: Type.STRING },
          type: { type: Type.STRING },
          visualDescription: { type: Type.STRING },
          audioScript: { type: Type.STRING },
        },
        required: ["startTime", "endTime", "type", "visualDescription", "audioScript"],
      },
    },
  },
  required: ["title", "scenes"],
};

// --- CORE FUNCTIONS ---

async function fetchWithTimeout(resource: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_FETCH_MS);
  try {
    const response = await fetch(resource, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function analyzeBase64Video(base64Data: string, mimeType: string): Promise<Partial<ScriptAnalysis>> {
  // Check API Key runtime
  if (!process.env.API_KEY || process.env.API_KEY === "undefined") {
      throw new Error("Lỗi: Chưa có API Key. Vui lòng kiểm tra file .env hoặc cấu hình Vercel.");
  }

  const validMimeType = mimeType && mimeType.startsWith('video/') ? mimeType : 'video/mp4';

  console.log(`[Gemini] Sending request... Mime: ${validMimeType}, Data Length: ${base64Data.length}`);

  // Promise gọi AI
  const aiPromise = ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { inlineData: { mimeType: validMimeType, data: base64Data } },
        { text: "Phân tích video này và trích xuất kịch bản chi tiết. Bắt buộc trả về JSON." }
      ]
    },
    config: {
      systemInstruction: "Bạn là chuyên gia phân tích video. Trích xuất kịch bản gồm: startTime, endTime, type, visualDescription, audioScript. Trả về JSON.",
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA
    }
  });

  // Promise Timeout
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error("Hết thời gian chờ (Timeout). AI không phản hồi sau 2 phút.")), TIMEOUT_AI_MS)
  );

  // Đua
  try {
      const response: any = await Promise.race([aiPromise, timeoutPromise]);
      
      if (!response.text) throw new Error("AI trả về kết quả rỗng.");
      console.log("[Gemini] Response received.");
      
      const json = JSON.parse(response.text);
      const scenes: Scene[] = json.scenes.map((s: any, index: number) => ({
        id: `scene-${Date.now()}-${index}`,
        startTime: s.startTime || "00:00",
        endTime: s.endTime || "00:00",
        type: s.type || "Phân cảnh",
        visualDescription: s.visualDescription || "",
        audioScript: s.audioScript || ""
      }));

      return {
        title: json.title || "Kịch bản video",
        scenes: scenes
      };
  } catch (error: any) {
      console.error("[Gemini] Error:", error);
      throw error;
  }
}

export const analyzeVideoFile = async (file: File): Promise<Partial<ScriptAnalysis>> => {
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > MAX_FILE_SIZE_MB) {
      throw new Error(`File quá lớn (${fileSizeMB.toFixed(2)}MB). Vui lòng dùng file < ${MAX_FILE_SIZE_MB}MB.`);
  }

  try {
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
         const res = reader.result as string;
         resolve(res.split(',')[1]);
      };
      reader.onerror = () => reject(new Error("Lỗi đọc file."));
      reader.readAsDataURL(file);
    });

    return await analyzeBase64Video(base64Data, file.type);
  } catch (error) {
    console.error("File Analysis Error:", error);
    throw error;
  }
};

export const analyzeVideoUrl = async (url: string): Promise<Partial<ScriptAnalysis>> => {
  try {
    let blob: Blob;
    // Simple Proxy Logic
    const proxyUrl = url.includes('tiktok.com') 
        ? `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}` // Just for ID lookup, logic separated below
        : `https://corsproxy.io/?${encodeURIComponent(url)}`;

    // TikTok Specific Logic simplified
    if (url.includes('tiktok.com')) {
         const tikRes = await fetchWithTimeout(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
         const tikData = await tikRes.json();
         if (!tikData.data?.play) throw new Error("Không lấy được link tải TikTok.");
         
         const videoRes = await fetchWithTimeout(`https://corsproxy.io/?${encodeURIComponent(tikData.data.play)}`);
         blob = await videoRes.blob();
    } else {
         // Direct/Generic
         const res = await fetchWithTimeout(proxyUrl);
         if (!res.ok) throw new Error("Không tải được video từ URL.");
         blob = await res.blob();
    }

    if (blob.size / (1024*1024) > MAX_FILE_SIZE_MB) throw new Error("Video tải về quá lớn.");
    
    const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

    return await analyzeBase64Video(base64Data, blob.type);
  } catch (error) {
    console.error("URL Analysis Error:", error);
    throw error;
  }
};

export const optimizeScriptWithAI = async (currentAnalysis: ScriptAnalysis): Promise<Scene[]> => {
  try {
    const prompt = `Tối ưu lời thoại kịch bản sau: ${JSON.stringify(currentAnalysis.scenes)}`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: { type: Type.OBJECT, properties: { scenes: RESPONSE_SCHEMA.properties.scenes } }
      }
    });
     const json = JSON.parse(response.text!);
     return json.scenes.map((s: any, i: number) => ({ ...s, id: currentAnalysis.scenes[i]?.id || `opt-${i}` }));
  } catch (e) { throw e; }
}