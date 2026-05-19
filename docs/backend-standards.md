# Backend Standards

## Architecture
Domain-driven design with three layers:
- **Presentation** — controllers and routes
- **Application** — services and validators
- **Domain** — models and repository interfaces
- **Infrastructure** — database clients, logger, external services

## Conventions
- All files in TypeScript
- Controllers handle HTTP, delegate logic to services
- Services contain business logic only
- Models map to Prisma schema entities
- Repository interfaces defined in domain, implemented in infrastructure

## Testing
- Unit tests alongside source files (`*.test.ts`)
- Integration tests in `__tests__/` directories
- Run: `npm test`
