# AuthorHub AI Architecture

## Purpose

AI in AuthorHub assists authors without obscuring authorship, evidence, or editorial control. The application owns operation contracts; model providers are replaceable execution backends.

## Modes

### Human-authored mode
AI may analyze, research, critique, check grammar, identify problems, and suggest changes, but it does not insert substantive prose without explicit acceptance.

### AI-assisted mode
AI may generate tracked suggestions or replacement passages. Every substantive change enters through an accept/apply flow.

### AI co-written mode
AI may draft new prose at the author's request. Generated content must retain generation provenance and remain distinguishable in audit/export reports.

Mode is a product preference and policy input, not a license to bypass provenance.

## Operation model

Do not expose a raw provider chat endpoint as the application architecture. Define typed operations such as:

- `rewrite_passage`
- `expand_passage`
- `shorten_passage`
- `preserve_voice_rewrite`
- `developmental_review`
- `continuity_review`
- `extract_claims`
- `verify_claim_against_sources`
- `suggest_citations`
- `book_structure_review`
- `terminology_consistency_review`
- `publication_readiness_review`

Each operation owns:
- input schema
- output schema
- allowed context sources
- prompt/policy version
- provider/model routing policy
- max cost/token budget
- timeout/retry semantics
- whether human acceptance is required
- provenance requirements

## Provider abstraction

Target package interface:

```ts
export interface AiProvider {
  generateStructured<TInput, TOutput>(
    request: StructuredGenerationRequest<TInput>,
    outputSchema: Schema<TOutput>,
  ): Promise<StructuredGenerationResult<TOutput>>;
}
```

Provider SDK request/response shapes must not leak into persisted domain records.

Initial provider support may include OpenAI and Anthropic. Routing should permit operation-specific defaults and future fallback, but MVP does not need an autonomous multi-agent framework.

## Provenance envelope

Every substantive generation records:
- organization/book/node identity
- initiating user
- operation type
- provider/model
- prompt/policy version
- referenced manuscript block IDs and hashes
- referenced source/chunk IDs and hashes
- user instruction
- raw structured output
- acceptance/rejection disposition
- accepted output
- token usage
- cost
- latency
- timestamps

Avoid copying entire manuscripts into provenance records. Prefer references and hashes except where the operation's output itself must be retained.

## Evidence rules

A model may:
- identify candidate claims
- rank relevant evidence
- explain whether evidence appears supportive
- surface contradictory evidence

A model may not by itself make a claim `supported` without stored source evidence that can be shown to the user.

Generated references must resolve to real source records. Never fabricate bibliographic metadata to satisfy an output schema.

## Retrieval

AI context selection should use:
1. explicit user-selected sources first
2. chapter/book-associated sources
3. full-text retrieval
4. semantic retrieval when beneficial

Every retrieved chunk retains:
- `source_id`
- `source_chunk_id`
- original location/page/timecode where available
- content hash

Semantic similarity is relevance evidence, not factual truth.

## Author voice

A voice profile may contain author-approved characteristics such as:
- formality
- sentence-length tendency
- terminology preferences
- first/third person preference
- prohibited phrases
- example passages selected by author

Do not silently train a private model on user manuscripts. Voice preservation should initially use explicit profile data and retrieval of authorized example passages.

## Change application

AI output must remain separate from accepted canonical manuscript content until an operation explicitly applies it.

Preferred flow:

```text
select content -> run AI operation -> preview diff/suggestion -> accept/reject/edit -> apply canonical change -> create revision event
```

For new prose generation, the inserted blocks receive provenance links to the originating `ai_generation`.

## Safety and trust

- Never claim legal, medical, historical, scientific, or factual verification without evidence suitable for the operation.
- Surface uncertainty and conflicting sources.
- Do not hide source failures behind generic confident prose.
- Model refusal/provider errors must not destroy the author's working state.
- AI is not permitted to modify publication metadata disclosures dishonestly.

## Cost controls

Every AI operation should support:
- token budget
- operation-level spend budget
- organization entitlement check
- idempotency key
- usage record
- retry cap

Avoid repeatedly sending an entire book when chapter or retrieved context is sufficient.

## Privacy

Before enabling a provider for production, document:
- data retention
- training/data-use policy
- regional processing concerns where relevant
- enterprise/zero-retention options where available

No provider receives more manuscript/source content than the operation needs.

## Evaluation

Maintain eval sets for:
- citation hallucination
- claim extraction precision/recall
- evidence attribution correctness
- rewrite preservation of meaning
- voice adherence
- destructive edit detection
- prompt injection from imported sources
- long-context failure

Provider/model upgrades are releases, not invisible substitutions. Run the relevant eval suite before changing production defaults.
