# Roadmap: WMS (Industrial Serialized)

## Phase 1: Core Data Foundation
- **Goals:** Establish the primary data structures for serialized items and warehouse topology.
- **Requirements:** SER-01, SER-03
- **Success Criteria:**
  - Database can store unique serial numbers with associated metadata (SKU, status, location).
  - A complete location hierarchy (Warehouse > Zone > ASRS > Bin) is navigable via API.
  - Serial status transitions (e.g., Inbound -> In-Stock) are validated by a state machine.

## Phase 2: Serial Capture & Identification
- **Goals:** Implement hardware-agnostic scanning and identification logic.
- **Requirements:** SER-02
- **Success Criteria:**
  - System successfully parses 1D/2D barcodes and RFID payloads into serial strings.
  - Hardware abstraction layer correctly handles input from various scanning devices.
  - Duplicate or invalid serial formats are rejected at the point of capture.

## Phase 3: ERP Integration (Inbound)
- **Goals:** Connect to SAP/NetSuite to pull master data and inbound expectations.
- **Requirements:** INT-01 (Inbound), INB-01
- **Success Criteria:**
  - ASNs (Advance Shipping Notices) are automatically synchronized from the ERP.
  - Master SKU data (dimensions, weights, HAZMAT status) is cached locally for warehouse operations.
  - ERP connection health is monitored with real-time alerting.

## Phase 4: Inbound Receiving Workflows
- **Goals:** Develop the UI and logic for physical receiving and validation.
- **Requirements:** INB-02, SER-03 (Updates)
- **Success Criteria:**
  - Operators can perform "dock-to-stock" receiving by scanning physical units against an ASN.
  - The system generates a discrepancy report for overages, shortages, or damaged serials.
  - Received units are immediately visible in the "Inbound" status queue.

## Phase 5: ASRS Orchestration (Inbound)
- **Goals:** Integrate with PLC controllers to automate put-away.
- **Requirements:** ASRS-01, ASRS-03 (Inbound Sync), INB-03
- **Success Criteria:**
  - WMS suggests optimal bin locations based on item dimensions and ASRS utilization.
  - Put-away commands are successfully transmitted to the PLC via OPC-UA/MQTT.
  - Bin status in the WMS updates automatically upon PLC confirmation of physical placement.

## Phase 6: Order Ingestion & ERP Integration (Outbound)
- **Goals:** Harmonize outbound orders from ERP and e-commerce channels.
- **Requirements:** INT-01 (Outbound), INT-03, OUT-01
- **Success Criteria:**
  - Orders from Shopify/Amazon and ERP are merged into a prioritized fulfillment queue.
  - Specific serial numbers are reserved (allocated) for orders based on FIFO/FEFO logic.
  - Order status updates are pushed back to the originating channel in real-time.

## Phase 7: ASRS Orchestration (Outbound)
- **Goals:** Automate retrieval of serialized items for picking.
- **Requirements:** ASRS-02, ASRS-03 (Outbound Sync)
- **Success Criteria:**
  - WMS triggers automated retrieval tasks for allocated serials.
  - Items are successfully moved from ASRS bins to the physical picking face.
  - Real-time bin inventory updates are reflected as items are extracted.

## Phase 8: Fulfillment & Picking Validation
- **Goals:** Ensure zero-error picking and packing.
- **Requirements:** OUT-02, OUT-03
- **Success Criteria:**
  - System prevents packing if the scanned serial does not match the allocated order line.
  - The packing UI guides consolidation of multi-item orders into single or multiple boxes.
  - Weight and dimension validation occurs at the packing station to ensure accuracy.

## Phase 9: Shipping & Carrier Integration
- **Goals:** Automate label generation and final shipment confirmation.
- **Requirements:** INT-02, OUT-04
- **Success Criteria:**
  - UPS/FedEx/Freight labels are generated automatically upon packing completion.
  - Carrier tracking numbers are assigned and transmitted to the customer and ERP.
  - Manifests are generated and transmitted to carriers electronically.

## Phase 10: Audit, Compliance & Reporting
- **Goals:** Implement full traceability and inventory accuracy tools.
- **Requirements:** AUD-01, AUD-02, AUD-03
- **Success Criteria:**
  - Every movement of every serial number is recorded in an immutable audit log.
  - Cycle count tasks can be performed by scanning all serials in an ASRS bin.
  - User activity logs provide a clear trail of accountability for every warehouse action.
