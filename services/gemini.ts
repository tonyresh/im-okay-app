
import { GoogleGenAI } from "@google/genai";
import { Language } from "../types";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getDailyAffirmation = async (language: Language) => {
  const prompt = language === Language.UA 
    ? "Напиши коротку позитивну фразу на 10 слів для людини, яка щойно відмітила що вона в порядку. Це має надихати."
    : "Write a short positive 10-word affirmation for someone who just checked in as safe. It should be inspiring.";

  try {
    // Generate content using the specified model and prompt
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // Use the .text property to access the generated content (not .text())
    return response.text || "You are doing great!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return language === Language.UA ? "Гарного дня!" : "Have a great day!";
  }
};

export const getFriendSupportMessage = async (friendName: string, hoursSinceLastCheckIn: number, language: Language) => {
  const prompt = language === Language.UA
    ? `Мій друг ${friendName} не відмічався вже ${hoursSinceLastCheckIn} годин. Напиши коротке, турботливе повідомлення, яке я можу йому надіслати.`
    : `My friend ${friendName} hasn't checked in for ${hoursSinceLastCheckIn} hours. Write a short, caring message I can send to check on them.`;

  try {
    // Generate content using the specified model and prompt
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // Use the .text property to access the generated content (not .text())
    return response.text || "Thinking of you!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return language === Language.UA ? "Як ти? Турбуюсь про тебе." : "How are you? Just checking in.";
  }
};
