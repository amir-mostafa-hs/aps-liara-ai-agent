# ADR-0004: AI Model Selection and Structured Orchestration

## Context

The Python Agent Engine requires a reliable language model to perform project static inspection, identify runtime dependencies, produce strictly typed deployment plans, and analyze Liara failure logs. Freeform text output from LLMs can lead to hallucinations, arbitrary shell generation, or parsing errors.

## Decision

We adopt a provider-agnostic LangChain architecture centered around OpenAI-compatible APIs:
1. **Primary Model Target:** Configured for `gpt-6-luna` (via standard OpenAI endpoint or custom base URL proxy).
2. **Configuration via Environment:** Model parameters (`OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL_NAME`) are loaded from `.env` through LangChain's dynamic model initialization (`init_chat_model`), allowing seamless provider switching (OpenAI, Claude, or Gemini) without modifying code.
3. **Structured Outputs:** All agent outputs for planning, tool invocation, and diagnosis must use Pydantic models through `.with_structured_output()`. Arbitrary string outputs are rejected at the service boundary.

## Consequences

The agent guarantees safe, schema-compliant plans and tool arguments while allowing the user to point the engine to `gpt-6-luna` or any compatible model endpoint.

