## 1. CONTEXT

### Task Specification
Create a REST API for support tickets with these endpoints:
- `POST /tickets` - Create a new support ticket
- `POST /tickets/import` - Bulk import from CSV/JSON/XML
- `GET /tickets` - List all tickets (with filtering)
- `GET /tickets/:id` - Get specific ticket
- `PUT /tickets/:id` - Update ticket
- `DELETE /tickets/:id` - Delete ticket

### Ticket Model Schema
```json
{
  "id": "UUID",
  "customer_id": "string",
  "customer_email": "email",
  "customer_name": "string",
  "subject": "string (1-200 chars)",
  "description": "string (10-2000 chars)",
  "category": "account_access | technical_issue | billing_question | feature_request | bug_report | other",
  "priority": "urgent | high | medium | low",
  "status": "new | in_progress | waiting_customer | resolved | closed",
  "created_at": "datetime",
  "updated_at": "datetime",
  "resolved_at": "datetime (nullable)",
  "assigned_to": "string (nullable)",
  "tags": ["array"],
  "metadata": {
    "source": "web_form | email | api | chat | phone",
    "browser": "string",
    "device_type": "desktop | mobile | tablet"
  }
}
```

### Functional Requirements & Constraints
- **Parser Pipeline**: Native parsing support for CSV, JSON, and XML file formats on the `/tickets/import` endpoint. Use Content-Type header to specify which format has the uploaded file.
- **Strict Validation**: Validate all incoming fields strictly according to the schema rules (e.g., regex for email structure, exact string length minimums/maximums, and explicit enum boundaries).
- **Bulk Import Summary Response**: The import execution must return a clean, structured JSON summary tracking transactional results:
  ```json
  {
    "total_records": 0,
    "successful": 0,
    "failed": [
      {
        "index": 0,
        "errors": ["Error detail message string"]
      }
    ]
  }
  ```
- **Error Boundaries**: Handle malformed files, syntax failures, or parser breakdown gracefully without yielding unhandled 500 crashes.
- **HTTP Status Alignment**: Use specialized REST status code mappings (e.g., `201 Created` for creations/successful batch processing, `400 Bad Request` for parsing/validation crashes, `404 Not Found` for missing resources).

---

## 2. MODEL

### Role & Objective
You are an expert Backend Engineer specializing in clean, highly secure, and production-ready RESTful services. Your task is to process the context layer guidelines into an production-grade architecture.

### Engineering & Coding Standards
- **Data store**: all data needs to be stored in memory. The data store needs to support an option to filter the list by different fields.
- **Separation of Concerns**: Decouple logic cleanly into standard structural tiers (Controllers, Services/Parsers, Data Validation Schemas, and Repositories/Stores).
- **Dedicated Parser Strategies**: Implement file format parsing outside of the core controller. Leverage a Strategy pattern to isolate JSON, CSV, and XML string/stream processing.
- **Middleware Isolation**: Input and payload structural validation must be handled before hitting business operations.
- **Type Safety**: Provide rigorous schema rules and exact types for all object layers and validation interfaces.

### Output Formatting Constraints
- Return full, production-ready implementation scripts without placeholder shortcuts or missing logic blocks.
- Don't include excessive comments for obvious parts of the implementation.

---

## 3. PROMPT

### Command Instruction
Generate the complete implementation for the Task Specification utilizing **JavaScript** and **Express** for the implementation. Provide the complete file structure, the specific parsing layers handling CSV, JSON, and XML inputs, and showcase how validation errors are gathered and formatted into the final bulk summary block.