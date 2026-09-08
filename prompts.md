# User Prompts Log

**Session Date:** 2026-09-04  
**Project:** Cake Selector App - Product & Order Management  

---

## Phase 1: Research (Read-Only)

> "I would like to build a simply products management (e.g. cake) and product order application, that would allow to setup my daughter. Product have properties (Cake have base). Properties have value (base value is light or black etc.). Order is made up of product or products with properties and value. No user-accounts as this works locally at one machine. Data is saved to a file.
>
> This is a fresh project, so research the problem, not a codebase: the simplest approach that could work, working web application with clear ui. Let's think about tech stack later.
>
> Report: the approach you would take, what to reuse, and what was unclear enough that you had to guess. Ask me about the guesses — do not resolve them yourself."

---

## Phase 2: Product Decisions

> "Property scope: it is always product-specific.  
> Order records: Order records should be who ordered, name only. 
> Product mutability: My daughter and edit products after orders exist, but changes is not affect existing order.
> Pricing: No price now, maybe late.
> Order quantities: Order can contain the same product twice with different property selections
> Finalization UX: Orders require steps Add item, edit item, save."

> "File persistence: SQLite is used for data.
> Tech stack: Use simple web UI
> Order editing: After an order is saved, she be able to edit, delete and view?"

> "Edit customer name and add and remove items in existing order"

---

## Phase 3: PRD

> "Ok, make PRD at specs folder, do not yet use @specs/TEMPLATE.md"

---

## Phase 4: Prompts Documentation

> "Create prompts.md with my prompts. use following steps 
> 1 · Research (read-only)
> 2 · Product decisions
> 3 · PRD"

> "I what only my prompts, not result"

---

## Phase 5: Feature Specs (2026-09-05)

> "Write the spec: Product management first"

> "Edit PRD and product management spec. If a product is in order, then the product is not able to deleted."

> "Do not do other changes"

> "Write the spec: Property Value Management
> Ground it in the research pass findings. Write
> specs/features/«feature».md using the spec template structure.
> Acceptance criteria as Given/When/Then, numbered AC1, AC2, …
> Every one names a precise expected value or output — never
> "a sensible message", never "works correctly".
> Then run the Spec Readiness checklist and show the result
> item by item."

> "Edit PRD and property value management spec. A existing value of property is not able to deleted, only edited. Do not do other changes. Do not guest."

> "Write the spec: Order Creation
> Ground it in the research pass findings. Write
> specs/features/«feature».md using the spec template structure.
> Acceptance criteria as Given/When/Then, numbered AC1, AC2, …
> Every one names a precise expected value or output — never
> "a sensible message", never "works correctly".
> Then run the Spec Readiness checklist and show the result
> item by item."

> "Write the spec: Order Editing
> Ground it in the research pass findings. Write
> specs/features/«feature».md using the spec template structure.
> Acceptance criteria as Given/When/Then, numbered AC1, AC2, …
> Every one names a precise expected value or output — never
> "a sensible message", never "works correctly".
> Then run the Spec Readiness checklist and show the result
> item by item.

> Do not do other changes"

> "Write the spec: Order History
> Ground it in the research pass findings. Write
> specs/features/«feature».md using the spec template structure.
> Acceptance criteria as Given/When/Then, numbered AC1, AC2, …
> Every one names a precise expected value or output — never
> "a sensible message", never "works correctly".
> Then run the Spec Readiness checklist and show the result
> item by item."

> "Edit PRD and Order History spec. Order is not able to edit in Order History page, only view and delete. Do not do other changes. Do not guest."

> "Why Order Item Management feature is needed? Do not do changes, only answer question"

> "Edit PRD and delete Order Item Management. Do do not do other changes and do not guest."

> "Update prompts.md with my today's prompts to following Phase 4 · Feature specs. Add only my today's prompts, not result"

---

## Phase 6: Architecture & Test Plans (2026-09-07)

> "Write the spec: «feature»

> Ground it in the research pass findings. Write
> specs/features/«feature».md using the spec template structure.

> Acceptance criteria as Given/When/Then, numbered AC1, AC2, …
> Every one names a precise expected value or output — never
> "a sensible message", never "works correctly".

> Then run the Spec Readiness checklist and show the result
> item by item."

> "Product management first"

> "Do not overwrite Product Management details"

> "Yes and rename Product Management files too"

> "Product Management"

> "Order Creation. Do not overwrite Product Management details"

> "Order Editing with own files"

> "Property Value Management with own files"

> "Order History with own files"

> "Update prompts.md with missing prompts to following Phase 5 · Feature specs. Add only missing prompts, not result. Keep earlier prompts"

---

## Phase 7: Implementation - TDD Workflow (2026-09-07)

> "fix the AC4 product edit modal. Replace prompt() with a proper modal dialog"

> "Start Task 2.5: delete product confirmation modal."

> "Start Task 2.6: Add Property Form"

> "Start Task 2.7: Delete Property"

> "Start Task 2.8: Add/Delete Property Values"

> "Start Task 3.1: CSS for Products tab"

> "Add my today's prompts to prompts.md. Do not add result."

---

## Phase 8: Document Consolidation & Task Implementation (2026-09-07 continued)

> "Read product-management.md and property-value-management.md. Are every feature of property-value-management included in product-management?"

> "Is better to keep separate files?"

> "Merge them"

> "Should TASKS-property-value-management be merged into TASKS-product-management too?"

> "Merge them"

> "Should architecture-property-value-management be merged to architecture-product-management?"

> "Merge them"

> "Should test-plan-property-value-management be merged to test-plan-product-management too?"

> "Merge them"

> "Implement Task 2.9"

> "Merge product-management.md and property-value-management.md into single file"

> "Merge TASKS-property-value-management into TASKS-product-management"

> "Merge test-plan-property-value-management into test-plan-product-management"

> "Merge architecture-property-value-management into architecture-product-management"

> "Add missing prompts to prompts.md to phase Merge property-value-management to product-management. Do not add result."

---

## Phase 9: Order Creation Implementation (2026-09-08)

### Task Planning & Workflow

> "Read TASKS-order-creation.md and specs/features/order-creation.md.
> 
> Which task is next? Restate it in one line, name the AC it
> serves, and name the test that will prove it (from the testing
> strategy).
> 
> If it is a new feature with no spec yet, stop: it goes through
> the spec workflow first.
> 
> Do not write code or tests yet."

### TDD Red-Green-Refactor Cycle

> "Run the `tdd` workflow from @AGENTS.md for AC«N» in
> specs/features/order-creation.md.
> 
> RED first: write the failing test for this AC only. The test
> name states the AC. Run it and paste the real output. Confirm
> it fails because the behaviour is missing — not because of an
> import, path or fixture.
> 
> Only then GREEN: the smallest change that passes it. Run ALL
> tests and show the summary.
> 
> Then REFACTOR with the tests green.
> 
> Stop after this AC. Do not start the next one."

### User Testing & Verification

> "Start the app (the command is in @AGENTS.md) and try AC«N»
> as a user would.
> 
> If you have a browser tool, open the app in it and walk
> through the AC: click, type, read the screen, take a
> screenshot. If this is a CLI, run it with real input.
> 
> Report exactly what you did and what you saw — the inputs
> and the outputs. List every difference from the AC.
> 
> Do not fix anything yet."

### Code Review & Validation

> "Run all tests and show the summary.
> 
> Then run the `review` workflow from @AGENTS.md on the changes
> since the last commit: for each change, which AC it serves;
> what changed that no AC asked for; which test proves what.
> 
> Also audit: input validation, error paths, and everything the
> spec named under Risk.
> 
> End with APPROVED or CHANGES_REQUIRED and a numbered list of
> what must change."

### Fix & Iterate

> "Fix the CHANGES_REQUIRED items from the review, one at a
> time, each through the `tdd` workflow — red first.
> 
> Then run all tests and the `review` workflow again.
> 
> Stop when the verdict is APPROVED, or after two rounds without
> progress — then tell me what is stuck instead of trying a
> third time."

### Backend & Database Verification

> "Run the `tdd` workflow from @AGENTS.md for AC1 in specs/features/order-creation.md.
>
> Before I sign this off:
> 1. Make the smallest possible wrong change to the code that tests/«file» covers. Run the test. It MUST fail — if it passes, say so and state what the test actually asserts. Restore the code: git diff --quiet — «file»
> 2. Mark the task done in TASKS-order-creation.md and the AC status in the spec.
> 3. Commit with a message that names the AC.
> 4. Show me what is next in TASKS-order-creation.md."

> "quickly mark completed backend tasks as done"

### Frontend Development

> "implement Task 2.1"

> "implement Task 2.2"

### Phase 2 Complete & Phase 3 Start

> "implement Phase 3"

### Prompts Documentation

> "Add prompts to prompts.md to phase Order creation implementation. Do not add result."
