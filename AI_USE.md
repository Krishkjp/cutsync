# AI_USE.md — AI Disclosure Statement

In accordance with ethical AI standards, all AI tools and models utilized in CutSync are disclosed below:

1. **AI Assistant & Development Tooling**:
   - Model: Gemini in Google AI Studio
   - Usage: Architecture design, OpenAPI 3.1 specification creation, physical synthesis DSP algorithm drafting, TypeScript multi-track engine implementation, React 19 UI component construction, and automated test suite authoring.

2. **Model Interfaces & Orchestration**:
   - CutSync Emotional Orchestrator: Maps natural language scene prompts into musical parameters (musical mode, tempo, key, section cut points, dynamic envelope, and instrument stem assignments).
   - Replicate MusicGen Adapter: Optional hosted model adapter for cloud-based music diffusion inference using Meta MusicGen.
   - Gemini API Integration: Compatible with `@google/genai` for semantic prompt expansion and composer influence extraction.

3. **Audio Safety**:
   - The built-in audio engine does not rely on opaque deep neural networks trained on copyrighted artist recordings. Audio generation is carried out via mathematical DSP synthesis conditioned on emotion embeddings.
