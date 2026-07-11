# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start              # Production server on port 3000
npm run dev            # Auto-reload with nodemon
npm test               # Jest unit/functional tests with coverage (excludes live-server tests)
npm run test:watch     # Tests in watch mode
npm run test:integr    # Integration tests against a live server (auto-starts/stops server)
npm run test:e2e       # E2E tests against a live server (auto-starts/stops server)
npm run test:perf      # Performance benchmarks against a live server (auto-starts/stops server)
```

Integration, E2E, and performance tests start the server automatically, wait for it to be ready, run the suite, then shut it down:
```bash
npm run test:integr
npm run test:e2e
npm run test:perf
```

To run a single test file:
```bash
npx jest tests/test_ticket_api.test.js
```

## Architecture

Layered Express API with strict separation of concerns. All data lives in an in-memory `Map` — there is no database.

```
src/
├── app.js                              Express setup + dual body parsers
├── server.js                           HTTP entry point
├── routes/tickets.js                   Route definitions; wires validation middleware before controllers
├── controllers/ticketsController.js    Thin HTTP layer (TicketsController class)
├── middleware/validation.js            Joi middleware; runs before controllers, sets req.validatedBody
├── schemas/ticketSchema.js             Joi createSchema / updateSchema + all enum constants
├── services/
│   ├── ticketsService.js               Business logic — TicketsService class
│   ├── classificationService.js        Keyword-based auto-classification (no class, plain function)
│   └── parsers/
│       ├── parserStrategy.js           Selects parser by Content-Type header
│       ├── jsonParser.js               JsonParser class — expects a JSON array
│       ├── csvParser.js                CsvParser class — flattens metadata_* columns, pipe-delimited tags
│       └── xmlParser.js               XmlParser class — async xml2js, normalises explicitArray output
└── repositories/
    └── ticketsRepository.js            TicketsRepository class — holds the Map, supports equality filters
```

### Naming convention
When naming classes that operate with the class of objects, use plural form of these objects like TicketsService, TicketsController. Reflect this logic in file names.

### Key cross-cutting rules

- **Import route**: `POST /tickets/import` bypasses the Joi validation middleware. Each record is validated individually inside `TicketsService.importTickets` so one bad record never aborts the batch. The response is always `201` with `{ total_records, successful, failed: [{ index, errors }] }`.
- **Body parsing**: `express.json()` covers JSON; `express.text({ type: ['text/csv','application/xml','text/xml'] })` captures the raw string passed to the parser strategy. The import controller reads `Content-Type` to pick the parser.
- **CSV column conventions**: metadata fields are flat columns (`metadata_source`, `metadata_browser`, `metadata_device_type`); tags are pipe-separated (`tag1|tag2`). `CsvParser` normalises both before validation.
- **XML conventions**: root element must be `<tickets>` with `<ticket>` children; tags go under `<tags><tag>…</tag></tags>`.
- **Singleton exports**: `TicketsRepository`, `TicketsService`, and `TicketsController` each export `new ClassName()`. The repository's `clear()` method is used in tests to reset state between cases.
- **Enum constants** (`CATEGORIES`, `PRIORITIES`, `STATUSES`, etc.) are exported from `ticketSchema.js` and should be imported from there rather than redefined elsewhere.
