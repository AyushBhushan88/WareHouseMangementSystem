# Research Summary: WMS (Industrial Serialized)

## Project Overview
This project focuses on building a high-throughput, industrial-scale Warehouse Management System (WMS) optimized for **unit-level serialized item tracking** and **ASRS (Automated Storage and Retrieval System) coordination**. The system bridges the gap between high-level ERP business logic and low-level physical automation.

## 1. Core Architecture & Strategy
The architecture is designed for **zero-error synchronization** between physical storage and enterprise financial records.
- **WMS Engine:** Acts as the "source of truth" for inventory location and serial status.
- **Industrial Integration (The Bridge):** Uses **Node-OPCUA** and **MQTT** to communicate directly with PLC controllers for real-time hardware execution.
- **Enterprise Integration:** Synchronizes bidirectionally with ERPs like SAP/NetSuite and e-commerce platforms like Shopify/Amazon.
- **Data Flow:** Follows a strict "Chain of Custody" for serialized items from Inbound (ASN validation at induction) to Outbound (allocation, picking, and shipping confirmation).

## 2. 2025 Tech Stack
| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Backend** | Node.js 22 + Fastify 5 | High performance, sub-millisecond overhead for industrial I/O. |
| **Database** | PostgreSQL 17 + Prisma 6 | Strict ACID compliance for serialized integrity; JSONB for ASRS metadata. |
| **Streaming** | Redpanda | Kafka-compatible, low-latency event bus for logging every item movement. |
| **IoT** | Node-OPCUA / MQTT | Industry standards for ASRS bin control and sensor telemetry. |
| **Frontend** | React 19 + TanStack Query | Critical UI responsiveness for warehouse tablets. |
| **Infrastructure** | K3s (Edge) + Cloud | Hybrid strategy ensures warehouse operations continue if internet fails. |

## 3. Key Features & Differentiators
- **Must-Haves:** Unit-level serial tracking, ASRS orchestration, real-time ERP sync, and zero-error picking/packing.
- **Competitive Edge:** Nested aggregation (Parent-Child tracking), digital genealogy for component-level tracking, and predictive slotting for ASRS optimization.
- **Anti-Features:** Not building low-level PLC logic, manual picking optimizations, or customer-facing e-commerce storefronts.

## 4. Critical Pitfalls & Mitigations
- **Throughput Bottlenecks:** ASRS hardware often outpaces WMS processing. **Mitigation:** Asynchronous validation and in-memory caching (Redis) for active serials.
- **"Ghost" Inventory:** Divergence between ERP and WMS stock. **Mitigation:** Event-driven architecture where WMS is the absolute source of truth for location.
- **Exception Handling:** Discrepancies (e.g., Serial A expected, Serial B scanned) can hang automation. **Mitigation:** Physical "Audit Spurs" and robust state machine recovery.
- **Label Inconsistency:** Varying vendor standards lead to scan failures. **Mitigation:** Internal relabeling and normalized regex-based barcode parsing.

## 5. Implementation Roadmap
- **Phase 1:** Foundation (SerializedUnit and Location models).
- **Phase 2:** ERP & Channel Ingestion (Inbound/Order pipelines).
- **Phase 3:** Hardware Bridge (OPC UA integration).
- **Phase 4:** Fulfillment Workflows (Packing & Carrier APIs).
- **Phase 5:** Auditing & Analytics.

---
*Generated for WMS (Industrial Serialized) - March 2025*
