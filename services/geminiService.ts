import { GoogleGenAI, Type } from "@google/genai";
import { PropertyData } from "../types.ts";

const SYSTEM_INSTRUCTION = `
You are a hospitality-focused Airbnb Superhost assistant.
Your task is to create a professional digital House Manual JSON.

CRITICAL RULES FOR VIDEO GUIDES:
1. You MUST include EVERY YouTube URL provided in the "Video Guides" input.
2. These videos are often tutorials for appliances (coffee machine), locks, or electronics.
3. Ensure the titles in the JSON match or professionally refine the titles provided by the host.

REQUIRED JSON STRUCTURE:
{
  "welcome": "Short warm welcome message.",
  "host": {
    "name": "Host Name",
    "photo": "IMG_PLACEHOLDER_HOST"
  },
  "heroImageUrl": "IMG_PLACEHOLDER_HERO",
  "gallery": ["IMG_PLACEHOLDER_GALLERY_0", "IMG_PLACEHOLDER_GALLERY_1", "..."],
  "videoGuides": [
    {"title": "Video Title", "url": "YouTube URL"}
  ],
  "wifi": {
    "name": "Network name",
    "password": "Password",
    "instructions": "Where the router is or signal tips."
  },
  "checkIn": {
    "method": "How to get in",
    "instructions": "Step by step details.",
    "accessCode": "If applicable"
  },
  "houseRules": ["Rule 1", "Rule 2", "..."],
  "emergency": {
    "phone": "Emergency contact",
    "safetyInfo": "Fire extinguisher location, first aid, etc."
  },
  "localGems": [
    {"name": "Place Name", "type": "Restaurant/Bar/Activity", "description": "Why guests love it."}
  ],
  "checkout": {
    "time": "Time",
    "tasks": ["Task 1", "Task 2"]
  }
}
`;

export const generateGuestGuide = async (data: PropertyData): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Create a mapping to avoid sending large base64 strings to the LLM.
  const imageMap: Record<string, string> = {
    "IMG_PLACEHOLDER_HOST": data.hostImageUrl || '',
    "IMG_PLACEHOLDER_HERO": data.heroImageUrl || '',
  };

  const galleryPlaceholders: string[] = [];
  (data.additionalPhotos || []).forEach((photo, idx) => {
    if (photo && photo.startsWith('data:image')) {
      const key = `IMG_PLACEHOLDER_GALLERY_${idx}`;
      imageMap[key] = photo;
      galleryPlaceholders.push(key);
    }
  });

  const prompt = `
    PROPERTY DATA:
    Name: ${data.propertyName}
    Host: ${data.hostName}
    Location: ${data.location}
    Check-in: ${data.checkInMethod} at ${data.checkInTime}
    Check-out: ${data.checkOutTime}
    WiFi: ${data.wifiName} / ${data.wifiPassword}
    Emergency: ${data.emergencyPhone}
    Rules: ${JSON.stringify(data.houseRules || [])}
    Parking: ${data.parkingInfo}
    Restaurants: ${data.restaurants}
    Activities: ${data.activities}
    Tasks: ${data.checkoutTasks}
    Video Guides: ${JSON.stringify(data.videoGuides || [])}

    INSTRUCTIONS: 
    1. Generate the guest guide JSON following the system instructions.
    2. Use THESE EXACT placeholders for images:
       - Host Photo: "IMG_PLACEHOLDER_HOST"
       - Hero Photo: "IMG_PLACEHOLDER_HERO"
       - Gallery: ${JSON.stringify(galleryPlaceholders)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    let resultText = response.text || "{}";
    
    // Re-hydrate the images back into the JSON string before returning
    Object.entries(imageMap).forEach(([placeholder, realValue]) => {
      if (realValue) {
        resultText = resultText.split(`"${placeholder}"`).join(`"${realValue}"`);
      }
    });

    return resultText;
  } catch (error) {
    console.error("Error generating guide:", error);
    throw new Error("AI Superhost timed out. This usually happens if photos are too large. Try using smaller images or fewer gallery photos.");
  }
};

export const startConciergeChat = (guideData: any) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Clean the guide data for the chat context to avoid token bloat from images
  const sanitizedData = JSON.parse(JSON.stringify(guideData));
  if (sanitizedData.heroImageUrl) sanitizedData.heroImageUrl = "[Image URL]";
  if (sanitizedData.host?.photo) sanitizedData.host.photo = "[Host Photo]";
  if (sanitizedData.gallery) sanitizedData.gallery = `[${sanitizedData.gallery.length} photos available in gallery]`;

  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `
        You are the Smart Concierge for this property: ${JSON.stringify(sanitizedData)}.
        Your goal is to help the guest with any questions they have about their stay.
        Answer based ONLY on the provided guide data. 
        If a video guide exists (e.g., for the smart lock or TV), tell the guest specifically that a video tutorial is available in the "Video Tutorials" section.
        If you don't know the answer, politely suggest they contact the host, ${sanitizedData.host?.name || 'the host'}, directly.
        Be extremely friendly, helpful, and concise.
      `,
    },
  });
};