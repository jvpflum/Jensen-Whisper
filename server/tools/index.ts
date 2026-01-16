import { ToolCall, ToolDefinition, ToolResult } from '../../shared/schema';
import { z } from 'zod';
import axios from 'axios';

// CALCULATOR TOOL
const calculatorTool: ToolDefinition = {
  id: "calculator",
  name: "Calculator",
  description: "Perform mathematical calculations.",
  category: "utility",
  parameters: [
    {
      name: "expression",
      description: "The mathematical expression to evaluate",
      type: "string",
      required: true
    }
  ],
  enabled: true
};

// Sanitize expression to prevent code injection
function sanitizeExpression(expr: string): string {
  // First, replace common math symbols with JavaScript operators
  let sanitized = expr
    .replace(/[xX×]/g, "*")  // Replace x, X, or × with *
    .replace(/÷/g, "/")      // Replace ÷ with /
    .replace(/\^/g, "**");   // Replace ^ with **
  
  // Then remove all characters except numbers, basic operators, and parentheses
  return sanitized.replace(/[^0-9+\-*/().** ]/g, "");
}

async function executeCalculator(params: { expression: string }): Promise<any> {
  try {
    const sanitized = sanitizeExpression(params.expression);
    
    // Safety check - don't evaluate empty expressions
    if (!sanitized) {
      return { 
        error: "Invalid expression - no valid mathematical operators or numbers found", 
        originalExpression: params.expression
      };
    }

    // Use Function constructor to evaluate the expression
    // This is safer than eval() as it creates a new scope
    const result = Function(`"use strict"; return (${sanitized});`)();
    
    // Check if result is a valid number
    if (isNaN(result) || !isFinite(result)) {
      return {
        error: "The calculation resulted in an invalid number (NaN or Infinity)",
        originalExpression: params.expression,
        sanitizedExpression: sanitized
      };
    }
    
    return {
      result: result,
      expression: params.expression,
      sanitizedExpression: sanitized
    };
  } catch (error) {
    console.error("Calculator error:", error);
    return {
      error: "Failed to evaluate expression. Please check for syntax errors.",
      originalExpression: params.expression,
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

// WEATHER TOOL
const weatherTool: ToolDefinition = {
  id: "weather",
  name: "Weather",
  description: "Get current weather information for a location.",
  category: "web",
  parameters: [
    {
      name: "location",
      description: "The city name or location to get weather for",
      type: "string",
      required: true
    },
    {
      name: "units",
      description: "Temperature units (metric, imperial, or standard)",
      type: "string",
      required: false,
      default: "metric",
      enum: ["metric", "imperial", "standard"]
    }
  ],
  enabled: true
};

async function executeWeather(params: { location: string; units?: string }): Promise<any> {
  try {
    console.log("Weather API requested for:", params.location);
    
    // Use Open-Meteo API which doesn't require an API key
    // First, we need to geocode the location to get coordinates
    
    // Geocode the location
    const geocodeResponse = await axios.get(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(params.location)}&count=1`
    );
    
    // Check if location was found
    if (!geocodeResponse.data.results || geocodeResponse.data.results.length === 0) {
      return {
        error: `Location '${params.location}' not found. Please try a different location.`
      };
    }
    
    // Get coordinates
    const { latitude, longitude, name, country } = geocodeResponse.data.results[0];
    
    // Convert units parameter to temperature unit for Open-Meteo
    const temperatureUnit = params.units === 'imperial' ? 'fahrenheit' : 'celsius';
    
    // Fetch weather data using coordinates
    const weatherResponse = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m&temperature_unit=${temperatureUnit}`
    );
    
    // Map weather code to condition
    const weatherCodeMap: Record<number, string> = {
      0: "Clear sky",
      1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
      45: "Fog", 48: "Depositing rime fog",
      51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
      56: "Light freezing drizzle", 57: "Dense freezing drizzle",
      61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
      66: "Light freezing rain", 67: "Heavy freezing rain",
      71: "Slight snow fall", 73: "Moderate snow fall", 75: "Heavy snow fall",
      77: "Snow grains",
      80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
      85: "Slight snow showers", 86: "Heavy snow showers",
      95: "Thunderstorm", 96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail"
    };
    
    const current = weatherResponse.data.current;
    const weatherCondition = weatherCodeMap[current.weather_code] || "Unknown";
    
    // Format the response
    const formattedResponse = {
      location: `${name}${country ? ', ' + country : ''}`,
      units: params.units || "metric",
      temperature: current.temperature_2m,
      condition: weatherCondition,
      humidity: current.relative_humidity_2m,
      wind: {
        speed: current.wind_speed_10m,
        direction: degreesToDirection(current.wind_direction_10m)
      },
      timestamp: new Date().toISOString(),
      source: "Open-Meteo"
    };
    
    return formattedResponse;
  } catch (error) {
    console.error("Weather API error:", error);
    return {
      error: "Failed to fetch weather data. Please try again or check the location name."
    };
  }
}

// Helper function to convert wind direction in degrees to cardinal direction
function degreesToDirection(degrees: number): string {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(((degrees % 360) / 22.5));
  return directions[index % 16];
}

// WEB SEARCH TOOL
const webSearchTool: ToolDefinition = {
  id: "web-search",
  name: "Web Search",
  description: "Search the web for information.",
  category: "web",
  parameters: [
    {
      name: "query",
      description: "The search query",
      type: "string",
      required: true
    },
    {
      name: "numResults",
      description: "Number of results to return (max 10)",
      type: "number",
      required: false,
      default: 3
    }
  ],
  enabled: true
};

async function executeWebSearch(params: { query: string; numResults?: number }): Promise<any> {
  try {
    console.log("Web search requested for:", params.query);
    
    // Limit number of results to a reasonable range
    const numResults = Math.min(Math.max(params.numResults || 3, 1), 10);
    
    // Use SerpCrawler API which doesn't require an API key
    const response = await axios.get(
      `https://api.serpcrawler.com/v1/public/search/google?query=${encodeURIComponent(params.query)}&resultCount=${numResults}`
    );
    
    // Check if we got valid results
    if (!response.data || !response.data.data || !response.data.data.organic) {
      return {
        error: "No search results found. Please try a different query."
      };
    }
    
    // Format the response
    const formattedResults = {
      query: params.query,
      totalResults: response.data.data.totalResults || response.data.data.organic.length,
      searchResults: response.data.data.organic.slice(0, numResults).map((result: any) => ({
        title: result.title,
        snippet: result.snippet,
        url: result.link,
      })),
      timestamp: new Date().toISOString(),
      source: "SerpCrawler"
    };
    
    return formattedResults;
  } catch (error) {
    console.error("Web search API error:", error);
    return {
      error: "Failed to perform web search. Please try again with a different query.",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

// TOOL REGISTRY
class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  private executors: Map<string, (params: any) => Promise<any>> = new Map();

  register(
    toolDef: ToolDefinition, 
    executor: (params: any) => Promise<any>
  ) {
    this.tools.set(toolDef.id, toolDef);
    this.executors.set(toolDef.id, executor);
  }

  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values()).filter(tool => tool.enabled);
  }

  getToolsByCategory(category: string): ToolDefinition[] {
    return this.getAllTools().filter(tool => tool.category === category);
  }

  getTool(id: string): ToolDefinition | undefined {
    return this.tools.get(id);
  }

  hasTool(id: string): boolean {
    return this.tools.has(id);
  }

  async executeTool(toolCall: ToolCall): Promise<ToolResult> {
    const { toolId, parameters } = toolCall;
    
    // Get the tool's executor function
    const executor = this.executors.get(toolId);
    const toolDef = this.tools.get(toolId);
    
    if (!executor || !toolDef) {
      throw new Error(`Tool "${toolId}" not found or not properly registered`);
    }
    
    try {
      // Execute the tool with the provided parameters
      const result = await executor(parameters);
      
      return {
        toolId,
        success: true,
        result
      };
    } catch (error) {
      // Handle errors from tool execution
      return {
        toolId,
        success: false,
        result: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async executeToolCalls(toolCalls: ToolCall[]): Promise<ToolResult[]> {
    return Promise.all(toolCalls.map(toolCall => this.executeTool(toolCall)));
  }
}

export const toolRegistry = new ToolRegistry();

export function initializeToolRegistry() {
  // Register calculator tool
  toolRegistry.register(
    calculatorTool,
    executeCalculator
  );
  
  // Register weather tool
  toolRegistry.register(
    weatherTool,
    executeWeather
  );
  
  // Register web search tool
  toolRegistry.register(
    webSearchTool,
    executeWebSearch
  );
  
  // NEWS HEADLINES TOOL
  const newsHeadlinesTool: ToolDefinition = {
    id: "news-headlines",
    name: "News Headlines",
    description: "Get the latest news headlines on a specific topic.",
    category: "web",
    parameters: [
      {
        name: "topic",
        description: "The topic to get news headlines for",
        type: "string",
        required: true
      },
      {
        name: "numResults",
        description: "Number of news headlines to return (max 10)",
        type: "number",
        required: false,
        default: 5
      }
    ],
    enabled: true
  };

  async function executeNewsHeadlines(params: { topic: string; numResults?: number }): Promise<any> {
    try {
      console.log("News headlines requested for:", params.topic);
      
      // Limit number of results to a reasonable range
      const numResults = Math.min(Math.max(params.numResults || 5, 1), 10);
      
      // Use GNews API which offers a free tier without API key
      const response = await axios.get(
        `https://gnews.io/api/v4/search?q=${encodeURIComponent(params.topic)}&max=${numResults}&lang=en&country=us&in=title&sortby=publishedAt`
      );
      
      // Check if we got valid results
      if (!response.data || !response.data.articles || response.data.articles.length === 0) {
        return {
          error: `No news found for topic '${params.topic}'. Please try a different topic.`
        };
      }
      
      // Format the response
      const formattedResults = {
        topic: params.topic,
        totalResults: response.data.totalArticles || response.data.articles.length,
        articles: response.data.articles.slice(0, numResults).map((article: any) => ({
          title: article.title,
          description: article.description,
          content: article.content,
          url: article.url,
          image: article.image,
          publishedAt: article.publishedAt,
          source: article.source.name
        })),
        timestamp: new Date().toISOString(),
        source: "GNews API"
      };
      
      return formattedResults;
    } catch (error) {
      console.error("News API error:", error);
      return {
        error: "Failed to fetch news headlines. Please try again with a different topic.",
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  // Register news headlines tool
  toolRegistry.register(
    newsHeadlinesTool,
    executeNewsHeadlines
  );
  
  console.log(`Tool registry initialized with ${toolRegistry.getAllTools().length} tools`);
}