// NVIDIA Model definitions for the model selector
export interface ModelDefinition {
  id: string;
  name: string;
  description: string;
  parameterCount: string;
  contextWindow: string;
  releaseDate: string;
  specialties: string[];
  type: "nvidia" | "other";
  performance: {
    reasoning: number;  // 1-10 scale
    math: number;       // 1-10 scale
    coding: number;     // 1-10 scale
    speed: number;      // 1-10 scale (higher is faster)
    creativity: number; // 1-10 scale
  };
}

export const NVIDIA_MODELS: ModelDefinition[] = [
  {
    id: "nvidia/llama-3.1-nemotron-ultra-253b-v1",
    name: "Llama 3.1 Nemotron Ultra 253B",
    description: "NVIDIA's most advanced reasoning model, with 253B parameters and a 128K context window.",
    parameterCount: "253B",
    contextWindow: "128K",
    releaseDate: "2025",
    specialties: ["Reasoning", "Complex Analysis", "Math", "Code"],
    type: "nvidia",
    performance: {
      reasoning: 9.8,
      math: 9.5,
      coding: 9.6,
      speed: 8.5,
      creativity: 9.4
    }
  },
  {
    id: "nvidia/llama-3.3-nemotron-super-49b-v1",
    name: "Llama 3.3 Nemotron Super 49B",
    description: "A powerful model balancing efficiency and performance with a 32K context window.",
    parameterCount: "49B",
    contextWindow: "32K",
    releaseDate: "2024",
    specialties: ["General Purpose", "Efficiency", "Tool Calling"],
    type: "nvidia",
    performance: {
      reasoning: 8.7,
      math: 8.2,
      coding: 8.5,
      speed: 9.2,
      creativity: 8.8
    }
  },
  {
    id: "nvidia/llama-3-nemotron-h100-70b",
    name: "Llama 3 Nemotron H100 70B",
    description: "Optimized for H100 GPUs with strong overall performance and 8K context window.",
    parameterCount: "70B",
    contextWindow: "8K",
    releaseDate: "2024",
    specialties: ["Balanced", "Versatile", "H100 Optimized"],
    type: "nvidia",
    performance: {
      reasoning: 8.3,
      math: 7.9,
      coding: 8.0,
      speed: 8.8,
      creativity: 8.4
    }
  }
];

// Default model ID
export const DEFAULT_MODEL_ID = "nvidia/llama-3.1-nemotron-ultra-253b-v1";

// Get a model by ID
export function getModelById(id: string): ModelDefinition | undefined {
  return NVIDIA_MODELS.find(model => model.id === id);
}

// Get the default model
export function getDefaultModel(): ModelDefinition {
  return getModelById(DEFAULT_MODEL_ID) || NVIDIA_MODELS[0];
}