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
