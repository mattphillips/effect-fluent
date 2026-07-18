# effect-fluent

This document provides guidance for Claude Code when working on the effect-fluent library.

## Project Overview

effect-fluent is a wrapper around effect which lifts combinators into a fluent API using classes.

## Project Structure

```
effect-fluent/
├── packages/
│   ├── effect/        # Fluent wrapper implemenation around effect
│   ├── vitest/        # Test utils for vitest and effect-fluent
└── repos/              # Reference repositories (git subtrees)
    ├── effect/         # Effect-TS source
```

## Implementing combinators and new datatypes

When implementing any combinator or new datatype, port the associated upstream tests
from `repos/effect/packages/effect/test` for that combinator and/or type, adapting
them to the fluent API. The ported tests must honour the existing upstream
assertions — they define the behaviour our wrappers must preserve.

If the upstream tests have holes (untested branches, edge cases, or overloads),
patch them with our own additional tests so the new API is fully covered.
