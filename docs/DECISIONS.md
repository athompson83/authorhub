# AuthorHub Architecture Decisions

This file indexes major product/architecture decisions. Detailed ADRs live in `docs/adr/`.

| ADR | Decision | Status |
|---|---|---|
| ADR-0001 | Structured canonical manuscript with stable block IDs | Accepted |
| ADR-0002 | Book and edition are separate domain entities | Accepted |
| ADR-0003 | Source-grounded nonfiction is the MVP market wedge | Accepted |
| ADR-0004 | Provider-neutral AI operations with full provenance | Accepted |
| ADR-0005 | Long-running ingestion/AI/rendering work uses durable jobs | Accepted |
| ADR-0006 | One canonical manuscript feeds all export formats | Accepted |
| ADR-0007 | Direct retailer automation is excluded from MVP | Accepted |

## Decision discipline

Create an ADR when changing a decision that is expensive to reverse, affects multiple packages/services, changes data semantics, changes security boundaries, or materially changes product scope.

An ADR should state:
- context
- decision
- alternatives considered
- consequences
- migration/reversal considerations

Do not use ADRs for routine implementation details.
