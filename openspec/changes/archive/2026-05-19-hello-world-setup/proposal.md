# Proposal: Hello World Setup

## Why

Validate the full project setup — TypeScript, Express, Genkit, and Docker — by running a working web app that responds on port 8080.

## What Changes

- Add `package.json` with Express, Genkit, and TypeScript dependencies
- Add `tsconfig.json` for TypeScript configuration
- Add `src/index.ts` as the app entry point serving "Hello World" on port 8080
- Docker image builds and runs correctly exposing port 8080

## Capabilities

### New Capabilities
- `web-server`: HTTP server listening on port 8080, returning "Hello World" at the root route

## Impact

- `package.json`: new file — project dependencies
- `tsconfig.json`: new file — TypeScript compiler config
- `src/index.ts`: new file — Express app entry point
- `Dockerfile`: already exists, no changes needed
