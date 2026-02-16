import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export interface AIAnalysisRequest {
  shopData: {
    orders: any[];
    products: any[];
    customers: any[];
    revenue: number;
    period: string;
  };
  model: string;
  apiKey: string;
  analysisType: "daily" | "weekly" | "monthly" | "custom";
}

export interface AIAnalysisResponse {
  summary: string;
  insights: string[];
  recommendations: string[];
  forecasts: {
    metric: string;
    prediction: string;
    confidence: number;
  }[];
  alerts: {
    type: "info" | "warning" | "critical";
    message: string;
  }[];
}

const ANALYSIS_PROMPT = `You are an expert e-commerce business analyst AI assistant for a Shopify store. 
Analyze the following store data and provide actionable insights.

Provide your analysis in the following JSON format:
{
  "summary": "A brief 2-3 sentence summary of overall business health",
  "insights": ["insight1", "insight2", ...],
  "recommendations": ["recommendation1", "recommendation2", ...],
  "forecasts": [
    {"metric": "revenue", "prediction": "Expected 15% growth", "confidence": 0.8}
  ],
  "alerts": [
    {"type": "warning", "message": "Low inventory for top-selling items"}
  ]
}

Focus on:
1. Sales trends and patterns
2. Customer behavior insights
3. Inventory optimization opportunities
4. Revenue growth opportunities
5. Potential risks or issues`;

export async function analyzeWithOpenAI(
  request: AIAnalysisRequest
): Promise<AIAnalysisResponse> {
  const openai = new OpenAI({ apiKey: request.apiKey });

  const completion = await openai.chat.completions.create({
    model: request.model.startsWith("gpt") ? request.model : "gpt-4",
    messages: [
      { role: "system", content: ANALYSIS_PROMPT },
      {
        role: "user",
        content: `Analyze this ${request.analysisType} data for my Shopify store:\n\n${JSON.stringify(request.shopData, null, 2)}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 2000,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from OpenAI");
  }

  return JSON.parse(content) as AIAnalysisResponse;
}

export async function analyzeWithClaude(
  request: AIAnalysisRequest
): Promise<AIAnalysisResponse> {
  const anthropic = new Anthropic({ apiKey: request.apiKey });

  const modelMap: Record<string, string> = {
    "claude-3-opus": "claude-3-opus-20240229",
    "claude-3-sonnet": "claude-3-sonnet-20240229",
    "claude-3-haiku": "claude-3-haiku-20240307",
  };

  const message = await anthropic.messages.create({
    model: modelMap[request.model] || "claude-3-sonnet-20240229",
    max_tokens: 2000,
    system: ANALYSIS_PROMPT,
    messages: [
      {
        role: "user",
        content: `Analyze this ${request.analysisType} data for my Shopify store:\n\n${JSON.stringify(request.shopData, null, 2)}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  // Extract JSON from response
  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not parse JSON from Claude response");
  }

  return JSON.parse(jsonMatch[0]) as AIAnalysisResponse;
}

export async function generateAnalysis(
  request: AIAnalysisRequest
): Promise<AIAnalysisResponse> {
  if (request.model.startsWith("gpt")) {
    return analyzeWithOpenAI(request);
  } else if (request.model.startsWith("claude")) {
    return analyzeWithClaude(request);
  } else {
    throw new Error(`Unsupported model: ${request.model}`);
  }
}

export async function generateQuickInsight(
  data: any,
  model: string,
  apiKey: string
): Promise<string> {
  if (model.startsWith("gpt")) {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: "You are a helpful e-commerce analyst. Provide a single, concise insight.",
        },
        {
          role: "user",
          content: `Based on this data, what's the most important insight? ${JSON.stringify(data)}`,
        },
      ],
      max_tokens: 150,
    });
    return completion.choices[0]?.message?.content || "Unable to generate insight";
  } else {
    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 150,
      messages: [
        {
          role: "user",
          content: `Based on this data, what's the most important insight? ${JSON.stringify(data)}`,
        },
      ],
    });
    const content = message.content[0];
    return content.type === "text" ? content.text : "Unable to generate insight";
  }
}
