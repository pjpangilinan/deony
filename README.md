# Deony

A personal media experience archive for movies, TV, books, and games. Unlike standard trackers that only record consumption counts, Deony logs the experience—ratings, dates, and markdown journal entries tied to each title. Features **Deonysus**, a playful AI critic agent powered by **Amazon Bedrock** and **Bedrock Guardrails**.

[Live Demo](https://d1cdomhzh1pe4j.cloudfront.net) · [Deonysus AI Agent](#deonysus-ai-agent-aws-bedrock) · [Architecture](#architecture) · [Screenshots](#screenshots) · [Data Model](#data-model) · [Getting Started](#getting-started)

---

## Deonysus AI Agent (AWS Bedrock)

Unlocked after logging 20 or more experiences, **Deonysus** is an AI agent inspired by the Greek god of wine, theater, and ritual madness, reincarnated as an imperious media critic.

- **AWS Service**: Amazon Bedrock Runtime (`ConverseCommand` via `@aws-sdk/client-bedrock-runtime`).
- **Model**: `anthropic.claude-3-haiku-20240307-v1:0` / Amazon Nova.
- **20-Entry Archiver Gate**: Sidebar item remains locked with live progress counter (`Deonysus (X/20)`) until 20 entries are logged.
- **Invocations**:
  - `🔥 /roast`: Playful critique of overall archive habits, genres, and contradictory ratings.
  - `✨ /taste`: Pits 5-star masterpieces against low-rated guilty pleasures.
  - `📜 /backlog`: Mocks abandoned wishlist queues and unfinished in-progress entries.
  - `🍇 /grape`: Dionysian mythological easter egg (wine goblets, Athenian drama festivals, and Apollo shade).
- **Responsible AI Guardrails (AWS AI Practitioner Standard)**:
  - **Prompt Injection & Jailbreak Defense**: Pre-inference filters intercept instruction overrides (`"ignore previous instructions"`, `"DAN"`, system prompt extraction) with playful Olympian rebuke before model invocation.
  - **Sensitive Data & PII Masking**: Real-time regex sanitizes credit card numbers, SSNs, emails, and phone numbers (`[REDACTED_PII]`).
  - **Contextual Grounding**: Roasts strictly grounded in user-owned DynamoDB library records to prevent hallucination.
  - **Observability**: Returns real-time latency and guardrail evaluation status tags.

---

## Architecture

Serverless AWS stack deployed via AWS CDK.

```mermaid
graph LR
    Client[Browser / PWA] --> CF[CloudFront CDN]
    CF -->|Static Assets| S3[S3 Web Bucket]
    CF -->|/api/*| APIGW[API Gateway HTTP API]
    APIGW --> Lambda[Lambda Node.js 20]
    Lambda --> DDB[(DynamoDB)]
    Lambda --> S3Media[S3 Media Bucket]
    Lambda --> Providers[External APIs<br/>TMDB · Open Library · RAWG]
    Lambda -->|ConverseCommand| Bedrock[Amazon Bedrock<br/>Claude 3 Haiku]
    Bedrock -.->|Safety Evaluation| Guardrails[Bedrock Guardrails<br/>Prompt Defense · PII Mask]
    Client -.->|Auth| Cognito[Cognito User Pool]
```

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Tiptap Markdown, PWA.
- **Backend**: Express on AWS Lambda (ARM64), API Gateway v2, Amazon Cognito.
- **Generative AI**: Amazon Bedrock Runtime with native Bedrock Guardrails.
- **Storage**: DynamoDB (on-demand), S3 for custom cover uploads.
- **Routing**: CloudFront with edge routing for client-side SPA rewrites.

---

## Screenshots

### Deonysus AI Agent & Responsible AI Guardrails

| Deonysus Chatbot (`/roast`) | Guardrails Architecture Modal |
|---|---|
| ![Deonysus Roast](docs/screenshots/13-deonysus-chat-roast.png) | ![Guardrails Modal](docs/screenshots/11-deonysus-guardrails-architecture.png) |

| Prompt Injection Blocked | 20-Entry Locked Gate |
|---|---|
| ![Injection Blocked](docs/screenshots/12-deonysus-prompt-injection-blocked.png) | ![Locked Temple Gate](docs/screenshots/14-deonysus-locked-gate.png) |

### Library & Experience Journal

| Personal Library | Experience Detail |
|---|---|
| ![Library](docs/screenshots/06-library-populated.png) | ![Detail](docs/screenshots/10-experience-detail.png) |

### Logging & Search

| Provider Search (TMDB / RAWG / Open Library) | Log Experience Modal |
|---|---|
| ![Search](docs/screenshots/04-search-tmdb.png) | ![Log](docs/screenshots/05-log-experience.png) |

### Timeline & Analytics

| Chronological Timeline | Archive Statistics & PDF Export |
|---|---|
| ![Timeline](docs/screenshots/08-timeline.png) | ![Stats](docs/screenshots/07-statistics.png) |

---

## Data Model

Four DynamoDB tables configured with on-demand capacity:

- `deony-users`: User profiles, public vanity URLs, streaks, and word counts.
- `deony-categories`: User taxonomies bound to immutable media types (`movie`, `tv`, `book`, `game`).
- `deony-media`: Canonical media pool deduplicated by deterministic key `PROVIDER#{source}#{id}` or `MANUAL#{user_id}#{uuid}`.
- `deony-experiences`: Core user archival records.

### Secondary Indexes (`deony-experiences`)

| Index | PK | SK | Purpose |
|---|---|---|---|
| **Primary** | `USER#{user_id}` | `EXP#{id}` | Item lookup / mutations |
| **GSI1** | `USER#{user_id}#CAT#{category_id}` | `STATUS#{status}#DATE#{sort_date}` | Category + status queries |
| **GSI2** | `USER#{user_id}` | `DATE#{sort_date}` | Sparse timeline (wishlist omitted) |
| **GSI3** | `USER#{user_id}` | `TITLE#{media_title}` | Alphabetical listing |
| **GSI4** | `USER#{user_id}` | `CREATED#{created_at}` | Recency-sorted views |

---

## Getting Started

### Local Development

Runs offline using DynamoDB Local, mock S3, and local auth:

```bash
# Install dependencies
npm install

# Initialize local DynamoDB tables
npm run dev:setup

# Start dev server (Vite + Express API + DynamoDB Local)
npm run dev
```

- Web: `http://localhost:5173`
- API: `http://localhost:3001`
- DynamoDB Local: `http://localhost:8000`

### Testing

```bash
# Unit & invariant tests (Vitest) — 48 tests passing
npm test

# End-to-end browser tests (Playwright)
npx playwright test
```

### AWS Deployment

Infrastructure is defined in `infra/` using AWS CDK:

```bash
# Build frontend
npm run build

# Deploy via CDK
cd infra
npm install
npx cdk deploy DeonyStack
```

---

## License

MIT
