# Phase 4 — The agent that learns

Phase 3 gave the agent a voice. It answers well when the merchant's website happens to contain
the answer, and says "I don't know" when it doesn't. Then the conversation ends and **everything
about it is thrown away.**

That last sentence is not a figure of speech. `conversations` and `messages` are real tables with
real RLS policies, and as of commit `4fdaa7b` nothing in the API has ever inserted a row into
either. Every question a visitor has ever asked is gone.

That is the whole opportunity. An agent that keeps its conversations can notice the questions it
failed, and a merchant who can see those questions can fix them in a minute. Do that a hundred
times and the agent is measurably better than it was — not because the model changed, but because
its knowledge did.

---

## What "self-learning" means here, and what it must not mean

Two systems both get called self-learning. Only one of them is safe to build for a merchant.

| | What it does | Why we do / don't |
|---|---|---|
| **Learns its knowledge** ✅ | Notices what it could not answer, clusters those questions, drafts answers, a human approves, the answer is indexed and used | Every change is inspectable and reversible. The merchant stays the author of what their shop says. |
| **Learns its own behaviour** ❌ | Fine-tunes on its own transcripts, promotes its own answers, adapts its prompt from visitor reactions | It learns its own mistakes. One confident wrong answer becomes training data for the next hundred, and nobody can point at the moment it went wrong. |

A support agent speaks *for a business*. It quotes refund windows and delivery times, and those
are commitments. A system that silently rewrote what it says about refunds would be a liability
with a friendly voice.

So the loop always closes through a person — but everything up to that person is automatic, and
the approval is one click on a pre-written answer. **The human gate is the feature.**

---

## The loop

```
   visitor asks  ──▶  agent answers  ──▶  every turn recorded, with how well it was grounded
                                                     │
                                                     ▼
                                        questions it could not answer
                                                     │
                                          embedded and clustered
                                     ("do you ship to Canada?" and
                                      "can I get this in Canada" are one thing)
                                                     │
                                                     ▼
                              dashboard: "47 visitors asked this. You have no answer."
                                          + a draft answer, written from the site
                                                     │
                                            merchant edits, approves
                                                     │
                                                     ▼
                                     indexed as knowledge ──▶ next visitor gets it
```

The interesting property: the ranking is by **how many real visitors were let down**, not by what
the merchant imagines people ask. Merchants are consistently wrong about that, and it is the
single most valuable thing this data can tell them.

---

## Build order

Each step is useful on its own, and each one is a thing a merchant could notice.

1. **Remember** — persist conversations, turns, per-turn grounding and latency, and usage
   records. Nothing else in this phase is possible without it, and it is also the last missing
   piece of billing.
2. **Notice** — record, per answered turn, whether retrieval actually supported the answer:
   top similarity, which chunks were used, whether the agent refused. A "gap" is a question
   whose best evidence was too weak, or that got no evidence at all.
3. **Cluster** — embed the failed questions and group near-duplicates, so the merchant sees
   *one* item saying "47 people asked this" instead of 47 items.
4. **Draft** — for each cluster, ask the model to write an answer from the site content, or to
   say plainly that the site does not contain it. A blank box is where good intentions go to
   die; a draft to edit gets approved.
5. **Close the loop** — approve → a Q&A knowledge document → embedded → answered next time.
   With the count of visitors who will now get an answer they would not have got.
6. **Remember the answers too** — a semantic answer cache keyed on the question embedding and
   the knowledge version. The same question asked twice skips embedding, retrieval and
   generation. This is a latency and cost feature as much as a learning one.
7. **Learn what the knowledge is worth** — per-chunk hit rate and per-source usefulness, so a
   merchant can see which pages of their site are actually earning their keep, and so retrieval
   can prefer what has worked.

---

## Rules this phase must respect

| Rule | Why |
|---|---|
| **Recording is never on the turn's critical path** | The database is 208 ms away. One awaited insert mid-turn spends the entire speech-to-speech budget. Writes are queued and flushed behind the conversation. |
| **A failed write never breaks a conversation** | Ending someone's call because an analytics insert timed out is trading the product for its telemetry. |
| **Transcripts are personal data, and they expire** | `purgeAfter` is set from the agent's retention policy on the way in, not by a cleanup job that has to guess later. |
| **A clustered question is a quotation, not a summary** | The merchant needs to see what a visitor actually typed or said, including the awkward phrasing. That is the signal. |
| **Nothing is indexed without approval** | See above. The gate is the feature. |
| **Voice transcripts are what was *heard*, not what was generated** | An interrupted answer is stored truncated at the heard-point, because that is what the visitor is reacting to. Phase 3 already tracks this; the recorder must not undo it. |

---

## What is explicitly *not* in Phase 4

- Fine-tuning, LoRA, or any weight update. See the table at the top.
- Automatic publishing of drafted answers, even behind a setting. The setting would be turned on
  by the merchants least able to judge the consequences.
- Learning across tenants. One merchant's question volume is a business secret, and shared
  learning would leak it.
- A/B testing prompts against live visitors. That belongs with the analytics work, and it needs
  a resolution metric that does not exist yet.
