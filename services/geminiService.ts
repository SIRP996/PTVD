import { GoogleGenAI, Type } from "@google/genai";
import { Scene, ScriptAnalysis } from "../types";

// --- CONFIG ---
const MAX_FILE_SIZE_MB = 30; 
const TIMEOUT_AI_MS = 300000; // 5 Phút
const TIMEOUT_FETCH_MS = 60000; // 60s cho việc tải video

// Khởi tạo AI Client
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

// --- HELPER FUNCTIONS ---

function cleanJsonString(text: string): string {
  if (!text) return "{}";
  const firstOpen = text.indexOf('{');
  const lastClose = text.lastIndexOf('}');
  if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
      return text.substring(firstOpen, lastClose + 1);
  }
  let clean = text.replace(/```json/gi, '').replace(/```/g, '');
  return clean.trim();
}

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

// Thêm tham số onProgress
async function analyzeBase64Video(
    base64Data: string, 
    mimeType: string, 
    onProgress?: (msg: string) => void
): Promise<Partial<ScriptAnalysis>> {
  
  if (!process.env.API_KEY || process.env.API_KEY.length < 5) {
      throw new Error("Chưa cấu hình API Key hoặc API Key không hợp lệ.");
  }

  const validMimeType = mimeType && mimeType.startsWith('video/') ? mimeType : 'video/mp4';
  
  onProgress?.(`Đang gửi ${(base64Data.length / 1024 / 1024).toFixed(2)} MB dữ liệu lên Google Gemini...`);
  console.log(`[Gemini] Processing... Size: ${(base64Data.length / 1024 / 1024).toFixed(2)} MB`);

  const safetySettings = [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
  ];

  const aiPromise = ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { inlineData: { mimeType: validMimeType, data: base64Data } },
        { text: "Bạn là biên tập viên video. Hãy xem video này và trích xuất kịch bản chi tiết. Trả về đúng định dạng JSON." }
      ]
    },
    config: {
      systemInstruction: "Phân tích video TikTok chi tiết theo từng cảnh quay (shot). Bỏ qua các vấn đề bản quyền nhạc. Output JSON only.",
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      safetySettings: safetySettings as any
    }
  });

  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error("Timeout: Video quá dài hoặc mạng quá chậm.")), TIMEOUT_AI_MS)
  );

  try {
      onProgress?.("AI đang xem video và viết kịch bản (Vui lòng đợi)...");
      const response: any = await Promise.race([aiPromise, timeoutPromise]);
      
      if (!response || !response.text) {
          throw new Error("AI từ chối xử lý video này.");
      }
      
      onProgress?.("Đang xử lý kết quả trả về...");
      console.log("[Gemini] Raw:", response.text.substring(0, 100) + "..."); 

      const cleanedText = cleanJsonString(response.text);
      let json;
      
      try {
        json = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error("JSON Parse Error. Cleaned text:", cleanedText);
        return {
            title: "Lỗi định dạng (Xem chi tiết)",
            scenes: [{
                id: 'error-scene',
                startTime: '00:00',
                endTime: 'End',
                type: 'Lỗi phân tích',
                visualDescription: 'AI đã trả về kết quả nhưng không đúng định dạng JSON.',
                audioScript: response.text
            }]
        };
      }

      const scenes: Scene[] = json.scenes?.map((s: any, index: number) => ({
        id: `scene-${Date.now()}-${index}`,
        startTime: s.startTime || "00:00",
        endTime: s.endTime || "--:--",
        type: s.type || "Cảnh quay",
        visualDescription: s.visualDescription || "Không có mô tả",
        audioScript: s.audioScript || "Không có lời thoại"
      })) || [];

      return {
        title: json.title || "Kịch bản phân tích",
        scenes: scenes
      };

  } catch (error: any) {
      console.error("[Gemini] Error:", error);
      throw error;
  }
}

export const analyzeVideoFile = async (file: File, onProgress?: (msg: string) => void): Promise<Partial<ScriptAnalysis>> => {
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > MAX_FILE_SIZE_MB) {
      throw new Error(`File quá lớn (${fileSizeMB.toFixed(1)}MB). Vui lòng dùng file < ${MAX_FILE_SIZE_MB}MB.`);
  }

  try {
    onProgress?.("Đang đọc file từ thiết bị...");
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
         const res = reader.result as string;
         const base64 = res.includes(',') ? res.split(',')[1] : res;
         resolve(base64);
      };
      reader.onerror = () => reject(new Error("Lỗi đọc file từ trình duyệt."));
      reader.readAsDataURL(file);
    });

    return await analyzeBase64Video(base64Data, file.type, onProgress);
  } catch (error) {
    throw error;
  }
};

export const analyzeVideoUrl = async (url: string, onProgress?: (msg: string) => void): Promise<Partial<ScriptAnalysis>> => {
  try {
    let blob: Blob;
    
    // TikTok Logic
    if (url.includes('tiktok.com')) {
         onProgress?.("Đang lấy link tải TikTok không logo...");
         const tikRes = await fetchWithTimeout(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
         const tikData = await tikRes.json();
         
         if (!tikData.data?.play) {
             throw new Error("Không lấy được link video TikTok. Hãy thử tải video về máy và upload thủ công.");
         }
         
         onProgress?.("Đang tải video TikTok về bộ nhớ tạm...");
         const videoRes = await fetchWithTimeout(`https://corsproxy.io/?${encodeURIComponent(tikData.data.play)}`);
         if (!videoRes.ok) throw new Error("Lỗi tải video từ Server TikTok (Proxy block).");
         blob = await videoRes.blob();
    } else {
         onProgress?.("Đang tải video từ URL...");
         const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
         const res = await fetchWithTimeout(proxyUrl);
         if (!res.ok) throw new Error("Không thể tải video từ URL này.");
         blob = await res.blob();
    }

    const sizeMB = blob.size / (1024*1024);
    if (sizeMB > MAX_FILE_SIZE_MB) throw new Error(`Video quá lớn (${sizeMB.toFixed(1)}MB). Giới hạn ${MAX_FILE_SIZE_MB}MB.`);
    
    onProgress?.("Đang mã hóa video sang Base64...");
    const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const res = reader.result as string;
            const base64 = res.includes(',') ? res.split(',')[1] : res;
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

    return await analyzeBase64Video(base64Data, blob.type || 'video/mp4', onProgress);
  } catch (error) {
    console.error("URL Analysis Error:", error);
    throw error;
  }
};

export const optimizeScriptWithAI = async (currentAnalysis: ScriptAnalysis): Promise<Scene[]> => {
  try {
    const prompt = `Rewrite these scenes to be more viral on TikTok: ${JSON.stringify(currentAnalysis.scenes)}`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: { type: Type.OBJECT, properties: { scenes: RESPONSE_SCHEMA.properties.scenes } }
      }
    });
     
     const cleanedText = cleanJsonString(response.text!);
     const json = JSON.parse(cleanedText);
     return json.scenes.map((s: any, i: number) => ({ ...s, id: currentAnalysis.scenes[i]?.id || `opt-${i}` }));
  } catch (e) { throw e; }
}