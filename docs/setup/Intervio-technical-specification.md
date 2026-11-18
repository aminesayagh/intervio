# Intervio — Technical specification

Status: proposed architecture and configuration, not yet implemented. Service names and examples illustrate the organization and are not a finalized domain model.

## 1. Project architecture

- One Git repository containing a React frontend and a Java/Spring Boot backend.
- Backend: start as a modular monolith, with clear boundaries between business services.
- Organize code by service. Each service owns its API code, hooks, components, types, business logic, and tests as relevant.
- Subfolders are welcome inside a service when they improve navigation; do not create empty folders by default.
- `core` groups Intervio-specific business services. Generic capabilities such as authentication, internationalization, and the UI kit live outside `core`.
- Avoid a catch-all `shared` folder. Reusable code belongs to a named service with a clear responsibility.
- Services expose a deliberate public interface. Other services should avoid reaching into their internals or creating circular dependencies.
- Frontend and backend have separate build processes. They can run separately in development; use a frontend development proxy for backend requests.

### Example repository layout

```text
intervio/
├── frontend/
│   ├── src/
│   │   ├── app/                       # App setup, routes, providers
│   │   ├── services/
│   │   │   ├── core/                  # Intervio business capabilities
│   │   │   │   ├── interviews/        # Example
│   │   │   │   └── candidates/        # Example
│   │   │   ├── auth/
│   │   │   ├── i18n/
│   │   │   └── ui-kit/
│   │   └── main.tsx
│   ├── tests/e2e/
│   ├── eslint.config.js
│   ├── package.json
│   └── pnpm-lock.yaml
├── backend/
│   ├── src/main/java/com/intervio/
│   │   ├── IntervioApplication.java
│   │   ├── core/
│   │   │   ├── interviews/            # Example
│   │   │   └── candidates/            # Example
│   │   └── auth/
│   ├── src/main/resources/db/migration/
│   ├── src/test/java/com/intervio/
│   ├── pom.xml
│   └── mvnw
├── docs/
├── compose.yaml                       # Optional local PostgreSQL
├── .editorconfig
└── README.md
```

Example of a frontend business service:

```text
services/core/interviews/
├── api/                 # HTTP functions
├── components/          # Service-specific UI
├── hooks/               # Service-specific hooks and queries
├── types/
├── locales/             # Service-owned translations
├── tests/               # Integration tests when useful
└── index.ts             # Deliberate public exports
```

Tests can also sit beside the files they test. A small service may keep files at its root; a large one can use deeper subfolders. Backend tests mirror the corresponding Java packages. Java business modules may similarly contain `api`, `application`, `domain`, and `persistence` packages when warranted.

## 2. Frontend stack

| Purpose | Choice |
| --- | --- |
| Framework | React + TypeScript |
| Package manager | pnpm |
| UI components | HeroUI v3 |
| Styling | Tailwind CSS v4 |
| Internationalization | i18next + react-i18next |
| HTTP | Native fetch |
| Server data and cache | TanStack Query |
| Build tooling | Vite, proposed |

### UI: HeroUI and Tailwind

- HeroUI v3 requires React 19 or later and Tailwind CSS v4. Follow the v3 installation instructions rather than mixing them with v2 setup.
- Configure Intervio's colors, typography, themes, and light/dark behavior.
- Keep reusable Intervio UI components in `services/ui-kit/`. Use HeroUI directly where a wrapper adds no value.
- Source: [HeroUI quick start](https://heroui.com/en/docs/react/getting-started/quick-start).

### Internationalization

- Use i18next and react-i18next to change the interface language dynamically, without adding language prefixes to routes.
- Resolve language in this order: saved user preference, browser preference, default language. English and French are examples; supported languages and default remain to be chosen.
- Change language immediately without a page reload. Initially persist the choice locally; account synchronization can be added later.
- The `i18n` service initializes the library. Business and generic services own their own translation files or namespaces.
- Use locale-aware formatting for dates and numbers. Changing UI language does not translate user-provided content automatically.
- Source: [react-i18next quick start](https://react.i18next.com/guides/quick-start).

### API and caching

- Use native `fetch` for requests, with a small named API client responsible for the base URL, credentials, error handling, and CSRF integration.
- Use TanStack Query for server state: loading, errors, caching, refetching, and mutations. It does not replace the HTTP client or database.
- Configure one `QueryClient` at application startup; service-specific API functions, hooks, and query keys remain in their owning service.
- Set freshness and retry behavior deliberately, based on each kind of data. Invalidate or update relevant queries after mutations.
- Clear user-specific cached data on logout or account switching. Cache is not a source of authorization.
- Source: [TanStack Query defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults).

## 3. Backend stack

| Purpose | Choice |
| --- | --- |
| Framework | Java + Spring Boot |
| Build tool | Maven with Maven Wrapper |
| Authentication and authorization | Spring Security |
| Google sign-in | Spring Security OAuth2 Client |
| Email | Spring Mail and an email provider to be selected |
| ORM and repositories | Spring Data JPA + Hibernate |
| Database | PostgreSQL |
| Database driver | PostgreSQL JDBC driver |
| Connection pool | HikariCP |
| Schema migrations | Flyway with PostgreSQL support |

### Authentication

Support three sign-in methods:

1. Email and password: user persistence, password hashing, registration and password-reset flows.
2. Magic link: one-time tokens, expiry, persistent storage, and delivery by email.
3. Google sign-in: OAuth client credentials, redirect configuration, and mapping provider identities to users.

Spring Security supplies building blocks for these flows; it is not a complete out-of-the-box account product. Application-specific screens, email delivery, account management, and account-linking behavior need implementation. The default one-time-token implementation is in memory; configure persistent storage for deployment. Magic links must expire and be single-use. Rate-limit sensitive endpoints, use generic responses where appropriate, and do not expose tokens in logs.

**Proposed session model:** backend-managed session with a secure, HTTP-only cookie. Configure suitable `SameSite` and HTTPS settings, CSRF protection for state-changing requests, login/logout, and a current-user endpoint. If frontend and API are on different origins, explicitly configure CORS and credentials; consider the resulting cookie restrictions. Clear client-side user data on logout.

**Still to decide:** email provider, Google credentials, session persistence/expiry, registration and recovery policies, and safe linking of Google and existing accounts.

Sources: [Spring Security one-time tokens](https://docs.spring.io/spring-security/reference/servlet/authentication/onetimetoken.html), [OAuth2 login](https://docs.spring.io/spring-security/reference/servlet/oauth2/login/core.html), and [CSRF protection for SPAs](https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html).

### PostgreSQL and migrations

- Use PostgreSQL JDBC to connect; Spring Data JPA and Hibernate provide entity mapping and repositories.
- Spring Boot's JPA starter includes HikariCP for connection pooling.
- Configure database connection details through environment-specific configuration and secrets, not committed credentials.
- Use Flyway migrations as the schema-change mechanism; include PostgreSQL support and avoid relying on Hibernate to modify the production schema.
- Name migrations sequentially, for example `V1__create_users.sql` and `V2__create_interviews.sql`.
- Test persistence and migrations with PostgreSQL using Testcontainers.
- Sources: [Spring Boot SQL](https://docs.spring.io/spring-boot/reference/data/sql.html), [database initialization](https://docs.spring.io/spring-boot/how-to/data-initialization.html), and [Testcontainers](https://docs.spring.io/spring-boot/reference/testing/testcontainers.html).

## 4. Code quality and linting

Start with useful rules and expand them as the team develops conventions.

| Side | Tool | Responsibility |
| --- | --- | --- |
| Frontend | ESLint + TypeScript ESLint | Code quality, unused code, and TypeScript-aware rules |
| Frontend | React Hooks ESLint plugin | Correct Hook usage and dependency checks |
| Frontend | TypeScript strict mode | Type checking; run independently of ESLint |
| Frontend | Prettier + eslint-config-prettier | Consistent formatting without conflicting ESLint rules |
| Backend | Spotless | Consistent Java formatting |
| Backend | Checkstyle | Agreed Java naming and style rules |
| Backend | SpotBugs | Detect potential Java defects; add as appropriate |
| Backend | ArchUnit or Spring Modulith | Check architecture and service boundaries when ready |

Initial rules: fix unused variables and imports, follow React Hook rules, avoid unrestricted `any` with justified exceptions, enforce consistent formatting, and define public service interfaces. Introduce automated frontend import boundaries as the services become clearer. Start with a modest Checkstyle ruleset.

Spring Modulith normally detects modules based on package structure; nested services under `core` require explicit module detection/configuration if they are to be verified as separate modules. Choose that configuration when the actual boundaries are known.

Suggested frontend checks: `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, and `pnpm test`. Define the actual scripts in `package.json` during implementation.

## 5. Testing

Require meaningful unit and integration tests as each service or behavior is developed; do not require a redundant test for every function.

| Test | Proposed tools | Example |
| --- | --- | --- |
| Frontend unit | Vitest | Validation and data transformations |
| Frontend integration | Vitest, React Testing Library, Mock Service Worker | Form, interaction, and API success/error behavior |
| Backend unit | JUnit, Mockito where useful | Business rules and application-service decisions |
| Backend integration | Spring Boot Test, MockMvc, Testcontainers | Endpoint, security, migration, and PostgreSQL behavior |
| End-to-end | Playwright | Important journeys across frontend and backend |

Use Maven Surefire for unit tests and configure Failsafe for `*IT` integration tests so `./mvnw verify` actually runs both. Add end-to-end coverage for important journeys, not necessarily every feature. Coverage can be tracked with JaCoCo, but meaningful assertions matter more than a percentage alone.

## 6. CI, later

CI is required eventually, but can be added after local checks are established. It should run frontend lint, type checking, formatting, tests and build; backend formatting, static analysis, unit/integration tests and build; and selected end-to-end journeys. The same checks should remain runnable locally.

## 7. Open implementation decisions

- Final business service names and allowed dependencies.
- Exact supported languages, fallback, and account preference synchronization.
- Email provider, authentication account-linking policy, and session persistence.
- Deployment topology, frontend/API origins, and environment-specific settings.
- Exact compatible library versions and complete lint configurations, to be pinned when the project is initialized.
- Whether to adopt Spring Modulith or ArchUnit for automated architecture checks.
