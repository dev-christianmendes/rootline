# Changesets

This project uses [Changesets](https://github.com/changesets/changesets) for versioning and changelog generation.

## Adding a Changeset

When you make a change that should be released, create a changeset:

```bash
npx changeset
```

This will prompt you to:

1. Select which packages have changed
2. Choose the type of version bump (major, minor, patch)
3. Write a summary of the change

A markdown file will be created in `.changeset/` with a random name.

## Releasing

To create a release:

1. Merge changesets to main
2. Run the release workflow (or locally):
   ```bash
   npx changeset version
   npx changeset publish
   ```

The GitHub Actions workflow handles this automatically on push to main.

## Versioning Strategy

- **Major**: Breaking API changes, schema changes, removed endpoints
- **Minor**: New features, new endpoints, new UI components
- **Patch**: Bug fixes, documentation updates, dependency updates

## Package Structure

This is a monorepo with the following packages:

- `@rootline/web` - Next.js frontend
- `@rootline/api` - FastAPI backend (published as Docker image, not npm)
- `@rootline/types` - Shared TypeScript types
- `@rootline/ui` - Design system components
- `@rootline/config` - Shared configurations

Note: Only `@rootline/types` and `@rootline/ui` are published to npm. The web and api are deployed as applications.
