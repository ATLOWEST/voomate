# @soniq/infra

AWS CDK definitions. **Written, not deployed** — Phase 0 defines the infrastructure so that
connecting services in Phase 1 is a `cdk deploy`, not a design exercise.

```
bin/soniq.ts          app entry — resolves stage, wires stacks
lib/config.ts         per-stage config; the region constraint lives here
lib/storage-stack.ts  S3: crawled content, widget assets
lib/knowledge-stack.ts OpenSearch Serverless collection + Bedrock KB role
lib/runtime-stack.ts  the IAM role the control-plane API runs as
```

```bash
npm run synth --workspace @soniq/infra              # dev
npx cdk synth -c stage=prod --workspace @soniq/infra
```

`synth` needs no AWS credentials. `deploy` does, and there are none in this repo by design.

## Region is not a free choice

Bedrock (Nova Pro), Bedrock Knowledge Bases, OpenSearch Serverless, Transcribe streaming with
multi-language identification, Polly generative voices, and Chime SDK media pipelines must all
be in the **same region**. Cross-region hops spend latency the 1.2s speech-to-speech budget
does not have. `us-east-1` is the pinned choice — re-check the service tables before changing
it.

## Tenants are not CloudFormation resources

One OpenSearch collection for the platform; one Bedrock Knowledge Base **per tenant**, created
at runtime by the control plane. Merchants sign up continuously, and a stack deploy per signup
is not a product. The isolation guarantee is therefore application-enforced:

- each KB gets its own vector index in the shared collection, and
- its data source is scoped to a single S3 prefix, `tenant/{organizationId}/{agentId}/`.

Neither is enforced by this stack. Both are enforced by code, which is why the knowledge-base
ID lives on the agent row and every query reads it from there. See
[ADR 0001](../docs/adr/0001-bedrock-knowledge-bases.md).

## Why the API role is narrow

`RuntimeStack.apiRole` is reachable from a process that accepts arbitrary merchant input and
serves untrusted website visitors. Anything it can do is something an application bug can
eventually be made to do.

Two deliberate scoping decisions worth not undoing:

- **`bedrock:Retrieve`, never `bedrock:RetrieveAndGenerate`.** The latter hands prompt
  construction to Bedrock, taking our system prompt — and its injection defences — out of our
  control. Crawled site content is untrusted; see [docs/security.md](../docs/security.md).
- **The KB role can invoke the embedding model only.** It cannot invoke the chat model. That
  is the API role's job, with a separate blast radius.

Transcribe, Polly, and Chime use `*` resources because none of them support resource-level
permissions — there is no ARN for a synthesis request. That is an AWS limitation, not an
oversight.
