# Phase 1: Core Data Foundation

## Overview
Phase 1 establishes the foundational data structures and services required for serialized item tracking and warehouse topology. This phase focuses on the "Source of Truth" for inventory and locations, ensuring strict data integrity and a robust state management system for serialized units.

## Goals
- Initialize the backend infrastructure (Fastify, Prisma, TypeScript).
- Define the core domain models: `SerializedUnit`, `Location`, and `SKU`.
- Implement a deterministic State Machine for `SerializedUnit` status transitions.
- Expose a basic API for serial lookup and hierarchical location navigation.

## Technical Stack (Phase 1 Focus)
- **Runtime:** Node.js 22 (LTS)
- **Framework:** Fastify 5
- **Language:** TypeScript 5.7
- **Database:** PostgreSQL 17
- **ORM:** Prisma 6
- **Validation:** TypeBox (Fastify native) or Zod

---

## Execution Steps

### 1. Project Initialization
- [ ] Initialize `package.json` with ESM support.
- [ ] Configure `tsconfig.json` for strict type checking and Node 22 targets.
- [ ] Install core dependencies: `fastify`, `@prisma/client`, `typescript`, `zod`.
- [ ] Install development dependencies: `prisma`, `tsx`, `vitest` (for testing).
- [ ] Set up basic Fastify server structure with a health check endpoint.

### 2. Schema Definition (Prisma)
- [ ] **SKU Model:**
  - `id`, `code` (unique), `name`, `description`.
  - Metadata for dimensions/weight (optional for Phase 1).
- [ ] **Location Model:**
  - `id`, `code` (unique), `type` (WAREHOUSE, ZONE, ASRS, BIN).
  - `parentId` (Self-relation for hierarchy).
  - `path` (Materialized path or LTREE for efficient tree traversal).
- [ ] **SerializedUnit Model:**
  - `id`, `serialNumber` (unique), `skuId` (FK).
  - `locationId` (FK, nullable for "In-Transit" or "Shipped").
  - `status` (Enum: INBOUND, IN_STOCK, ALLOCATED, PICKED, SHIPPED, QUARANTINE).
  - `lastSeenAt`, `createdAt`, `updatedAt`.

### 3. State Machine Implementation
- [ ] Define valid status transitions for `SerializedUnit`.
  - Example: `INBOUND` -> `IN_STOCK` (Allowed), `IN_STOCK` -> `SHIPPED` (Denied without picking).
- [ ] Create a `StatusManager` service to encapsulate transition logic and validation.
- [ ] Implement middleware/hooks to prevent unauthorized status updates via Prisma.

### 4. Database Migrations
- [ ] Create initial migration for SKU and Location tables.
- [ ] Create migration for SerializedUnit table.
- [ ] Seed script for basic location hierarchy (1 Warehouse -> 2 Zones -> 1 ASRS -> 10 Bins).

### 5. API Development
- [ ] **Serial Lookup:** `GET /v1/units/:serialNumber`
  - Returns unit status, SKU details, and current location path.
- [ ] **Location Navigation:** `GET /v1/locations/:code`
  - Returns location details and its immediate children.
- [ ] **Location Hierarchy:** `GET /v1/locations/:code/tree`
  - Returns a recursive tree structure (limited depth).

---

## Success Criteria
- [ ] Prisma client can perform type-safe CRUD operations on all core models.
- [ ] `SerializedUnit` status cannot be changed to an invalid state (validated by tests).
- [ ] API successfully returns a full breadcrumb path for a unit (e.g., `WH-01 > ZONE-A > ASRS-01 > BIN-102`).
- [ ] Initial migrations run successfully on a clean PostgreSQL instance.

## Verification Plan
- **Unit Tests:** Test the `StatusManager` for all valid/invalid transitions.
- **Integration Tests:** API endpoints for serial lookup and location navigation using a test database.
- **Manual Verification:** Use `curl` or a REST client to navigate the seeded location hierarchy.
