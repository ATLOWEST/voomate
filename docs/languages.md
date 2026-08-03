# Language Strategy

> Sourced from AWS documentation on 2026-08-02. **Re-verify before launch** — AWS ships new
> Polly voices and Transcribe languages regularly, and this matrix is the single thing most
> likely to be out of date. The machine-readable version lives in
> [`packages/i18n/src/registry.ts`](../packages/i18n/src/registry.ts); this document explains
> the reasoning behind it.

## The constraint that drives everything

A **voice** agent needs three capabilities to line up for a given language:

1. **Transcribe** must support it in *streaming* mode (batch is useless to us).
2. **Nova Pro** must reason and write naturally in it.
3. **Polly** must have a voice for it — ideally Generative tier.

Language support is usually discussed as if it were one number. It isn't. The binding
constraint is almost always Polly, and it is much narrower than Transcribe's.

### The finding that reshaped the plan

**Polly has no voice whatsoever for Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada,
Malayalam, or Punjabi.** Transcribe can transcribe all of them in streaming mode. Nova Pro
can reason in them. But we cannot *speak* them.

So "support Indian languages" cannot mean what it intuitively sounds like. Beyond Hindi,
Indian regional languages can only ever be **text-tier** for us today. Any roadmap or sales
promise that says otherwise is writing a cheque Polly cannot cash. We surface this honestly
in the dashboard rather than shipping a silently-degraded experience.

## The 10 launch languages

Ranked by global reach, weighted toward the merchant markets we're targeting, and filtered
by what can actually be delivered at quality.

| # | Language | STT (Transcribe) | Voice (Polly) | Tier | Notes |
|---|---|---|---|---|---|
| 1 | English (US) | `en-US` full streaming | Danielle, Joanna, Matthew, Ruth, Stephen | **Generative** | Reference implementation |
| 2 | English (India) | `en-IN` full streaming | **Kajal** | **Generative** | Bilingual with Hindi — see below |
| 3 | Hindi | `hi-IN` full streaming | **Kajal**, Aditi | Neural | Bilingual with en-IN |
| 4 | Spanish | `es-US` / `es-ES` full streaming | Lupe, Mia, Lucia, Sergio | **Generative** | |
| 5 | Portuguese (BR) | `pt-BR` full streaming | Camila | **Generative** | |
| 6 | French | `fr-FR` full streaming | Ambre, Léa, Rémi, Florian | **Generative** | Deepest generative roster |
| 7 | German | `de-DE` full streaming | Vicki, Daniel, Lennart | **Generative** | |
| 8 | Arabic (Gulf) | `ar-AE` streaming | **Hala**, **Zayd** | Neural | Bilingual w/ English |
| 9 | Mandarin Chinese | `zh-CN` streaming | Zhiyu (`cmn-CN`) | Neural | STT/TTS codes differ |
| 10 | Japanese | `ja-JP` streaming | Takumi, Kazuha, Tomoko | Neural | |

**Free extras** — Generative-tier and fully supported, enabled by a config flag with no new
engineering: English (UK/AU/IE/NZ/SG/ZA), Italian, Korean, Dutch, Polish, French (CA/BE),
German (AT/CH), Spanish (MX).

**Text-only tier** — streaming STT exists, no Polly voice. The agent reads and answers in
text; voice output falls back to a language it can speak well: Bengali, Tamil, Telugu,
Marathi, Gujarati, Kannada, Malayalam, Punjabi, Turkish, Russian, Vietnamese, Thai.

## Code-switching — the India differentiator

Real Indian speech is not Hindi. It's Hinglish: *"Mera order kab deliver hoga, can you check
the status?"* Single-language STT mangles this, and it's how most competitors quietly fail
in this market.

We handle it end to end, and both halves are natively supported:

**Input — Transcribe streaming multi-language identification**

```
identify-multiple-languages: true
language-options: en-IN,hi-IN
preferred-language: hi-IN
media-encoding: pcm            # REQUIRED — multi-language ID does not accept FLAC
```

Hard constraints from the AWS docs, encoded in `packages/i18n`:

- Minimum **2** language codes; `language-code` and `identify-*` are mutually exclusive.
- **One dialect per language per stream.** `en-IN` + `hi-IN` is legal. `en-US` + `en-IN` is
  *not* — same language, two dialects. This forces a real product decision: an agent
  configured for the India market uses `en-IN`, not `en-US`.
- **PCM only** for multi-language ID (single-language ID also allows FLAC).
- Needs ≥1 second of speech to identify — factor into first-turn latency budget.
- Keep the candidate set **tight (2–3)**. If none of the supplied codes match what's spoken,
  Transcribe forces the *closest* match and returns a confidently wrong transcript. A wide
  candidate list actively degrades accuracy — this is why we never enable all 10 at once.

**Output — Polly fully bilingual voices**

Only four voices are truly bilingual: **Aditi** and **Kajal** (Indian English + Hindi), and
**Hala** and **Zayd** (Gulf Arabic + English).

Kajal handles all of these correctly *within a single sentence*:

- Devanagari: `उसने कहाँ, खेल तोह अब शुरू होगा`
- Romanagari (Latin script Hindi): `Usne kahan, khel toh ab shuru hoga`
- Mixed: `This is the song कभी कभी अदिति from the movie Jaane Tu Ya Jaane Na`

This means **Kajal alone covers the entire Hinglish spectrum** with no language switching,
no SSML gymnastics, and no voice change mid-utterance. It is the single most valuable voice
in the catalog for our India strategy, and the pipeline treats hi-IN/en-IN as one
bilingual unit rather than two languages.

Note: Arabic numerals default to being read as Indian English. To have them read as Hindi,
the `hi-IN` language code must be passed explicitly.

> Non-bilingual voices can *fake* a second language via the SSML `<lang>` tag, but the
> pronunciation stays accented by the voice's native language. Acceptable for a stray
> loanword, not for genuine code-switching. We use `<lang>` only for isolated foreign terms
> (product names, brand names), never as a bilingual strategy.

## Cross-lingual retrieval

A merchant's site is usually written in one language; visitors won't all speak it. Grounded
answers must survive that gap.

1. **Multilingual embeddings first.** Titan Embed Text v2 is multilingual, so a Hindi query
   can retrieve English chunks directly. Cheapest path, no extra hop, no added latency.
2. **Translate-then-retrieve fallback.** Where recall for a language pair measures poorly,
   translate the query into the KB's source language, retrieve, then answer in the visitor's
   language. Costs a hop; used only where measured as necessary.
3. **Always answer in the visitor's language**, regardless of the source document's language.
   Citations still point at the original-language source.

This must be **measured per language pair**, not assumed. Retrieval quality across languages
is the most common silent failure in multilingual RAG: the system returns fluent, confident,
ungrounded answers because retrieval quietly returned nothing relevant.

## Runtime behaviour rules

| Situation | Behaviour |
|---|---|
| Visitor speaks a configured language | Answer in it, voice at the best available tier |
| Visitor code-switches (e.g. Hinglish) | Bilingual voice handles it inline; no switch event |
| Visitor speaks a **text-tier** language | Answer in text; speak the fallback language |
| Visitor speaks an unconfigured language | Say — *in a language we speak well* — which languages are available. Never guess |
| Language ID is low-confidence | Fall back to the agent's `preferredLanguage`, don't thrash |
| Merchant selects a Neural/Standard-only language | Dashboard shows the quality tier explicitly before they ship |

Rule: **never silently degrade.** A merchant who picked a Standard-tier language should learn
that from our UI, not from a customer complaint.

## Per-agent configuration, not global

Merchants select a **small candidate set per agent** (2–4 languages), not all 10. This is
required by the accuracy constraint above, and it maps to reality — a merchant selling in
India needs `hi-IN` + `en-IN`, not Japanese.

Dashboard responsibilities:
- Enforce the one-dialect-per-language rule at selection time, with an explanation.
- Warn when the candidate set exceeds 3 languages, since accuracy degrades.
- Show the voice quality tier per selected language before publish.
- Let the merchant preview each voice, in their own content, before going live.

## Dashboard localisation

The **agent** speaks 10 languages. The **dashboard** ships English-only for now — its users
are merchants and developers, a population with high English proficiency, and localising it
early would slow iteration on the product surface that's still changing most. All
user-visible dashboard strings still route through a single module so this stays a
translation project later, not a refactor.
