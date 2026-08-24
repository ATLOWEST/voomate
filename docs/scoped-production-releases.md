# Scoped production releases

`npm run release:changed` is the production release command. Commit the change first, then run it from a clean worktree:

```sh
npm run release:changed
```

The command compares `HEAD^..HEAD`, selects only the affected runtime, runs that runtime's local gate, builds in the private AWS CodeBuild project, pushes a commit-addressed immutable ECR image, and promotes it through CloudFormation. API, dashboard, and voice retain their separate currently-live image tags, so a dashboard release never rolls API or voice.

Use `npm run release:changed -- --dry-run` to inspect selection. For a multi-commit branch, supply the known production base commit:

```sh
npm run release:changed -- --base <production-commit>
```

An explicit runtime selection is available for an intentional rebuild:

```sh
npm run release:changed -- --services dashboard
```

`npm run release:status` shows desired/running/pending ECS counts and the immutable image tag currently serving for every runtime.

## Safety and rollback

The command rejects a dirty worktree, never builds on a laptop, archives exactly committed `HEAD` to a private S3 object keyed by commit, and uses immutable ECR tags. CloudFormation remains the owner of ECS task definitions, retaining deployment history rather than making untracked imperative changes.

If a deployed runtime must be reverted, select the known-good tag from `release:status` or CloudFormation/ECR history and promote only that service:

```sh
npm run release:rollback -- dashboard <known-good-immutable-tag>
```

The rollback command preserves the live tags of the other two runtimes. Run a smoke check after each release and rollback.
