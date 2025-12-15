import { GoogleGenAI, Type } from "@google/genai";
import { Scene, ScriptAnalysis } from "../types";

// Helper để lấy instance AI an toàn
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === "undefined") {
    throw new Error("Chưa cấu hình API Key Gemini. Vui lòng kiểm tra biến môi trường VITE_GEMINI_API_KEY.");
  }
  
  return new GoogleGenAI({ apiKey });
};

const SYSTEM_INSTRUCTION = `
Bạn là một chuyên gia biên kịch và phân tích video ngắn (TikTok/Reels/Shorts). 
Nhiệm vụ của bạn là xem video được cung cấp và tạo ra một bảng phân cảnh chi tiết (Storyboard/Script) bằng tiếng Việt.

Đầu ra phải là JSON thuần túy, bao gồm danh sách các phân cảnh. 
Mỗi phân cảnh cần có:
1. Thời gian bắt đầu và kết thúc (ước lượng).
2. Loại phân cảnh (Ví dụ: "Mở đầu thu hút", "Thông tin sản phẩm", "Điểm bán hàng độc đáo", "Bối cảnh sử dụng", "Kêu gọi hành động").
3. Mô tả hình ảnh chi tiết (Visual): Những gì diễn ra trên màn hình, hành động, text overlay.
4. Kịch bản phát ngôn (Audio): Lời thoại hoặc nội dung voiceover.

Văn phong phải tự nhiên, phù hợp với nền tảng video ngắn tại Việt Nam.
`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Tiêu đề gợi ý cho kịch bản" },
    scenes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          startTime: { type: Type.STRING, description: "Thời gian bắt đầu, format MM:SS hoặc số giây" },
          endTime: { type: Type.STRING, description: "Thời gian kết thúc, format MM:SS hoặc số giây" },
          type: { type: Type.STRING, description: "Loại phân cảnh (Hook, Body, CTA, etc.)" },
          visualDescription: { type: Type.STRING, description: "Mô tả chi tiết hình ảnh" },
          audioScript: { type: Type.STRING, description: "Lời thoại hoặc text hiển thị" },
        },
        required: ["startTime", "endTime", "type", "visualDescription", "audioScript"],
      },
    },
  },
  required: ["title", "scenes"],
};

/**
 * Core function to send base64 video data to Gemini
 */
async function analyzeBase64Video(base64Data: string, mimeType: string): Promise<Partial<ScriptAnalysis>> {
  const ai = getAiClient();
  
  // Fallback if mimeType is empty or invalid for common video containers
  const validMimeType = (mimeType && mimeType.startsWith('video/')) ? mimeType : 'video/mp4';

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: validMimeType,
            data: base64Data
          }
        },
        {
          text: "Phân tích video này và trích xuất kịch bản chi tiết."
        }
      ]
    },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA
    }
  });

  if (!response.text) throw new Error("No response from AI");
  const json = JSON.parse(response.text);

  // Transform to our app's ID structure
  const scenes: Scene[] = json.scenes.map((s: any, index: number) => ({
    id: `scene-${Date.now()}-${index}`,
    startTime: s.startTime,
    endTime: s.endTime,
    type: s.type,
    visualDescription: s.visualDescription,
    audioScript: s.audioScript
  }));

  return {
    title: json.title,
    scenes: scenes
  };
}

/**
 * Helper to fetch TikTok video data using TikWM public API via multiple CORS Proxies
 */
async function fetchTikTokData(tiktokUrl: string): Promise<Blob> {
  const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(tiktokUrl)}`;
  
  // List of proxies to try in order
  const proxies = [
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  ];

  let json: any = null;
  let success = false;

  // 1. Attempt to resolve video URL via proxies
  for (const createProxyUrl of proxies) {
    try {
      const proxyApiUrl = createProxyUrl(apiUrl);
      console.log(`[TikTok Analysis] Attempting resolution via: ${proxyApiUrl}`);
      
      const apiRes = await fetch(proxyApiUrl);
      if (apiRes.ok) {
        const data = await apiRes.json();
        // Check if TikWM response is valid
        if (data && data.code === 0 && data.data?.play) {
          json = data;
          success = true;
          break; // Found valid data, stop trying proxies
        } else {
            console.warn("[TikTok Analysis] Invalid data from TikWM via proxy:", data);
        }
      } else {
        console.warn(`[TikTok Analysis] Proxy fetch failed with status: ${apiRes.status}`);
      }
    } catch (e) {
      console.warn("[TikTok Analysis] Proxy attempt error:", e);
    }
  }

  if (!success || !json) {
    throw new Error("Không thể phân giải link TikTok này. Có thể link sai, video riêng tư, hoặc server TikWM đang bận. Vui lòng thử lại hoặc tải video về máy và upload.");
  }

  const videoUrl = json.data.play;
  console.log("[TikTok Analysis] Found video URL:", videoUrl);

  // 2. Download the actual video binary via proxies
  for (const createProxyUrl of proxies) {
    try {
      const proxyVideoUrl = createProxyUrl(videoUrl);
      console.log(`[TikTok Analysis] Downloading video via: ${proxyVideoUrl}`);
      
      const videoRes = await fetch(proxyVideoUrl);
      
      if (videoRes.ok) {
        const blob = await videoRes.blob();
        if (blob.size > 0) {
            return blob;
        }
      }
    } catch (e) {
      console.warn("[TikTok Analysis] Video download proxy failed:", e);
    }
  }
  
  throw new Error("Đã tìm thấy video nhưng không thể tải xuống (CDN blocked). Vui lòng tải video về máy và upload thủ công.");
}

export const analyzeVideoFile = async (file: File): Promise<Partial<ScriptAnalysis>> => {
  try {
    // Convert File to Base64
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    return await analyzeBase64Video(base64Data, file.type);
  } catch (error) {
    console.error("Error analyzing video file:", error);
    throw error;
  }
};

export const analyzeVideoUrl = async (url: string): Promise<Partial<ScriptAnalysis>> => {
  let blob: Blob;

  try {
    // Check if it's a TikTok URL
    if (url.includes('tiktok.com')) {
        blob = await fetchTikTokData(url);
    } else {
        // Generic URL handling (Direct MP4 links)
        try {
            // Attempt direct fetch
            const response = await fetch(url);
            if (!response.ok) throw new Error("Direct fetch failed");
            blob = await response.blob();
        } catch (directError) {
            // Fallback to proxy
            console.warn("Direct fetch failed, attempting CORS proxy...");
            try {
                const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
                const proxyResponse = await fetch(proxyUrl);
                if (!proxyResponse.ok) throw new Error("Proxy fetch failed");
                blob = await proxyResponse.blob();
            } catch (proxyError) {
                // Second fallback
                 const proxyUrl2 = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
                 const proxyResponse2 = await fetch(proxyUrl2);
                 if (!proxyResponse2.ok) throw new Error("All proxies failed");
                 blob = await proxyResponse2.blob();
            }
        }
    }
  } catch (error: any) {
    console.error("Error fetching video:", error);
    throw new Error(error.message || "Không thể tải video từ link này. Vui lòng tải file về và upload thủ công.");
  }

  // Validation: Relaxed check
  if (blob.type.startsWith('image/') || blob.type.includes('html')) {
     // Basic check to ensure it's not an image or error page
     throw new Error(`Link này trả về ${blob.type}, không phải video.`);
  }

  try {
    // Convert Blob to Base64
    const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

    return await analyzeBase64Video(base64Data, blob.type);

  } catch (error: any) {
    console.error("Error processing video data:", error);
    throw error;
  }
};

export const optimizeScriptWithAI = async (currentAnalysis: ScriptAnalysis): Promise<Scene[]> => {
  try {
    const ai = getAiClient();
    
    const prompt = `
      Dưới đây là một kịch bản video TikTok hiện tại (định dạng JSON).
      Hãy tối ưu hóa nội dung của phần "audioScript" (Kịch bản phát ngôn) để nó hấp dẫn hơn, viral hơn, 
      và có tính chuyển đổi cao hơn (bán hàng tốt hơn).
      Giữ nguyên cấu trúc thời gian và mô tả hình ảnh, chỉ viết lại lời thoại cho hay hơn.
      
      Kịch bản hiện tại:
      ${JSON.stringify(currentAnalysis.scenes)}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: "Bạn là chuyên gia tối ưu nội dung Marketing. Trả về JSON mảng các scenes đã chỉnh sửa.",
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                scenes: RESPONSE_SCHEMA.properties.scenes
            }
        }
      }
    });

     if (!response.text) throw new Error("No response from AI");
     const json = JSON.parse(response.text);
     
     // Remap IDs from original if possible, or create new ones
     return json.scenes.map((s: any, index: number) => ({
        ...s,
        id: currentAnalysis.scenes[index]?.id || `scene-opt-${Date.now()}-${index}`
     }));

  } catch (error) {
    console.error("Optimization failed", error);
    throw error;
  }
}