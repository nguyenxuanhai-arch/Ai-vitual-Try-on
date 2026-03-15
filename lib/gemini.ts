import { GoogleGenAI } from "@google/genai";

export const getAI = (customKey?: string | null) => {
  const apiKey = customKey || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("Thiếu Gemini API Key. Vui lòng cấu hình trong phần Cài đặt hoặc biến môi trường NEXT_PUBLIC_GEMINI_API_KEY.");
  }
  
  return new GoogleGenAI({ apiKey });
};
