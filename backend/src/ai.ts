import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { redis } from './redis';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `
You are the AI operations assistant for Nexus Stadium — a large-scale sporting venue.
Your goal is to guide attendees efficiently, minimize wait times, and improve their experience.
You have access to real-time tools to check queue times and crowd density.
Always prioritize safety and minimizing wait times. Be concise, friendly, and helpful.
Use emojis sparingly to make responses feel warm.

STADIUM LAYOUT:
- zone_A (North Stand): Contains 'North Stand Bites' (food, 🍔) and 'North Restroom' (🚻)
- zone_B (East Stand): Contains 'East Wing Café' (food, ☕) and 'East Restroom' (🚻)
- zone_C (South Stand): Contains 'South Gate Grill' (food, 🌮) and 'Fan Store' (merch, 🏪)
- zone_D (West Stand): Currently has no food or washroom POIs nearby

TOOL USAGE RULES:
- When a user asks about food, washrooms, or queues, ALWAYS use the checkQueueTimes tool first.
- When a user asks about crowd, congestion, or routes, ALWAYS use the checkCrowdDensity tool first.
- Use real data from tools to give specific recommendations. Never guess queue times.
- If multiple POIs match, compare them and recommend the one with the shortest wait.
- Format wait times clearly, e.g. "~5 min wait" or "about 12 minutes".

VALID POI IDs for checkQueueTimes:
- poi_food_1 (North Stand Bites)
- poi_food_2 (East Wing Café)  
- poi_food_3 (South Gate Grill)
- poi_washroom_1 (North Restroom)
- poi_washroom_2 (East Restroom)
- poi_merch_1 (Fan Store)

VALID ZONE IDs for checkCrowdDensity:
- zone_A, zone_B, zone_C, zone_D
`;

const checkQueueTool = {
  name: "checkQueueTimes",
  description: "Check the current queue length and estimated wait time for a specific point of interest (POI) like a food stall, washroom, or merchandise store. Returns live data.",
  parameters: {
    type: "OBJECT",
    properties: {
      poiId: {
        type: "STRING",
        description: "The ID of the POI. Valid values: poi_food_1, poi_food_2, poi_food_3, poi_washroom_1, poi_washroom_2, poi_merch_1"
      }
    },
    required: ["poiId"]
  }
};

const checkCrowdTool = {
  name: "checkCrowdDensity",
  description: "Check the current crowd density percentage and congestion status of a specific stadium zone. Returns live data.",
  parameters: {
    type: "OBJECT",
    properties: {
      zoneId: {
        type: "STRING",
        description: "The ID of the zone. Valid values: zone_A, zone_B, zone_C, zone_D"
      }
    },
    required: ["zoneId"]
  }
};

// Execute a tool call against live Redis data
async function executeTool(name: string, args: any): Promise<string> {
  if (name === 'checkQueueTimes') {
    const rawData = await redis.hget('stadium:pois', args.poiId);
    if (!rawData) return `No data available for POI: ${args.poiId}`;
    const data = JSON.parse(rawData);
    return `POI: ${data.name || args.poiId}, Type: ${data.type}, Zone: ${data.zone}, Queue Length: ${data.queueLength} people, Estimated Wait: ${data.waitMin} minutes.`;
  }
  
  if (name === 'checkCrowdDensity') {
    const rawData = await redis.hget('stadium:zones', args.zoneId);
    if (!rawData) return `No data available for zone: ${args.zoneId}`;
    const data = JSON.parse(rawData);
    return `Zone: ${args.zoneId}, Crowd Density: ${data.density}%, Status: ${data.status}.`;
  }
  
  return "Unknown tool.";
}

export const handleAiQuery = async (userPrompt: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools: [{ functionDeclarations: [checkQueueTool, checkCrowdTool] }],
      }
    });

    // Handle function calling
    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      const toolResult = await executeTool(call.name!, call.args as any);
      
      // Pass the tool result back to Gemini for a natural language response
      const followUp = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [{ text: userPrompt }] },
          { role: 'model', parts: [{ functionCall: call }] },
          { role: 'function', parts: [{ functionResponse: { name: call.name!, response: { result: toolResult } } }] }
        ],
        config: { systemInstruction: SYSTEM_PROMPT }
      });
      
      return followUp.text;
    }

    return response.text;
  } catch (error) {
    console.error("[AI Copilot] Error:", error);
    return "I'm having trouble accessing the stadium systems right now. Please try again in a moment. 🙏";
  }
};
