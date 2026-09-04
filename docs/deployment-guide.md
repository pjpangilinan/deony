# Deony AWS Deployment Guide & Runbook

This guide describes the production AWS deployment architecture for Deony and provides operational runbooks for updates, maintenance, and verification.

---

## 1. Live Deployment Details

| Component | Resource Name / ID | Endpoint / Value |
| :--- | :--- | :--- |
| **Global CDN (CloudFront)** | `E2FBFV25USKQU1` | `https://d1cdomhzh1pe4j.cloudfront.net` |
| **Backend API Gateway (HTTP v2)**| `deony-api` (`9i4pe5nh7d`) | `https://9i4pe5nh7d.execute-api.ap-southeast-1.amazonaws.com/` |
| **Cognito User Pool** | `deony-user-pool` | `ap-southeast-1_Tj0a3lf5F` |
| **Cognito SPA Client** | `deony-web-client` | `7s68msdl6gaukpjt6drtue5jg4` |
| **Frontend Web S3 Bucket** | `deonystack-frontendbucketefe2e19c-xidikzenbqoy` | Private (OAC access only) |
| **Media Covers S3 Bucket** | `deonystack-mediabucketbcbb02ba-v8tobxr33up4` | Private (OAC + Presigned URLs) |
| **API Lambda (Node.js 20 ARM64)**| `deony-api-handler` | Integrated with API Gateway |
| **DynamoDB: User** | `deony-users` | PK: `id`, GSI: `UsernameIndex` |
| **DynamoDB: Category** | `deony-categories` | PK: `id`, GSI: `UserCategoriesIndex` |
| **DynamoDB: Media** | `deony-media` | PK: `id` (`PROVIDER#...` / `MANUAL#...`) |
| **DynamoDB: Experience** | `deony-experiences` | PK: `PK`, SK: `SK`, 4 GSIs |
| **Parameter Store: TMDB** | `/deony/production/tmdb-api-key` | SecureString (Encrypted) |
| **Parameter Store: RAWG** | `/deony/production/rawg-api-key` | SecureString (Encrypted) |

---

## 2. Architectural Best Practices Implemented

1. **Edge URL Rewriting via CloudFront Function**:
   - Rather than using distribution-level error responses (which inadvertently convert API 404/403 responses into HTML), a lightweight edge **CloudFront Function** (`SpaRewriteFunction`) runs in < 1ms on viewer requests.
   - Any request without a file extension (e.g., `/library`, `/timeline`, `/settings`, `/profile/username`) is rewritten to `/index.html` at the edge before hitting the S3 origin.
   - All `/api/*` endpoints pass directly to API Gateway and preserve true JSON HTTP status codes (200, 400, 401, 404, 409, 500).

2. **Single-Domain Topology**:
   - CloudFront serves both the web frontend (`/*`), user media (`/media/*`), and the serverless backend (`/api/*`).
   - Zero CORS issues, zero cross-domain cookie restrictions.

3. **Origin Access Control (OAC)**:
   - S3 buckets block 100% of public access. Only signed CloudFront requests via SigV4 OAC policies can read objects.

4. **Optimistic Locking & Idempotency Invariants**:
   - Lambda backend enforces `#version = :expected_version` concurrency control.
   - Duplicate creation requests with matching `idempotency_key` are gracefully absorbed without creating duplicate rows.

---

## 3. Operational Runbooks

### A. Deploying Frontend Updates
To deploy an updated web build to production:
```powershell
# 1. Build the production React bundle
npm run build

# 2. Sync to the private S3 frontend bucket
aws s3 sync dist/ s3://deonystack-frontendbucketefe2e19c-xidikzenbqoy --delete

# 3. Invalidate CloudFront CDN cache
aws cloudfront create-invalidation --distribution-id E2FBFV25USKQU1 --paths "/*"
```

### B. Deploying Backend / Infrastructure Changes
To deploy changes to the Lambda handler or AWS CDK infrastructure:
```powershell
cd infra
npm run build
npx cdk deploy --require-approval never
```

### C. Updating Provider API Keys
To rotate or update external provider keys in SSM Parameter Store:
```powershell
# TMDB Key
aws ssm put-parameter --name "/deony/production/tmdb-api-key" --value "NEW_KEY" --type "SecureString" --region ap-southeast-1 --overwrite

# RAWG Key
aws ssm put-parameter --name "/deony/production/rawg-api-key" --value "NEW_KEY" --type "SecureString" --region ap-southeast-1 --overwrite
```

---

## 4. Verification & Health Monitoring

- **API Health Check**:
  ```powershell
  Invoke-RestMethod -Uri "https://d1cdomhzh1pe4j.cloudfront.net/api/health" -Method Get
  ```
- **Web SPA Check**:
  ```powershell
  Invoke-WebRequest -Uri "https://d1cdomhzh1pe4j.cloudfront.net/library" -UseBasicParsing
  ```
