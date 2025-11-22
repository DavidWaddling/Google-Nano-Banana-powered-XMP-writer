import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AnalysisResult } from '../types';
import { GEMINI_API_KEY } from "./apiKey";

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        title: {
            type: Type.STRING,
            description: "A short, catchy title for the image, maximum 10 words."
        },
        description: {
            type: Type.STRING,
            description: "A detailed description of the image, 50 words or less."
        },
        tags: {
            type: Type.ARRAY,
            items: {
                type: Type.STRING
            },
            description: "A list of exactly 20 relevant meta tag keywords for the image. These should be single words or short phrases."
        },
        latitude: {
            type: Type.NUMBER,
            description: "The geographical latitude for the provided location. Omit if no location is provided or found. Example: 43.6532"
        },
        longitude: {
            type: Type.NUMBER,
            description: "The geographical longitude for the provided location. Omit if no location is provided or found. Example: -79.3832"
        }
    },
    required: ["title", "description", "tags"]
};

export const analyzeImage = async (imagePart: { inlineData: { data: string; mimeType: string } }, location: string): Promise<AnalysisResult> => {
    if (GEMINI_API_KEY === "[Put your Google Gemini API key Here]") {
        throw new Error("API key not configured. Please add your Gemini API key to services/apiKey.ts");
    }
    try {
        let promptText = "Analyze this image and generate a title, description, and meta tags based on the provided JSON schema. Ensure the response strictly follows the schema.";
        if (location) {
            promptText = `Analyze this image, which was taken in or around "${location}". Generate a title, description, and meta tags. Also, provide the GPS latitude and longitude for "${location}". The response must follow the provided JSON schema.`;
        }
        
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { text: promptText },
                    imagePart
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                systemInstruction: "You are an expert photo metadata analyst. All your responses must use Canadian English spelling (e.g., 'colour', 'centre')."
            }
        });

        const jsonString = response.text.trim();
        const result: AnalysisResult = JSON.parse(jsonString);
        return result;

    } catch (error) {
        console.error("Error analyzing image with Gemini:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to analyze image: ${error.message}`);
        }
        throw new Error("An unknown error occurred during image analysis.");
    }
};
