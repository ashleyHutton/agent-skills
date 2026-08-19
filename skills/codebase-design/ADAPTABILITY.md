# Adaptability

A decision guide for applying Chapter 5 of *The Pragmatic Programmer, 20th Anniversary Edition* with the vocabulary in [SKILL.md](SKILL.md). Use it when change pressure concerns coupling, time, data flow, reuse, or deployment variation.

A **Module** puts an **Implementation** behind an **Interface** at a **Seam**. An **Adapter** is a concrete participant that satisfies the Interface at that Seam. Prefer choices that increase **Depth**: callers gain **Leverage** while change and knowledge gain **Locality**.

## 1. Is knowledge leaking across collaborators?

Decouple when one Module must know another's internal structure, decision rules, or hidden state.

- Tell the Module the outcome to produce when its Implementation owns the knowledge; do not extract its state, decide elsewhere, then push a result back.
- Avoid traversing one object to reach another object's internals. The caller then depends on every link in the structure.
- Make dependencies and state flow visible. Avoid ambient, global, and shared mutable state; when global state is unavoidable, localize access behind a deliberate Interface.
- Judge the result by caller knowledge, not call count. A direct call may preserve more Locality than an extra pass-through Module.
- Add a Seam only where behavior really varies. One Adapter is hypothetical; two justified Adapters make the Seam real.

The goal is not more indirection. It is an Interface that hides decisions so a change stays in one Implementation rather than spreading through callers.

## 2. Does behavior unfold in response to events?

Choose the smallest event mechanism that matches the temporal shape:

- **Finite-state machine:** named states and legal transitions determine behavior. Keep transition rules together so the Module owns the state model.
- **Observer:** dependents need notification from a known subject. This reduces polling but retains a relationship between subject and observers.
- **Publish/subscribe:** producers and consumers should not know one another directly, especially for one-to-many notification.
- **Reactive or event streams:** sequences of values or events must be transformed and combined over time.

Treat channels, event shapes, ordering, delivery guarantees, subscription lifetime, and error behavior as part of the Module's Interface whenever callers must know them. Event machinery improves Locality only when it removes real knowledge between participants; an event bus added between intentionally connected collaborators merely hides control flow and enlarges the Interface.

## 3. Is the work naturally input-to-output?

Model the Implementation as transformations when data flow is the clearest account of the work.

- Start with the input and required output.
- Make intermediate transformations and their required data explicit.
- Pass state through the flow instead of accumulating it in unrelated objects or ambient context.
- Compose steps whose inputs and outputs fit naturally.
- Do not force operations into a pipeline when sequencing, effects, or branching are clearer another way.

A transformation pipeline may remain private Implementation. Expose only the Interface callers need; hiding intermediate stages can increase Depth, preserve freedom to reorder them, and keep verification local to the Module's observable result.

## 4. Is inheritance carrying the wrong kind of reuse?

First identify the intent:

- Use a language **interface or protocol** when multiple implementations need the same type-level contract and polymorphism.
- Use delegation or composition when one object should use another's capability while retaining control of its own Interface.
- Use a mixin or trait, where supported, to share a coherent implementation across otherwise separate types.

A language interface/protocol is not the codebase-design term **Interface**. The language construct describes a type-level contract. A Module's **Interface** includes every fact a caller must know: types, invariants, ordering, errors, configuration, and performance characteristics. A language interface may help define an Adapter at a Seam, but it neither captures the whole Interface nor proves that the Seam is useful.

Do not exchange inheritance for these mechanisms mechanically. Polymorphism, capability use, and implementation sharing are different needs. Prefer the option that keeps ancestor or collaborator knowledge out of callers and allows change to remain in one Implementation.

## 5. Must a value vary after or between deployments?

Externalize values that legitimately change after deployment or differ by environment or customer. Keep stable behavior in code when that variation does not exist.

Required configuration, its meaning, and relevant failure modes belong to the Module's Interface because callers or operators must know them. Keep configuration access behind one Module when doing so gives Locality; use source Adapters only when multiple sources are real. Do not infer a configuration framework, validation policy, defaults, or live reload without system requirements for them.

## Proportionality check

This checklist is an application synthesis, not a set of thresholds stated in Chapter 5:

- [ ] Which pressure is present: leaked knowledge, temporal behavior, hidden data flow, inheritance coupling, or deployment variation?
- [ ] Does the proposed Module reduce what callers must know, or only rename and move that knowledge?
- [ ] Is the Seam located where behavior actually varies, with justified Adapters rather than hypothetical substitution?
- [ ] Does the Interface include the non-type facts callers must understand?
- [ ] Does the mechanism increase Depth and Leverage without expanding the Interface disproportionately?
- [ ] Will the likely change remain in one Implementation, improving Locality?
- [ ] Would deleting the Module spread meaningful complexity back across callers, rather than remove a pass-through?
- [ ] Is a direct call or stable value sufficient instead of an event system, pipeline, language interface, wrapper, or configuration option?
- [ ] Is the chosen mechanism the smallest one matching the actual coupling, time, data-flow, reuse, or deployment problem?
