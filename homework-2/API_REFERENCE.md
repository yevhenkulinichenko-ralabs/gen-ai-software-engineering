# API Reference

Base URL: `http://localhost:3000`

All request and response bodies are JSON unless otherwise noted. Dates are ISO 8601 strings.

---

## Data Model

### Ticket

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID string | Set on creation, read-only |
| `customer_id` | string | Required on create |
| `customer_email` | email string | Required on create |
| `customer_name` | string | Required on create |
| `subject` | string (1–200 chars) | Required on create |
| `description` | string (10–2000 chars) | Required on create |
| `category` | enum | Required unless `auto_classify: true` — see enums |
| `priority` | enum | Required unless `auto_classify: true` — see enums |
| `status` | enum | Default: `new` |
| `tags` | string[] | Default: `[]` |
| `resolved_at` | ISO date string \| null | Optional |
| `assigned_to` | string \| null | Optional |
| `metadata` | object | Required on create — see below |
| `auto_classify` | boolean | Create-only input; not stored on the ticket |
| `classification` | object | Written by the classifier — see below |
| `classification_overridden` | boolean | Set to `true` when `category` or `priority` is manually changed after classification |
| `created_at` | ISO date string | Set on creation |
| `updated_at` | ISO date string | Updated on every write |

### Metadata object

| Field | Type | Notes |
|-------|------|-------|
| `source` | enum | Required — see enums |
| `browser` | string | Optional |
| `device_type` | enum | Required — see enums |

### Classification object (stored after auto-classify)

| Field | Type | Notes |
|-------|------|-------|
| `confidence` | number 0–1 | Higher = more keyword matches |
| `reasoning` | string | Human-readable explanation |
| `keywords_found` | string[] | Keywords that drove the decision |
| `classified_at` | ISO date string | When classification ran |

---

## Enum Values

| Field | Allowed values |
|-------|----------------|
| `category` | `account_access` `technical_issue` `billing_question` `feature_request` `bug_report` `other` |
| `priority` | `urgent` `high` `medium` `low` |
| `status` | `new` `in_progress` `waiting_customer` `resolved` `closed` |
| `metadata.source` | `web_form` `email` `api` `chat` `phone` |
| `metadata.device_type` | `desktop` `mobile` `tablet` |

---

## Error Responses

**Not found:**
```json
{ "error": "Ticket not found" }
```

**Validation failure (400):**
```json
{ "errors": ["\"category\" is required", "\"customer_email\" must be a valid email"] }
```

---

## Endpoints

### POST /tickets

Create a ticket.

Set `auto_classify: true` to have the system assign `category` and `priority` from the ticket text. When this flag is set, `category` and `priority` must be absent or `null` — providing them returns `400`.

**Request body:**
```json
{
  "customer_id": "cust-001",
  "customer_email": "alice@example.com",
  "customer_name": "Alice Smith",
  "subject": "Cannot login to my account",
  "description": "I forgot my password and cannot access my account since yesterday.",
  "category": "account_access",
  "priority": "high",
  "status": "new",
  "tags": ["login"],
  "metadata": { "source": "web_form", "browser": "Chrome", "device_type": "desktop" }
}
```

**With auto-classify** (omit `category` and `priority`):
```json
{
  "customer_id": "cust-001",
  "customer_email": "alice@example.com",
  "customer_name": "Alice Smith",
  "subject": "Cannot login to my account",
  "description": "I forgot my password and cannot access my account since yesterday.",
  "auto_classify": true,
  "metadata": { "source": "web_form", "device_type": "desktop" }
}
```

**Response: `201 Created`**
```json
{
  "id": "3f7a1b2c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
  "customer_id": "cust-001",
  "customer_email": "alice@example.com",
  "customer_name": "Alice Smith",
  "subject": "Cannot login to my account",
  "description": "I forgot my password and cannot access my account since yesterday.",
  "category": "account_access",
  "priority": "high",
  "status": "new",
  "tags": ["login"],
  "resolved_at": null,
  "assigned_to": null,
  "metadata": { "source": "web_form", "browser": "Chrome", "device_type": "desktop" },
  "created_at": "2024-01-15T10:30:00.000Z",
  "updated_at": "2024-01-15T10:30:00.000Z"
}
```

---

### GET /tickets

List tickets. All parameters are optional and combined with AND semantics.

**Query parameters:**

| Param | Example |
|-------|---------|
| `status` | `?status=new` |
| `category` | `?category=billing_question` |
| `priority` | `?priority=urgent` |
| `customer_id` | `?customer_id=cust-001` |
| `assigned_to` | `?assigned_to=agent-42` |

**Response: `200 OK`** — array of ticket objects (empty array when no matches).

```bash
curl "http://localhost:3000/tickets?status=new&priority=urgent"
```

---

### GET /tickets/:id

Retrieve a single ticket by ID.

**Response: `200 OK`** — ticket object, or `404 Not Found`.

```bash
curl http://localhost:3000/tickets/3f7a1b2c-4d5e-6f7a-8b9c-0d1e2f3a4b5c
```

---

### PUT /tickets/:id

Partially update a ticket. At least one field is required. Read-only fields (`id`, `created_at`) are ignored.

When `category` or `priority` is changed from its current value, the server sets `classification_overridden: true` on the ticket automatically.

**Request body (any subset of writable fields):**
```json
{ "status": "in_progress", "assigned_to": "agent-42" }
```

**Response: `200 OK`** — updated ticket, or `404 Not Found`.

```bash
curl -X PUT http://localhost:3000/tickets/3f7a1b2c-... \
  -H "Content-Type: application/json" \
  -d '{"status": "resolved", "resolved_at": "2024-01-15T12:00:00.000Z"}'
```

---

### DELETE /tickets/:id

Delete a ticket permanently.

**Response: `204 No Content`**, or `404 Not Found`.

```bash
curl -X DELETE http://localhost:3000/tickets/3f7a1b2c-...
```

---

### POST /tickets/:id/auto-classify

Run keyword-based classification on the ticket's `subject` and `description`. Updates the ticket's `category`, `priority`, and `classification` fields in place.

**Response: `200 OK`**
```json
{
  "category": "account_access",
  "priority": "medium",
  "confidence": 0.95,
  "reasoning": "Matched 5 keyword(s) for category \"account_access\"",
  "keywords_found": ["login", "password", "access", "account", "forgot"]
}
```

**`404 Not Found`** if the ticket ID does not exist.

```bash
curl -X POST http://localhost:3000/tickets/3f7a1b2c-.../auto-classify
```

---

### POST /tickets/import

Batch-import tickets. Each record is validated individually — one invalid record does not abort the batch.

**Supported formats:**

| Content-Type | Format notes |
|---|---|
| `application/json` | JSON array of ticket objects |
| `text/csv` | Headers required; tags pipe-separated (`tag1\|tag2`); metadata as flat `metadata_source`, `metadata_browser`, `metadata_device_type` columns |
| `application/xml` or `text/xml` | Root `<tickets>` with `<ticket>` children; tags under `<tags><tag>…</tag></tags>` |

**JSON example:**
```bash
curl -X POST http://localhost:3000/tickets/import \
  -H "Content-Type: application/json" \
  -d '[
    {
      "customer_id": "c1", "customer_email": "alice@example.com",
      "customer_name": "Alice", "subject": "Login issue",
      "description": "Cannot login to my account since the last update.",
      "category": "account_access", "priority": "medium",
      "metadata": { "source": "api", "device_type": "desktop" }
    }
  ]'
```

**CSV example:**
```bash
curl -X POST http://localhost:3000/tickets/import \
  -H "Content-Type: text/csv" \
  --data-binary @demo/sample_tickets.csv
```

**XML example:**
```bash
curl -X POST http://localhost:3000/tickets/import \
  -H "Content-Type: application/xml" \
  --data-binary @demo/sample_tickets.xml
```

**Response: `201 Created`**
```json
{
  "total_records": 3,
  "successful": 2,
  "failed": [
    { "index": 2, "errors": ["\"customer_email\" must be a valid email"] }
  ]
}
```

`failed` is an empty array when all records succeed. `index` is zero-based.
