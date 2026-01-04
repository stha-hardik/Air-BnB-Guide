import { GoogleGenAI, Type } from "@google/genai";
import { PropertyData } from "../types.ts";

const SYSTEM_INSTRUCTION = `
You are a hospitality-focused Airbnb Superhost assistant.
Your task is to create a professional digital House Manual JSON.

CRITICAL RULES:
1. Return ONLY the JSON object. No markdown, no pre-amble.
2. You MUST include EVERY YouTube URL provided in the "Video Guides" input.
3. Use THESE EXACT placeholders for images:
   - Host Photo: "IMG_PLACEHOLDER_HOST"
   - Hero Photo: "IMG_PLACEHOLDER_HERO"
   - Gallery images: "IMG_PLACEHOLDER_GALLERY_N" where N is the index.

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
    
    // Safety check: LLMs sometimes ignore the 'no markdown' instruction
    if (resultText.includes('```')) {
      resultText = resultText.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
    }

    // Re-hydrate the images back into the JSON string before returning
    Object.entries(imageMap).forEach(([placeholder, realValue]) => {
      if (realValue) {
        // Use a safe string replacement that doesn't break if base64 contains special chars
        resultText = resultText.split(`"${placeholder}"`).join(`"${realValue}"`);
      }
    });

    return resultText;
  } catch (error) {
    console.error("Error generating guide:", error);
    throw new Error("AI Superhost timed out or returned invalid data. Try using fewer high-resolution photos.");
  }
};

export const startConciergeChat = (guideData: any) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const sanitizedData = JSON.parse(JSON.stringify(guideData));
  if (sanitizedData.heroImageUrl) sanitizedData.heroImageUrl = "[Hero Image]";
  if (sanitizedData.host?.photo) sanitizedData.host.photo = "[Host Photo]";
  if (sanitizedData.gallery) sanitizedData.gallery = `[${sanitizedData.gallery.length} photos available]`;

  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `
        You are the Smart Concierge for this property: ${JSON.stringify(sanitizedData)}.
        Answer guest questions using ONLY this information. 
        If you don't know the answer, tell them to contact ${sanitizedData.host?.name || 'the host'}.
        Mention video tutorials if they ask about something that has a video guide.
        Keep answers short, friendly, and helpful.
      `,
    },
  });
};