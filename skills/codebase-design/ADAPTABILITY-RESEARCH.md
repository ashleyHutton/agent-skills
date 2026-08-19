# Adaptability research provenance

Status: provenance companion to [ADAPTABILITY.md](ADAPTABILITY.md), not runtime instructions.

Research updated: 2026-08-19

## Scope

The source subject is Chapter 5, “Bend, or Break,” of David Thomas and Andrew Hunt's *The Pragmatic Programmer: Your Journey to Mastery, 20th Anniversary Edition* (Addison-Wesley/Pearson, 2020).

These notes record which parts of `ADAPTABILITY.md` are supported by Chapter 5, which rely on secondary interpretation, and which are explicit synthesis with the codebase-design vocabulary. They paraphrase rather than reproduce the book. They do not turn whole-book advice or Ashley/project preferences into Chapter 5 guidance.

## Evidence hierarchy

### Primary publisher evidence

1. Pragmatic Bookshelf, [book page and table of contents](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/)
   - Identifies the edition and Chapter 5.
   - Confirms its five topics: Decoupling; Juggling the Real World; Transforming Programming; Inheritance Tax; Configuration.
   - Links publisher extracts and downloadable source code.

2. Pragmatic Bookshelf, [official tips page](https://pragprog.com/tips/)
   - Tips 44–55 align with Chapter 5.
   - Directly supports reducing coupling; command-oriented collaboration (“tell, don't ask”); avoiding deep method chains and global data; wrapping unavoidable global state behind an API; viewing programs as input/output transformations; passing state instead of hoarding it; avoiding inheritance tax; using interfaces for polymorphism, delegation for capability reuse, and mixins for shared functionality; and externalizing values that can change after deployment.
   - The slogans are evidence for principles, not complete implementation rules or numeric thresholds.

3. Pragmatic Bookshelf, [authorized “Inheritance Tax” extract](https://media.pragprog.com/titles/tpp20/inheritance-tax.pdf)
   - Direct publisher-supplied chapter text.
   - Explains inheritance's coupling cost and distinguishes alternatives by intent: interfaces/protocols for polymorphism, delegation/composition for a has-a relationship, and mixins/traits for sharing functionality.

4. Publisher source code linked from the [official book page](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/)
   - Includes examples associated with Topic 29 and event-related mechanisms.
   - It is a primary artifact, but code supplies less explanatory context than chapter prose. It therefore gives medium rather than high support for runtime selection guidance involving finite-state machines, observer, publish/subscribe, and reactive/event streams.

### Secondary evidence

1. Ben Steadman, [“TPP Topic 29: Juggling the Real World”](https://dev.to/steadbytes/tpp-topic-topic-29-juggling-the-real-world-35kh) (2019)
   - Public reader exercise notes corroborating finite-state machines, observer/publish-subscribe approaches, and event streams as distinct tools for event-oriented problems.
   - Exercise solutions and selection details are the reader's interpretation, not authoritative chapter text.

2. Ben Steadman, [“TPP Topic 30: Transforming Programming”](https://dev.to/steadbytes/tpp-topic-topic-30-transforming-programming-39db) (2019)
   - Public reader exercise notes corroborating input-to-output framing and composition of compatible transformations.
   - Preferences concerning free transformations, fluent interfaces, and pipeline error representation are interpretation rather than publisher guidance.

3. Dan Lebrero, [“Book notes: The Pragmatic Programmer, 20th Anniversary Edition”](https://dev.to/danlebrero/book-notes-the-pragmatic-programmer-20th-anniversary-edition-jkm) (2020)
   - A compressed reader summary corroborating Chapter 5's themes of decoupling, events, transformations, and inheritance costs.
   - Used only as secondary confirmation.

### Unofficial derivative interpretation

ciembor/agent-rules-books, [“The Pragmatic Programmer” rules file](https://github.com/ciembor/agent-rules-books/blob/main/the-pragmatic-programmer/the-pragmatic-programmer.md)

- This is an unofficial, MIT-licensed, whole-book derivative. It is neither publisher-authorized nor Chapter 5-specific evidence.
- Its relevant use is limited to corroborating two practical interpretations: globals or ambient/shared mutable state create hidden coupling, and ordering or asynchronous assumptions should be explicit.
- Its DRY, naming, comments, testing, process, automation, contracts, team, prototyping, estimation, and other whole-book rules are not carried into `ADAPTABILITY.md`.

## Findings by Chapter 5 topic

### 1. Decoupling — high evidence

Publisher tips 44–48 support these conclusions:

- Reduce coupling so change remains local.
- Prefer commanding the object that owns a decision over extracting its state and making the decision elsewhere.
- Avoid structural call chains that make callers depend on traversed object layouts.
- Avoid global data, especially shared mutable state.
- When global state cannot be removed, constrain access through a deliberate interface.

Evidence limits:

- “Tell, don't ask” does not prohibit all queries.
- The primary material warns about chained structural access; it does not show that every fluent interface or chain over returned values is harmful.
- It prescribes no numeric maximum chain depth.
- Judging coupling by caller knowledge, preferring a direct call over a pass-through Module, and requiring a justified Seam are codebase-design synthesis rather than Chapter 5 thresholds.

### 2. Juggling the Real World — medium evidence

Official sample code plus public Topic 29 exercise notes support presenting these mechanisms:

- Finite-state machines for behavior governed by explicit states and transitions.
- Observer for dependents reacting to a known subject.
- Publish/subscribe for decoupled, often one-to-many notification.
- Reactive/event streams for sequences of values or events over time.

Evidence limits:

- The accessible evidence supports treating these as alternatives selected for the problem, but is weaker than the prose available for decoupling and inheritance.
- Exact delivery guarantees, retries, idempotency, ordering infrastructure, failure recovery, and subscription-lifetime policy are operational concerns not established by the reviewed Chapter 5 evidence.
- `ADAPTABILITY.md` treats event shape, ordering, delivery, lifetime, and errors as part of a Module's Interface when callers must know them. That is an application of the codebase-design definition of Interface, not detailed event-system advice attributed to Chapter 5.
- The unofficial rules file only corroborates making temporal and asynchronous assumptions explicit.

### 3. Transforming Programming — high evidence for the core, secondary for extensions

Publisher tips 49–50 directly support:

- Begin with data entering and results leaving.
- Pass state through transformations instead of retaining it as hidden or unrelated object state.

The Topic 30 reader notes secondarily support composing compatible transformations into a pipeline.

Evidence limits:

- The primary evidence does not prescribe a representation for pipeline failures.
- Opposition to fluent interfaces is a secondary interpretation, not a Chapter 5 rule.
- Keeping a transformation pipeline private behind a smaller Module Interface is codebase-design synthesis.
- Declining to force every operation into a pipeline is proportionality synthesis.

### 4. Inheritance Tax — high evidence

The publisher extract and tips 51–54 support:

- Inheritance couples descendants to ancestors and can make change expensive.
- Use a language interface or protocol when the intent is polymorphism.
- Use delegation or composition when the intent is capability reuse through a has-a relationship.
- Use a mixin or trait when the intent is sharing a coherent implementation.

These alternatives address distinct intents and are not interchangeable prescriptions. The broader codebase-design **Interface**—everything a caller must know—is separate from a language interface/protocol; that distinction comes from `SKILL.md`, not Chapter 5.

### 5. Configuration — high evidence for a narrow claim

Publisher tip 55 supports externalizing values that can change after deployment. Chapter context reasonably includes variation by environment or customer.

Evidence limits:

- The reviewed primary evidence does not establish policies for validation, defaults, precedence, secrets, schemas, source adapters, or live reload.
- Treating required configuration and its failure modes as part of a Module's Interface is codebase-design synthesis.
- Keeping stable behavior in code when no deployment variation exists is proportionality synthesis, not a threshold attributed to the chapter.

## Explicit synthesis in `ADAPTABILITY.md`

The following safeguards combine the evidence with codebase-design's **Module**, **Interface**, **Implementation**, **Seam**, **Adapter**, **Depth**, **Leverage**, and **Locality** vocabulary. They are not claims about Chapter 5's exact wording:

- Decoupling does not automatically justify another layer, Module, or Seam.
- A direct call is appropriate for simple, intentional collaboration.
- Fluent interfaces and value chains are appropriate when they are the intended Interface and do not expose hidden structure.
- Pass-through wrappers, speculative language interfaces, event buses, and configuration options can add indirection without reducing meaningful coupling.
- A pipeline may remain private Implementation rather than become caller-facing Interface.
- Event details belong to the Interface only to the extent callers must know them.
- Use the smallest mechanism matching actual coupling, temporal, data-flow, reuse, or deployment pressure.
- Do not force every data operation into a transformation pipeline.
- Assess the result by reduced caller knowledge and improved Locality, not by the amount of indirection introduced.

This proportionality layer prevents Chapter 5 mechanisms from becoming unconditional architecture rules.

## Exclusions

This provenance deliberately excludes material not tied to Chapter 5:

- Generic method extraction, method length, naming, comments, DRY, and class-size advice.
- Generic error-handling, testing, formatter, and linter rules.
- Process, automation, contracts, teamwork, prototyping, estimation, and other whole-book guidance.
- Ashley-specific or project-specific styling and architecture preferences, including ERB, form builders, Tailwind/DaisyUI, trivial-method, service-object, unsupported-state, and error-boundary guidance.

General deep-module and abstraction guidance appears in the codebase-design materials only as an explicitly identified interpretive framework; it is not presented here as Chapter 5 evidence.

## Evidence limitation summary

Publisher evidence is strongest for decoupling, transformation inputs/outputs and state passing, alternatives to inheritance, and post-deployment configuration. Event-mechanism selection has medium support from publisher sample code and reader exercise notes rather than an authorized prose extract. Primary and secondary claims remain distinct, the GitHub rules file remains an unofficial whole-book cross-check, and every proportionality safeguard is labeled synthesis.
