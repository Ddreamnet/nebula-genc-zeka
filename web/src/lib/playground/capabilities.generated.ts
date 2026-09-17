/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 *
 * Written by `node scripts/sync-catalog.mjs` from OpenRouter's live catalog
 * (/models, /images/models, /videos/models and each image model's /endpoints).
 * Last sync: 2026-09-17 — 71 models.
 *
 * Machine facts only: which parameters a model accepts, their ranges and
 * enums, its price SKUs and its provider passthrough list. Every product
 * decision — Turkish name, icon, category, status, role ceilings — stays in
 * `tools.ts`. Re-run the script rather than editing a value here; a hand-edit
 * is a dial that lies to a student the next time the catalog moves.
 */

export interface EnumParam { type: "enum"; values: string[] }
export interface RangeParam { type: "range"; min: number; max: number }
export interface BooleanParam { type: "boolean" }
export type ImageParamSpec = EnumParam | RangeParam | BooleanParam;

export interface ImageCaps {
  kind: "image";
  /** Keyed by the request-body field name: aspect_ratio, quality, n, seed … */
  params: Record<string, ImageParamSpec>;
  /** Provider-specific extras that ride `provider.options` (steps, guidance…). */
  passthrough: string[];
  pricing: { billable: string; unit: string; costUsd: number }[];
}

export interface VideoCaps {
  kind: "video";
  durations: number[];
  resolutions: string[];
  aspectRatios: string[];
  frameImages: string[];
  generateAudio: boolean;
  seed: boolean;
  upscaleFactor?: unknown;
  creativity?: unknown;
  /** Raw `pricing_skus`, in USD. Key shapes differ per provider — see priceVideo(). */
  priceSkus?: Record<string, number>;
  passthrough: string[];
}

export interface TextCaps {
  kind: "text" | "audio";
  /** OpenRouter's `supported_parameters` list for /chat/completions. */
  supported: string[];
  inputModalities: string[];
  contextLength?: number;
  maxCompletionTokens?: number;
  pricing: { prompt?: number; completion?: number; webSearch?: number };
}

export type ModelCaps = ImageCaps | VideoCaps | TextCaps;

export const MODEL_CAPS: Record<string, ModelCaps> = {
  "deepseek/deepseek-v4.1-flash": {
    "kind": "text",
    "supported": [
      "frequency_penalty",
      "include_reasoning",
      "logit_bias",
      "logprobs",
      "max_tokens",
      "min_p",
      "presence_penalty",
      "reasoning",
      "reasoning_effort",
      "repetition_penalty",
      "response_format",
      "seed",
      "stop",
      "structured_outputs",
      "temperature",
      "tool_choice",
      "tools",
      "top_k",
      "top_logprobs",
      "top_p"
    ],
    "inputModalities": [
      "text",
      "image"
    ],
    "contextLength": 1048576,
    "maxCompletionTokens": 384000,
    "pricing": {
      "prompt": 3e-7,
      "completion": 0.0000012
    }
  },
  "openai/gpt-6-astra": {
    "kind": "text",
    "supported": [
      "include_reasoning",
      "max_completion_tokens",
      "max_tokens",
      "reasoning",
      "reasoning_effort",
      "response_format",
      "seed",
      "structured_outputs",
      "tool_choice",
      "tools"
    ],
    "inputModalities": [
      "file",
      "image",
      "text"
    ],
    "contextLength": 1050000,
    "maxCompletionTokens": 128000,
    "pricing": {
      "prompt": 0.00001,
      "completion": 0.00005,
      "webSearch": 0.01
    }
  },
  "qwen/qwen3.8-max-0902": {
    "kind": "text",
    "supported": [
      "frequency_penalty",
      "include_reasoning",
      "logprobs",
      "max_tokens",
      "presence_penalty",
      "reasoning",
      "reasoning_effort",
      "response_format",
      "seed",
      "stop",
      "structured_outputs",
      "temperature",
      "tool_choice",
      "tools",
      "top_k",
      "top_logprobs",
      "top_p"
    ],
    "inputModalities": [
      "text",
      "image",
      "video"
    ],
    "contextLength": 1000000,
    "maxCompletionTokens": 131072,
    "pricing": {
      "prompt": 0.000002,
      "completion": 0.000006
    }
  },
  "google/gemini-3.8-flash": {
    "kind": "text",
    "supported": [
      "include_reasoning",
      "max_tokens",
      "reasoning",
      "reasoning_effort",
      "response_format",
      "seed",
      "stop",
      "structured_outputs",
      "temperature",
      "tool_choice",
      "tools",
      "top_p"
    ],
    "inputModalities": [
      "text",
      "image",
      "video",
      "file",
      "audio"
    ],
    "contextLength": 1048576,
    "maxCompletionTokens": 65536,
    "pricing": {
      "prompt": 7.5e-7,
      "completion": 0.00000375,
      "webSearch": 0.014
    }
  },
  "anthropic/claude-fable-5.1": {
    "kind": "text",
    "supported": [
      "include_reasoning",
      "max_completion_tokens",
      "max_tokens",
      "reasoning",
      "reasoning_effort",
      "response_format",
      "stop",
      "structured_outputs",
      "tools",
      "verbosity"
    ],
    "inputModalities": [
      "text",
      "image",
      "file"
    ],
    "contextLength": 1000000,
    "maxCompletionTokens": 128000,
    "pricing": {
      "prompt": 0.00001,
      "completion": 0.00005,
      "webSearch": 0.01
    }
  },
  "z-ai/glm-5.3": {
    "kind": "text",
    "supported": [
      "frequency_penalty",
      "include_reasoning",
      "logit_bias",
      "logprobs",
      "max_tokens",
      "min_p",
      "parallel_tool_calls",
      "presence_penalty",
      "reasoning",
      "reasoning_effort",
      "repetition_penalty",
      "response_format",
      "seed",
      "stop",
      "structured_outputs",
      "temperature",
      "tool_choice",
      "tools",
      "top_k",
      "top_logprobs",
      "top_p"
    ],
    "inputModalities": [
      "text"
    ],
    "contextLength": 1310720,
    "maxCompletionTokens": 943717,
    "pricing": {
      "prompt": 0.0000014,
      "completion": 0.0000044
    }
  },
  "x-ai/grok-4.6": {
    "kind": "text",
    "supported": [
      "include_reasoning",
      "logprobs",
      "max_tokens",
      "reasoning",
      "reasoning_effort",
      "response_format",
      "seed",
      "stop",
      "structured_outputs",
      "temperature",
      "tool_choice",
      "tools",
      "top_k",
      "top_logprobs",
      "top_p"
    ],
    "inputModalities": [
      "text",
      "image",
      "file"
    ],
    "contextLength": 500000,
    "maxCompletionTokens": 450000,
    "pricing": {
      "prompt": 0.000002,
      "completion": 0.000006,
      "webSearch": 0.005
    }
  },
  "anthropic/claude-opus-5": {
    "kind": "text",
    "supported": [
      "include_reasoning",
      "max_completion_tokens",
      "max_tokens",
      "reasoning",
      "reasoning_effort",
      "response_format",
      "stop",
      "structured_outputs",
      "temperature",
      "tool_choice",
      "tools",
      "verbosity"
    ],
    "inputModalities": [
      "text",
      "image",
      "file"
    ],
    "contextLength": 1000000,
    "maxCompletionTokens": 128000,
    "pricing": {
      "prompt": 0.000005,
      "completion": 0.000025,
      "webSearch": 0.01
    }
  },
  "moonshotai/kimi-k3": {
    "kind": "text",
    "supported": [
      "frequency_penalty",
      "include_reasoning",
      "logit_bias",
      "logprobs",
      "max_tokens",
      "min_p",
      "presence_penalty",
      "reasoning",
      "reasoning_effort",
      "repetition_penalty",
      "response_format",
      "seed",
      "stop",
      "structured_outputs",
      "temperature",
      "tool_choice",
      "tools",
      "top_k",
      "top_logprobs",
      "top_p"
    ],
    "inputModalities": [
      "text",
      "image",
      "video"
    ],
    "contextLength": 1048576,
    "maxCompletionTokens": 943718,
    "pricing": {
      "prompt": 0.000003,
      "completion": 0.000015
    }
  },
  "tencent/hy3": {
    "kind": "text",
    "supported": [
      "frequency_penalty",
      "include_reasoning",
      "logit_bias",
      "max_completion_tokens",
      "max_tokens",
      "min_p",
      "presence_penalty",
      "reasoning",
      "reasoning_effort",
      "repetition_penalty",
      "response_format",
      "seed",
      "stop",
      "structured_outputs",
      "temperature",
      "tool_choice",
      "tools",
      "top_k",
      "top_p"
    ],
    "inputModalities": [
      "text"
    ],
    "contextLength": 262144,
    "maxCompletionTokens": 128000,
    "pricing": {
      "prompt": 1.32e-7,
      "completion": 5.28e-7
    }
  },
  "anthropic/claude-sonnet-5": {
    "kind": "text",
    "supported": [
      "include_reasoning",
      "max_completion_tokens",
      "max_tokens",
      "reasoning",
      "reasoning_effort",
      "response_format",
      "stop",
      "structured_outputs",
      "tool_choice",
      "tools",
      "verbosity"
    ],
    "inputModalities": [
      "text",
      "image",
      "file"
    ],
    "contextLength": 1000000,
    "maxCompletionTokens": 128000,
    "pricing": {
      "prompt": 0.000002,
      "completion": 0.00001,
      "webSearch": 0.01
    }
  },
  "google/gemini-3.1-flash-lite-image": {
    "kind": "image",
    "params": {
      "resolution": {
        "type": "enum",
        "values": [
          "1K"
        ]
      },
      "aspect_ratio": {
        "type": "enum",
        "values": [
          "1:1",
          "1:4",
          "1:8",
          "2:3",
          "3:2",
          "3:4",
          "4:1",
          "4:3",
          "4:5",
          "5:4",
          "8:1",
          "9:16",
          "16:9",
          "21:9"
        ]
      },
      "n": {
        "type": "range",
        "min": 1,
        "max": 1
      },
      "input_references": {
        "type": "range",
        "min": 0,
        "max": 14
      }
    },
    "passthrough": [
      "cachedContent"
    ],
    "pricing": [
      {
        "billable": "output_image",
        "unit": "token",
        "costUsd": 0.00003
      }
    ]
  },
  "google/gemini-3.1-flash-image": {
    "kind": "image",
    "params": {
      "resolution": {
        "type": "enum",
        "values": [
          "512",
          "1K",
          "2K",
          "4K"
        ]
      },
      "aspect_ratio": {
        "type": "enum",
        "values": [
          "1:1",
          "1:4",
          "1:8",
          "2:3",
          "3:2",
          "3:4",
          "4:1",
          "4:3",
          "4:5",
          "5:4",
          "8:1",
          "9:16",
          "16:9",
          "21:9"
        ]
      },
      "n": {
        "type": "range",
        "min": 1,
        "max": 1
      },
      "input_references": {
        "type": "range",
        "min": 0,
        "max": 14
      }
    },
    "passthrough": [
      "cachedContent"
    ],
    "pricing": [
      {
        "billable": "output_image",
        "unit": "token",
        "costUsd": 0.00006
      }
    ]
  },
  "google/gemini-3-pro-image": {
    "kind": "image",
    "params": {
      "resolution": {
        "type": "enum",
        "values": [
          "1K",
          "2K",
          "4K"
        ]
      },
      "aspect_ratio": {
        "type": "enum",
        "values": [
          "1:1",
          "2:3",
          "3:2",
          "3:4",
          "4:3",
          "4:5",
          "5:4",
          "9:16",
          "16:9",
          "21:9"
        ]
      },
      "n": {
        "type": "range",
        "min": 1,
        "max": 1
      },
      "input_references": {
        "type": "range",
        "min": 0,
        "max": 14
      }
    },
    "passthrough": [
      "cachedContent"
    ],
    "pricing": [
      {
        "billable": "input_image",
        "unit": "token",
        "costUsd": 0.000002
      },
      {
        "billable": "output_image",
        "unit": "token",
        "costUsd": 0.00012
      }
    ]
  },
  "moonshotai/kimi-k2.7-code": {
    "kind": "text",
    "supported": [
      "frequency_penalty",
      "include_reasoning",
      "logit_bias",
      "logprobs",
      "max_tokens",
      "min_p",
      "parallel_tool_calls",
      "presence_penalty",
      "reasoning",
      "repetition_penalty",
      "response_format",
      "seed",
      "stop",
      "structured_outputs",
      "temperature",
      "tool_choice",
      "tools",
      "top_k",
      "top_logprobs",
      "top_p"
    ],
    "inputModalities": [
      "text",
      "image"
    ],
    "contextLength": 262144,
    "maxCompletionTokens": 235929,
    "pricing": {
      "prompt": 7.062e-7,
      "completion": 0.00000321
    }
  },
  "minimax/minimax-m3": {
    "kind": "text",
    "supported": [
      "frequency_penalty",
      "include_reasoning",
      "logit_bias",
      "logprobs",
      "max_tokens",
      "min_p",
      "presence_penalty",
      "reasoning",
      "repetition_penalty",
      "response_format",
      "seed",
      "stop",
      "structured_outputs",
      "temperature",
      "tool_choice",
      "tools",
      "top_k",
      "top_logprobs",
      "top_p"
    ],
    "inputModalities": [
      "text",
      "image",
      "video"
    ],
    "contextLength": 1048576,
    "maxCompletionTokens": 512000,
    "pricing": {
      "prompt": 3e-7,
      "completion": 0.0000012
    }
  },
  "google/gemma-4-31b-it:free": {
    "kind": "text",
    "supported": [
      "include_reasoning",
      "max_tokens",
      "reasoning",
      "response_format",
      "seed",
      "temperature",
      "tool_choice",
      "tools",
      "top_p"
    ],
    "inputModalities": [
      "image",
      "text",
      "video"
    ],
    "contextLength": 262144,
    "maxCompletionTokens": 32768,
    "pricing": {
      "prompt": 0,
      "completion": 0
    }
  },
  "google/lyria-3-pro-preview": {
    "kind": "audio",
    "supported": [
      "max_tokens",
      "response_format",
      "seed",
      "temperature",
      "top_p"
    ],
    "inputModalities": [
      "text",
      "image"
    ],
    "contextLength": 1048576,
    "maxCompletionTokens": 65536,
    "pricing": {
      "prompt": 0,
      "completion": 0
    }
  },
  "google/lyria-3-clip-preview": {
    "kind": "audio",
    "supported": [
      "max_tokens",
      "response_format",
      "seed",
      "temperature",
      "top_p"
    ],
    "inputModalities": [
      "text",
      "image"
    ],
    "contextLength": 1048576,
    "maxCompletionTokens": 65536,
    "pricing": {
      "prompt": 0,
      "completion": 0
    }
  },
  "openai/gpt-audio": {
    "kind": "audio",
    "supported": [
      "frequency_penalty",
      "logit_bias",
      "logprobs",
      "max_tokens",
      "presence_penalty",
      "response_format",
      "seed",
      "stop",
      "structured_outputs",
      "temperature",
      "tool_choice",
      "tools",
      "top_logprobs",
      "top_p"
    ],
    "inputModalities": [
      "text",
      "audio"
    ],
    "contextLength": 128000,
    "maxCompletionTokens": 16384,
    "pricing": {
      "prompt": 0.0000025,
      "completion": 0.00001
    }
  },
  "openai/gpt-audio-mini": {
    "kind": "audio",
    "supported": [
      "frequency_penalty",
      "logit_bias",
      "logprobs",
      "max_tokens",
      "presence_penalty",
      "response_format",
      "seed",
      "stop",
      "structured_outputs",
      "temperature",
      "tool_choice",
      "tools",
      "top_logprobs",
      "top_p"
    ],
    "inputModalities": [
      "text",
      "audio"
    ],
    "contextLength": 128000,
    "maxCompletionTokens": 16384,
    "pricing": {
      "prompt": 6e-7,
      "completion": 0.0000024
    }
  },
  "mistralai/mistral-large-2512": {
    "kind": "text",
    "supported": [
      "frequency_penalty",
      "max_tokens",
      "presence_penalty",
      "response_format",
      "seed",
      "stop",
      "structured_outputs",
      "temperature",
      "tool_choice",
      "tools",
      "top_p"
    ],
    "inputModalities": [
      "text",
      "image",
      "file"
    ],
    "contextLength": 262144,
    "maxCompletionTokens": 209715,
    "pricing": {
      "prompt": 5e-7,
      "completion": 0.0000015
    }
  },
  "deepseek/deepseek-v3.2": {
    "kind": "text",
    "supported": [
      "frequency_penalty",
      "include_reasoning",
      "logit_bias",
      "logprobs",
      "max_tokens",
      "min_p",
      "presence_penalty",
      "reasoning",
      "repetition_penalty",
      "response_format",
      "seed",
      "stop",
      "structured_outputs",
      "temperature",
      "tool_choice",
      "tools",
      "top_k",
      "top_logprobs",
      "top_p"
    ],
    "inputModalities": [
      "text"
    ],
    "contextLength": 163840,
    "maxCompletionTokens": 65536,
    "pricing": {
      "prompt": 2.69e-7,
      "completion": 4e-7
    }
  },
  "openai/gpt-5.1-codex": {
    "kind": "text",
    "supported": [
      "include_reasoning",
      "max_completion_tokens",
      "reasoning",
      "reasoning_effort",
      "response_format",
      "seed",
      "structured_outputs",
      "tool_choice",
      "tools"
    ],
    "inputModalities": [
      "text",
      "image"
    ],
    "contextLength": 400000,
    "maxCompletionTokens": 128000,
    "pricing": {
      "prompt": 0.00000125,
      "completion": 0.00001,
      "webSearch": 0.01
    }
  },
  "anthropic/claude-haiku-4.5": {
    "kind": "text",
    "supported": [
      "include_reasoning",
      "max_completion_tokens",
      "max_tokens",
      "reasoning",
      "response_format",
      "stop",
      "structured_outputs",
      "temperature",
      "tool_choice",
      "tools",
      "top_k",
      "top_p"
    ],
    "inputModalities": [
      "text",
      "image",
      "file"
    ],
    "contextLength": 200000,
    "maxCompletionTokens": 64000,
    "pricing": {
      "prompt": 0.000001,
      "completion": 0.000005,
      "webSearch": 0.01
    }
  },
  "google/gemini-2.5-flash-image": {
    "kind": "image",
    "params": {
      "aspect_ratio": {
        "type": "enum",
        "values": [
          "1:1",
          "2:3",
          "3:2",
          "3:4",
          "4:3",
          "4:5",
          "5:4",
          "9:16",
          "16:9",
          "21:9"
        ]
      },
      "n": {
        "type": "range",
        "min": 1,
        "max": 1
      },
      "input_references": {
        "type": "range",
        "min": 0,
        "max": 3
      }
    },
    "passthrough": [
      "cachedContent"
    ],
    "pricing": [
      {
        "billable": "input_image",
        "unit": "token",
        "costUsd": 5.4e-7
      },
      {
        "billable": "output_image",
        "unit": "token",
        "costUsd": 0.000054
      }
    ]
  },
  "z-ai/glm-4.6": {
    "kind": "text",
    "supported": [
      "frequency_penalty",
      "include_reasoning",
      "logit_bias",
      "max_tokens",
      "min_p",
      "presence_penalty",
      "reasoning",
      "repetition_penalty",
      "response_format",
      "seed",
      "stop",
      "structured_outputs",
      "temperature",
      "tool_choice",
      "tools",
      "top_k",
      "top_p"
    ],
    "inputModalities": [
      "text"
    ],
    "contextLength": 204800,
    "maxCompletionTokens": 16384,
    "pricing": {
      "prompt": 4.3e-7,
      "completion": 0.00000175
    }
  },
  "qwen/qwen3-coder-plus": {
    "kind": "text",
    "supported": [
      "frequency_penalty",
      "logprobs",
      "max_tokens",
      "presence_penalty",
      "response_format",
      "seed",
      "stop",
      "structured_outputs",
      "temperature",
      "tool_choice",
      "tools",
      "top_k",
      "top_logprobs",
      "top_p"
    ],
    "inputModalities": [
      "text"
    ],
    "contextLength": 1000000,
    "maxCompletionTokens": 65536,
    "pricing": {
      "prompt": 6.5e-7,
      "completion": 0.00000325
    }
  },
  "openai/gpt-5-mini": {
    "kind": "text",
    "supported": [
      "include_reasoning",
      "max_completion_tokens",
      "max_tokens",
      "reasoning",
      "reasoning_effort",
      "response_format",
      "seed",
      "structured_outputs",
      "tool_choice",
      "tools"
    ],
    "inputModalities": [
      "text",
      "image",
      "file"
    ],
    "contextLength": 400000,
    "maxCompletionTokens": 128000,
    "pricing": {
      "prompt": 2.5e-7,
      "completion": 0.000002,
      "webSearch": 0.01
    }
  },
  "baidu/ernie-4.5-vl-424b-a47b": {
    "kind": "text",
    "supported": [
      "frequency_penalty",
      "include_reasoning",
      "max_tokens",
      "presence_penalty",
      "reasoning",
      "repetition_penalty",
      "seed",
      "stop",
      "temperature",
      "top_k",
      "top_p"
    ],
    "inputModalities": [
      "image",
      "text"
    ],
    "contextLength": 123000,
    "maxCompletionTokens": 16000,
    "pricing": {
      "prompt": 4.2e-7,
      "completion": 0.00000125
    }
  },
  "cohere/command-a": {
    "kind": "text",
    "supported": [
      "frequency_penalty",
      "max_tokens",
      "presence_penalty",
      "response_format",
      "seed",
      "stop",
      "structured_outputs",
      "temperature",
      "top_k",
      "top_p"
    ],
    "inputModalities": [
      "text"
    ],
    "contextLength": 256000,
    "maxCompletionTokens": 8192,
    "pricing": {
      "prompt": 0.0000025,
      "completion": 0.00001
    }
  },
  "perplexity/sonar": {
    "kind": "text",
    "supported": [
      "frequency_penalty",
      "max_tokens",
      "presence_penalty",
      "temperature",
      "top_k",
      "top_p",
      "web_search_options"
    ],
    "inputModalities": [
      "text",
      "image"
    ],
    "contextLength": 127072,
    "maxCompletionTokens": 114364,
    "pricing": {
      "prompt": 0.000001,
      "completion": 0.000001,
      "webSearch": 0.005
    }
  },
  "meta-llama/llama-3.3-70b-instruct": {
    "kind": "text",
    "supported": [
      "frequency_penalty",
      "logit_bias",
      "logprobs",
      "max_tokens",
      "min_p",
      "presence_penalty",
      "repetition_penalty",
      "response_format",
      "seed",
      "stop",
      "structured_outputs",
      "temperature",
      "tool_choice",
      "tools",
      "top_k",
      "top_logprobs",
      "top_p"
    ],
    "inputModalities": [
      "text"
    ],
    "contextLength": 131072,
    "maxCompletionTokens": 16384,
    "pricing": {
      "prompt": 1e-7,
      "completion": 3.2e-7
    }
  },
  "amazon/nova-pro-v1": {
    "kind": "text",
    "supported": [
      "max_tokens",
      "stop",
      "temperature",
      "tools",
      "top_k",
      "top_p"
    ],
    "inputModalities": [
      "text",
      "image"
    ],
    "contextLength": 300000,
    "maxCompletionTokens": 5120,
    "pricing": {
      "prompt": 8e-7,
      "completion": 0.0000032
    }
  },
  "openai/gpt-image-2.5-sunburst": {
    "kind": "image",
    "params": {
      "aspect_ratio": {
        "type": "enum",
        "values": [
          "1:1",
          "3:2",
          "2:3",
          "4:3",
          "3:4",
          "16:9",
          "9:16",
          "21:9",
          "auto"
        ]
      },
      "quality": {
        "type": "enum",
        "values": [
          "auto",
          "low",
          "medium",
          "high",
          "xhigh",
          "max"
        ]
      },
      "background": {
        "type": "enum",
        "values": [
          "auto",
          "transparent",
          "opaque"
        ]
      },
      "n": {
        "type": "range",
        "min": 1,
        "max": 10
      },
      "input_references": {
        "type": "range",
        "min": 0,
        "max": 16
      },
      "output_compression": {
        "type": "range",
        "min": 0,
        "max": 100
      }
    },
    "passthrough": [
      "moderation"
    ],
    "pricing": [
      {
        "billable": "input_image",
        "unit": "token",
        "costUsd": 0.000008
      },
      {
        "billable": "input_text",
        "unit": "token",
        "costUsd": 0.000005
      },
      {
        "billable": "output_image",
        "unit": "token",
        "costUsd": 0.00003
      }
    ]
  },
  "microsoft/mai-image-2.6": {
    "kind": "image",
    "params": {
      "aspect_ratio": {
        "type": "enum",
        "values": [
          "1:1",
          "4:3",
          "3:4",
          "16:9",
          "9:16",
          "3:2",
          "2:3",
          "auto"
        ]
      },
      "n": {
        "type": "range",
        "min": 1,
        "max": 1
      },
      "input_references": {
        "type": "range",
        "min": 0,
        "max": 5
      }
    },
    "passthrough": [
      "web_grounding"
    ],
    "pricing": [
      {
        "billable": "input_text",
        "unit": "token",
        "costUsd": 0.000005
      },
      {
        "billable": "input_image",
        "unit": "token",
        "costUsd": 0.000008
      },
      {
        "billable": "output_image",
        "unit": "token",
        "costUsd": 0.000038
      }
    ]
  },
  "meta/muse-image": {
    "kind": "image",
    "params": {},
    "passthrough": [],
    "pricing": []
  },
  "bytedance-seed/seedream-5-0-pro": {
    "kind": "image",
    "params": {
      "resolution": {
        "type": "enum",
        "values": [
          "1K",
          "2K"
        ]
      },
      "aspect_ratio": {
        "type": "enum",
        "values": [
          "1:1",
          "1:2",
          "2:1",
          "2:3",
          "3:2",
          "3:4",
          "4:3",
          "4:5",
          "5:4",
          "9:16",
          "16:9",
          "9:19.5",
          "19.5:9",
          "9:20",
          "20:9",
          "9:21",
          "21:9",
          "auto"
        ]
      },
      "n": {
        "type": "range",
        "min": 1,
        "max": 1
      },
      "input_references": {
        "type": "range",
        "min": 0,
        "max": 14
      },
      "seed": {
        "type": "boolean"
      }
    },
    "passthrough": [],
    "pricing": [
      {
        "billable": "output_image",
        "unit": "image",
        "costUsd": 0.045
      },
      {
        "billable": "output_image",
        "unit": "image",
        "costUsd": 0.09
      },
      {
        "billable": "input_image",
        "unit": "image",
        "costUsd": 0.003
      }
    ]
  },
  "x-ai/grok-imagine-image-2.0": {
    "kind": "image",
    "params": {
      "resolution": {
        "type": "enum",
        "values": [
          "1K",
          "2K"
        ]
      },
      "aspect_ratio": {
        "type": "enum",
        "values": [
          "1:1",
          "3:4",
          "4:3",
          "9:16",
          "16:9",
          "2:3",
          "3:2",
          "9:19.5",
          "19.5:9",
          "9:20",
          "20:9",
          "1:2",
          "2:1",
          "auto"
        ]
      },
      "quality": {
        "type": "enum",
        "values": [
          "low",
          "medium"
        ]
      },
      "n": {
        "type": "range",
        "min": 1,
        "max": 1
      },
      "input_references": {
        "type": "range",
        "min": 0,
        "max": 3
      }
    },
    "passthrough": [],
    "pricing": [
      {
        "billable": "input_image",
        "unit": "image",
        "costUsd": 0.01
      },
      {
        "billable": "output_image",
        "unit": "image",
        "costUsd": 0.04
      },
      {
        "billable": "output_image",
        "unit": "image",
        "costUsd": 0.06
      },
      {
        "billable": "output_image",
        "unit": "image",
        "costUsd": 0.06
      },
      {
        "billable": "output_image",
        "unit": "image",
        "costUsd": 0.08
      }
    ]
  },
  "qwen/qwen-image-3-pro": {
    "kind": "image",
    "params": {
      "resolution": {
        "type": "enum",
        "values": [
          "1K",
          "2K"
        ]
      },
      "aspect_ratio": {
        "type": "enum",
        "values": [
          "1:1",
          "1:2",
          "1:4",
          "2:1",
          "2:3",
          "3:2",
          "3:4",
          "4:1",
          "4:3",
          "4:5",
          "5:4",
          "9:16",
          "16:9"
        ]
      },
      "n": {
        "type": "range",
        "min": 1,
        "max": 6
      },
      "input_references": {
        "type": "range",
        "min": 0,
        "max": 4
      },
      "seed": {
        "type": "boolean"
      }
    },
    "passthrough": [],
    "pricing": [
      {
        "billable": "input_image",
        "unit": "image",
        "costUsd": 0.003
      },
      {
        "billable": "output_image",
        "unit": "image",
        "costUsd": 0.04
      },
      {
        "billable": "output_image",
        "unit": "image",
        "costUsd": 0.075
      }
    ]
  },
  "qwen/qwen-image-3": {
    "kind": "image",
    "params": {
      "resolution": {
        "type": "enum",
        "values": [
          "1K",
          "2K"
        ]
      },
      "aspect_ratio": {
        "type": "enum",
        "values": [
          "1:1",
          "1:2",
          "1:4",
          "2:1",
          "2:3",
          "3:2",
          "3:4",
          "4:1",
          "4:3",
          "4:5",
          "5:4",
          "9:16",
          "16:9"
        ]
      },
      "n": {
        "type": "range",
        "min": 1,
        "max": 6
      },
      "input_references": {
        "type": "range",
        "min": 0,
        "max": 4
      },
      "seed": {
        "type": "boolean"
      }
    },
    "passthrough": [],
    "pricing": [
      {
        "billable": "input_image",
        "unit": "image",
        "costUsd": 0.003
      },
      {
        "billable": "output_image",
        "unit": "image",
        "costUsd": 0.03
      },
      {
        "billable": "output_image",
        "unit": "image",
        "costUsd": 0.03
      }
    ]
  },
  "krea/krea-2-large": {
    "kind": "image",
    "params": {
      "resolution": {
        "type": "enum",
        "values": [
          "1K"
        ]
      },
      "aspect_ratio": {
        "type": "enum",
        "values": [
          "1:1",
          "4:3",
          "3:2",
          "16:9",
          "4:5",
          "2:3",
          "9:16"
        ]
      },
      "input_references": {
        "type": "range",
        "min": 0,
        "max": 1
      },
      "seed": {
        "type": "boolean"
      }
    },
    "passthrough": [
      "image_style_references",
      "moodboards",
      "styles",
      "creativity",
      "intensity",
      "complexity",
      "movement",
      "strength"
    ],
    "pricing": []
  },
  "openai/gpt-image-2": {
    "kind": "image",
    "params": {
      "aspect_ratio": {
        "type": "enum",
        "values": [
          "1:1",
          "3:2",
          "2:3",
          "4:3",
          "3:4",
          "16:9",
          "9:16",
          "21:9",
          "auto"
        ]
      },
      "quality": {
        "type": "enum",
        "values": [
          "auto",
          "low",
          "medium",
          "high"
        ]
      },
      "background": {
        "type": "enum",
        "values": [
          "auto",
          "opaque"
        ]
      },
      "n": {
        "type": "range",
        "min": 1,
        "max": 10
      },
      "input_references": {
        "type": "range",
        "min": 0,
        "max": 16
      },
      "output_compression": {
        "type": "range",
        "min": 0,
        "max": 100
      }
    },
    "passthrough": [
      "moderation"
    ],
    "pricing": [
      {
        "billable": "input_image",
        "unit": "token",
        "costUsd": 0.000008
      },
      {
        "billable": "input_text",
        "unit": "token",
        "costUsd": 0.000005
      },
      {
        "billable": "output_image",
        "unit": "token",
        "costUsd": 0.00003
      }
    ]
  },
  "openai/gpt-image-1-mini": {
    "kind": "image",
    "params": {
      "aspect_ratio": {
        "type": "enum",
        "values": [
          "1:1",
          "3:2",
          "2:3",
          "auto"
        ]
      },
      "quality": {
        "type": "enum",
        "values": [
          "auto",
          "low",
          "medium",
          "high"
        ]
      },
      "background": {
        "type": "enum",
        "values": [
          "auto",
          "transparent",
          "opaque"
        ]
      },
      "n": {
        "type": "range",
        "min": 1,
        "max": 10
      },
      "input_references": {
        "type": "range",
        "min": 0,
        "max": 16
      },
      "output_compression": {
        "type": "range",
        "min": 0,
        "max": 100
      }
    },
    "passthrough": [
      "moderation"
    ],
    "pricing": [
      {
        "billable": "input_image",
        "unit": "token",
        "costUsd": 0.0000025
      },
      {
        "billable": "input_text",
        "unit": "token",
        "costUsd": 0.000002
      },
      {
        "billable": "output_image",
        "unit": "token",
        "costUsd": 0.000008
      }
    ]
  },
  "openai/gpt-image-1": {
    "kind": "image",
    "params": {
      "aspect_ratio": {
        "type": "enum",
        "values": [
          "1:1",
          "3:2",
          "2:3",
          "auto"
        ]
      },
      "quality": {
        "type": "enum",
        "values": [
          "auto",
          "low",
          "medium",
          "high"
        ]
      },
      "background": {
        "type": "enum",
        "values": [
          "auto",
          "transparent",
          "opaque"
        ]
      },
      "n": {
        "type": "range",
        "min": 1,
        "max": 10
      },
      "input_references": {
        "type": "range",
        "min": 0,
        "max": 16
      },
      "output_compression": {
        "type": "range",
        "min": 0,
        "max": 100
      }
    },
    "passthrough": [
      "moderation"
    ],
    "pricing": [
      {
        "billable": "input_image",
        "unit": "token",
        "costUsd": 0.00001
      },
      {
        "billable": "input_text",
        "unit": "token",
        "costUsd": 0.000005
      },
      {
        "billable": "output_image",
        "unit": "token",
        "costUsd": 0.00004
      }
    ]
  },
  "sourceful/riverflow-v2.5-pro": {
    "kind": "image",
    "params": {
      "resolution": {
        "type": "enum",
        "values": [
          "1K",
          "2K",
          "4K"
        ]
      },
      "aspect_ratio": {
        "type": "enum",
        "values": [
          "1:1",
          "4:3",
          "3:4",
          "3:2",
          "2:3",
          "16:9",
          "9:16",
          "21:9",
          "auto"
        ]
      },
      "output_format": {
        "type": "enum",
        "values": [
          "png",
          "jpeg",
          "webp"
        ]
      },
      "background": {
        "type": "enum",
        "values": [
          "auto",
          "transparent",
          "opaque"
        ]
      },
      "n": {
        "type": "range",
        "min": 1,
        "max": 1
      },
      "input_references": {
        "type": "range",
        "min": 0,
        "max": 10
      }
    },
    "passthrough": [
      "font_inputs"
    ],
    "pricing": [
      {
        "billable": "output_image",
        "unit": "image",
        "costUsd": 0.13
      },
      {
        "billable": "output_image",
        "unit": "image",
        "costUsd": 0.15
      },
      {
        "billable": "output_image",
        "unit": "image",
        "costUsd": 0.17
      }
    ]
  },
  "recraft/recraft-v4": {
    "kind": "image",
    "params": {
      "aspect_ratio": {
        "type": "enum",
        "values": [
          "1:1",
          "4:3",
          "3:4",
          "16:9",
          "9:16",
          "auto"
        ]
      },
      "n": {
        "type": "range",
        "min": 1,
        "max": 6
      },
      "input_references": {
        "type": "range",
        "min": 0,
        "max": 1
      }
    },
    "passthrough": [
      "style",
      "controls",
      "text_layout"
    ],
    "pricing": [
      {
        "billable": "output_image",
        "unit": "image",
        "costUsd": 0.04
      }
    ]
  },
  "bytedance-seed/seedream-4.5": {
    "kind": "image",
    "params": {
      "resolution": {
        "type": "enum",
        "values": [
          "1K",
          "2K",
          "4K"
        ]
      },
      "aspect_ratio": {
        "type": "enum",
        "values": [
          "1:1",
          "1:2",
          "2:1",
          "2:3",
          "3:2",
          "3:4",
          "4:3",
          "4:5",
          "5:4",
          "9:16",
          "16:9",
          "9:19.5",
          "19.5:9",
          "9:20",
          "20:9",
          "9:21",
          "21:9",
          "auto"
        ]
      },
      "n": {
        "type": "range",
        "min": 1,
        "max": 10
      },
      "input_references": {
        "type": "range",
        "min": 0,
        "max": 14
      },
      "seed": {
        "type": "boolean"
      }
    },
    "passthrough": [],
    "pricing": [
      {
        "billable": "output_image",
        "unit": "image",
        "costUsd": 0.04
      },
      {
        "billable": "input_image",
        "unit": "image",
        "costUsd": 0
      }
    ]
  },
  "black-forest-labs/flux.2-max": {
    "kind": "image",
    "params": {
      "aspect_ratio": {
        "type": "enum",
        "values": [
          "1:1",
          "4:3",
          "3:4",
          "3:2",
          "2:3",
          "16:9",
          "9:16",
          "21:9",
          "auto"
        ]
      },
      "output_format": {
        "type": "enum",
        "values": [
          "png",
          "jpeg"
        ]
      },
      "n": {
        "type": "range",
        "min": 1,
        "max": 1
      },
      "input_references": {
        "type": "range",
        "min": 0,
        "max": 8
      },
      "seed": {
        "type": "boolean"
      }
    },
    "passthrough": [
      "steps",
      "guidance",
      "safety_tolerance"
    ],
    "pricing": [
      {
        "billable": "output_image",
        "unit": "megapixel",
        "costUsd": 0.07
      }
    ]
  },
  "black-forest-labs/flux.2-flex": {
    "kind": "image",
    "params": {
      "aspect_ratio": {
        "type": "enum",
        "values": [
          "1:1",
          "4:3",
          "3:4",
          "3:2",
          "2:3",
          "16:9",
          "9:16",
          "21:9",
          "auto"
        ]
      },
      "output_format": {
        "type": "enum",
        "values": [
          "png",
          "jpeg"
        ]
      },
      "n": {
        "type": "range",
        "min": 1,
        "max": 1
      },
      "input_references": {
        "type": "range",
        "min": 0,
        "max": 8
      },
      "seed": {
        "type": "boolean"
      }
    },
    "passthrough": [
      "steps",
      "guidance",
      "safety_tolerance"
    ],
    "pricing": [
      {
        "billable": "input_image",
        "unit": "megapixel",
        "costUsd": 0.06
      },
      {
        "billable": "output_image",
        "unit": "megapixel",
        "costUsd": 0.06
      }
    ]
  },
  "black-forest-labs/flux.2-pro": {
    "kind": "image",
    "params": {
      "aspect_ratio": {
        "type": "enum",
        "values": [
          "1:1",
          "4:3",
          "3:4",
          "3:2",
          "2:3",
          "16:9",
          "9:16",
          "21:9",
          "auto"
        ]
      },
      "output_format": {
        "type": "enum",
        "values": [
          "png",
          "jpeg"
        ]
      },
      "n": {
        "type": "range",
        "min": 1,
        "max": 1
      },
      "input_references": {
        "type": "range",
        "min": 0,
        "max": 8
      },
      "seed": {
        "type": "boolean"
      }
    },
    "passthrough": [
      "steps",
      "guidance",
      "safety_tolerance"
    ],
    "pricing": [
      {
        "billable": "output_image",
        "unit": "megapixel",
        "costUsd": 0.03
      }
    ]
  },
  "alibaba/wan-3.0-prime": {
    "kind": "video",
    "durations": [
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28,
      29,
      30
    ],
    "resolutions": [
      "480p",
      "720p",
      "1080p"
    ],
    "aspectRatios": [
      "16:9",
      "4:3",
      "1:1",
      "3:4",
      "9:16"
    ],
    "frameImages": [
      "first_frame"
    ],
    "generateAudio": true,
    "seed": true,
    "priceSkus": {
      "duration_seconds_480p": 0.068,
      "duration_seconds_720p": 0.14,
      "duration_seconds_1080p": 0.28
    },
    "passthrough": []
  },
  "alibaba/wan-3.0": {
    "kind": "video",
    "durations": [
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28,
      29,
      30
    ],
    "resolutions": [
      "480p",
      "720p",
      "1080p"
    ],
    "aspectRatios": [
      "16:9",
      "4:3",
      "1:1",
      "3:4",
      "9:16"
    ],
    "frameImages": [
      "first_frame"
    ],
    "generateAudio": true,
    "seed": true,
    "priceSkus": {
      "duration_seconds_480p": 0.05,
      "duration_seconds_720p": 0.1,
      "duration_seconds_1080p": 0.2
    },
    "passthrough": []
  },
  "bytedance/seedance-2.0-mini": {
    "kind": "video",
    "durations": [
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15
    ],
    "resolutions": [
      "480p",
      "720p"
    ],
    "aspectRatios": [
      "1:1",
      "3:4",
      "9:16",
      "4:3",
      "16:9",
      "21:9",
      "9:21"
    ],
    "frameImages": [
      "first_frame",
      "last_frame"
    ],
    "generateAudio": true,
    "seed": true,
    "priceSkus": {
      "video_tokens": 0.0000035,
      "video_tokens_without_audio": 0.0000035,
      "video_tokens_with_video_input": 0.0000021
    },
    "passthrough": [
      "watermark",
      "req_key",
      "return_last_frame"
    ]
  },
  "bytedance/seedance-2.5": {
    "kind": "video",
    "durations": [
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28,
      29,
      30
    ],
    "resolutions": [
      "480p",
      "720p"
    ],
    "aspectRatios": [
      "16:9",
      "4:3",
      "1:1",
      "3:4",
      "9:16",
      "21:9"
    ],
    "frameImages": [
      "first_frame",
      "last_frame"
    ],
    "generateAudio": true,
    "seed": true,
    "priceSkus": {
      "video_tokens": 0.0000107,
      "video_tokens_without_audio": 0.0000107,
      "video_tokens_with_video_input": 0.0000064
    },
    "passthrough": [
      "watermark",
      "req_key",
      "output_format"
    ]
  },
  "black-forest-labs/flux-3-video": {
    "kind": "video",
    "durations": [
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20
    ],
    "resolutions": [
      "720p",
      "1080p"
    ],
    "aspectRatios": [
      "21:9",
      "16:9",
      "4:3",
      "1:1",
      "3:4",
      "9:16"
    ],
    "frameImages": [
      "first_frame",
      "last_frame"
    ],
    "generateAudio": true,
    "seed": false,
    "priceSkus": {
      "cents_per_second_output": 17,
      "cents_per_second_output_720p": 17,
      "cents_per_second_output_1080p": 29,
      "cents_per_second_video_continuation_720p": 41,
      "cents_per_second_video_continuation_1080p": 53
    },
    "passthrough": [
      "safety_tolerance",
      "version"
    ]
  },
  "minimax/hailuo-3": {
    "kind": "video",
    "durations": [
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15
    ],
    "resolutions": [
      "2K"
    ],
    "aspectRatios": [
      "21:9",
      "16:9",
      "4:3",
      "1:1",
      "3:4",
      "9:16"
    ],
    "frameImages": [
      "first_frame",
      "last_frame"
    ],
    "generateAudio": true,
    "seed": false,
    "priceSkus": {
      "duration_seconds": 0.13,
      "reference_images": 0.04
    },
    "passthrough": [
      "aigc_watermark"
    ]
  },
  "runway/gen-4.5": {
    "kind": "video",
    "durations": [
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10
    ],
    "resolutions": [
      "720p"
    ],
    "aspectRatios": [
      "16:9",
      "9:16"
    ],
    "frameImages": [
      "first_frame"
    ],
    "generateAudio": false,
    "seed": true,
    "priceSkus": {
      "cents_per_second_output": 12
    },
    "passthrough": [
      "contentModeration"
    ]
  },
  "x-ai/grok-imagine-video-1.5": {
    "kind": "video",
    "durations": [
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15
    ],
    "resolutions": [
      "480p",
      "720p",
      "1080p"
    ],
    "aspectRatios": [
      "16:9",
      "9:16",
      "1:1",
      "4:3",
      "3:4",
      "3:2",
      "2:3"
    ],
    "frameImages": [
      "first_frame"
    ],
    "generateAudio": false,
    "seed": false,
    "priceSkus": {
      "cents_per_image_input": 1,
      "cents_per_video_output_second_480p": 8,
      "cents_per_video_output_second_720p": 14,
      "cents_per_video_output_second_1080p": 25
    },
    "passthrough": []
  },
  "alibaba/happyhorse-1.1": {
    "kind": "video",
    "durations": [
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15
    ],
    "resolutions": [
      "720p",
      "1080p"
    ],
    "aspectRatios": [
      "16:9",
      "9:16",
      "1:1",
      "4:3",
      "3:4",
      "21:9",
      "9:21"
    ],
    "frameImages": [
      "first_frame"
    ],
    "generateAudio": false,
    "seed": true,
    "priceSkus": {
      "duration_seconds_720p": 0.0988,
      "duration_seconds_1080p": 0.1278
    },
    "passthrough": []
  },
  "kwaivgi/kling-v3.0-pro": {
    "kind": "video",
    "durations": [
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15
    ],
    "resolutions": [
      "720p"
    ],
    "aspectRatios": [
      "16:9",
      "9:16",
      "1:1"
    ],
    "frameImages": [
      "first_frame",
      "last_frame"
    ],
    "generateAudio": true,
    "seed": false,
    "priceSkus": {
      "duration_seconds": 0.112,
      "duration_seconds_with_audio": 0.168,
      "text_to_video_duration_seconds_480p": 0.112,
      "text_to_video_duration_seconds_720p": 0.112,
      "image_to_video_duration_seconds_720p": 0.112,
      "text_to_video_duration_seconds_1080p": 0.112,
      "image_to_video_duration_seconds_1080p": 0.112
    },
    "passthrough": [
      "negative_prompt",
      "cfg_scale"
    ]
  },
  "kwaivgi/kling-v3.0-std": {
    "kind": "video",
    "durations": [
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15
    ],
    "resolutions": [
      "720p"
    ],
    "aspectRatios": [
      "16:9",
      "9:16",
      "1:1"
    ],
    "frameImages": [
      "first_frame",
      "last_frame"
    ],
    "generateAudio": true,
    "seed": false,
    "priceSkus": {
      "duration_seconds": 0.084,
      "duration_seconds_with_audio": 0.126,
      "text_to_video_duration_seconds_480p": 0.084,
      "text_to_video_duration_seconds_720p": 0.084,
      "image_to_video_duration_seconds_720p": 0.084,
      "text_to_video_duration_seconds_1080p": 0.084,
      "image_to_video_duration_seconds_1080p": 0.084
    },
    "passthrough": [
      "negative_prompt",
      "cfg_scale"
    ]
  },
  "google/veo-3.1-fast": {
    "kind": "video",
    "durations": [
      4,
      6,
      8
    ],
    "resolutions": [
      "720p",
      "1080p",
      "4K"
    ],
    "aspectRatios": [
      "16:9",
      "9:16"
    ],
    "frameImages": [
      "first_frame",
      "last_frame"
    ],
    "generateAudio": true,
    "seed": true,
    "priceSkus": {
      "duration_seconds_with_audio": 0.12,
      "duration_seconds_with_audio_4k": 0.3,
      "duration_seconds_without_audio": 0.1,
      "duration_seconds_with_audio_720p": 0.1,
      "duration_seconds_without_audio_4k": 0.25,
      "duration_seconds_without_audio_720p": 0.08
    },
    "passthrough": [
      "personGeneration",
      "aspectRatio",
      "negativePrompt",
      "conditioningScale",
      "enhancePrompt"
    ]
  },
  "google/veo-3.1-lite": {
    "kind": "video",
    "durations": [
      8,
      4,
      6
    ],
    "resolutions": [
      "720p",
      "1080p"
    ],
    "aspectRatios": [
      "16:9",
      "9:16"
    ],
    "frameImages": [
      "first_frame",
      "last_frame"
    ],
    "generateAudio": true,
    "seed": true,
    "priceSkus": {
      "duration_seconds_with_audio": 0.08,
      "duration_seconds_without_audio": 0.05,
      "duration_seconds_with_audio_720p": 0.05,
      "duration_seconds_without_audio_720p": 0.03
    },
    "passthrough": [
      "personGeneration",
      "aspectRatio",
      "negativePrompt",
      "conditioningScale",
      "enhancePrompt"
    ]
  },
  "kwaivgi/kling-video-o1": {
    "kind": "video",
    "durations": [
      5,
      10
    ],
    "resolutions": [
      "720p"
    ],
    "aspectRatios": [
      "16:9",
      "9:16",
      "1:1"
    ],
    "frameImages": [
      "first_frame",
      "last_frame"
    ],
    "generateAudio": true,
    "seed": false,
    "priceSkus": {
      "duration_seconds": 0.112
    },
    "passthrough": [
      "negative_prompt"
    ]
  },
  "minimax/hailuo-2.3": {
    "kind": "video",
    "durations": [
      6,
      10
    ],
    "resolutions": [
      "1080p"
    ],
    "aspectRatios": [
      "16:9"
    ],
    "frameImages": [
      "first_frame"
    ],
    "generateAudio": false,
    "seed": false,
    "priceSkus": {
      "duration_seconds": 0.0817
    },
    "passthrough": [
      "prompt_optimizer",
      "fast_pretreatment"
    ]
  },
  "bytedance/seedance-2.0-fast": {
    "kind": "video",
    "durations": [
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15
    ],
    "resolutions": [
      "480p",
      "720p"
    ],
    "aspectRatios": [
      "1:1",
      "3:4",
      "9:16",
      "4:3",
      "16:9",
      "21:9",
      "9:21"
    ],
    "frameImages": [
      "first_frame",
      "last_frame"
    ],
    "generateAudio": true,
    "seed": true,
    "priceSkus": {
      "video_tokens": 0.0000042,
      "video_tokens_without_audio": 0.0000042,
      "video_tokens_with_video_input": 0.000002475
    },
    "passthrough": [
      "watermark",
      "req_key"
    ]
  },
  "alibaba/wan-2.7": {
    "kind": "video",
    "durations": [
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10
    ],
    "resolutions": [
      "720p",
      "1080p"
    ],
    "aspectRatios": [
      "16:9",
      "9:16",
      "1:1",
      "4:3",
      "3:4"
    ],
    "frameImages": [
      "first_frame",
      "last_frame"
    ],
    "generateAudio": true,
    "seed": true,
    "priceSkus": {
      "duration_seconds": 0.1
    },
    "passthrough": [
      "negative_prompt",
      "prompt_extend",
      "audio",
      "ratio",
      "last_image",
      "video",
      "videos",
      "images"
    ]
  },
  "bytedance/seedance-2.0": {
    "kind": "video",
    "durations": [
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15
    ],
    "resolutions": [
      "480p",
      "720p",
      "1080p",
      "4K"
    ],
    "aspectRatios": [
      "1:1",
      "3:4",
      "9:16",
      "4:3",
      "16:9",
      "21:9",
      "9:21"
    ],
    "frameImages": [
      "first_frame",
      "last_frame"
    ],
    "generateAudio": true,
    "seed": true,
    "priceSkus": {
      "video_tokens": 0.000007,
      "video_tokens_4k": 0.000004,
      "video_tokens_1080p": 0.0000077,
      "video_tokens_without_audio": 0.000007,
      "video_tokens_with_video_input": 0.0000043,
      "video_tokens_4k_with_video_input": 0.0000024,
      "video_tokens_1080p_with_video_input": 0.0000047
    },
    "passthrough": [
      "watermark",
      "req_key"
    ]
  },
  "openai/sora-2-pro": {
    "kind": "video",
    "durations": [
      4,
      8,
      12,
      16,
      20
    ],
    "resolutions": [
      "720p",
      "1080p"
    ],
    "aspectRatios": [
      "16:9",
      "9:16"
    ],
    "frameImages": [],
    "generateAudio": true,
    "seed": false,
    "priceSkus": {
      "duration_seconds_720p": 0.3,
      "duration_seconds_1024p": 0.5,
      "duration_seconds_1080p": 0.5
    },
    "passthrough": [
      "quality",
      "style"
    ]
  },
  "google/veo-3.1": {
    "kind": "video",
    "durations": [
      4,
      6,
      8
    ],
    "resolutions": [
      "720p",
      "1080p",
      "4K"
    ],
    "aspectRatios": [
      "16:9",
      "9:16"
    ],
    "frameImages": [
      "first_frame",
      "last_frame"
    ],
    "generateAudio": true,
    "seed": true,
    "priceSkus": {
      "duration_seconds_with_audio": 0.4,
      "duration_seconds_with_audio_4k": 0.6,
      "duration_seconds_without_audio": 0.2,
      "duration_seconds_without_audio_4k": 0.4
    },
    "passthrough": [
      "personGeneration",
      "aspectRatio",
      "negativePrompt",
      "conditioningScale",
      "enhancePrompt"
    ]
  }
};
