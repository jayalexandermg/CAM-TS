# Engineer Context

## CAM Project Standards

### TypeScript Conventions
- Use strict mode
- Prefer interfaces over types
- Use async/await over raw promises
- Export types alongside implementations
- Use descriptive variable names

### File Organization
```
src/
├── {feature}/
│   ├── index.ts      # Exports
│   ├── types.ts      # Type definitions
│   ├── {Feature}.ts  # Main implementation
│   └── utils.ts      # Helper functions
tests/
├── {feature}/
│   └── {Feature}.test.ts
```

### Testing Standards
- Jest for unit and integration tests
- 80%+ coverage target
- Descriptive test names
- Test edge cases and error paths
- Mock external dependencies

### Error Handling
- Use custom error classes from src/errors/
- Always include context in error messages
- Log errors before rethrowing
- Handle async errors properly

### Git Conventions
- Conventional commits: feat:, fix:, docs:, refactor:, test:
- Feature branches from main
- PR reviews required
- Squash merge

## Common Patterns
- Repository pattern for data access
- Factory pattern for object creation
- Strategy pattern for algorithm selection
- Observer pattern for events

## Code Quality Guidelines

### Naming Conventions
- Classes: PascalCase (e.g., `MemoryScaffold`)
- Functions/methods: camelCase (e.g., `loadProfile`)
- Constants: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)
- Files: PascalCase for classes, camelCase for utilities

### Documentation
- JSDoc for public APIs
- Inline comments for complex logic only
- README for each major module

### Performance Considerations
- Lazy loading for expensive resources
- Caching for frequently accessed data
- Async operations for I/O-bound tasks
- Batch operations when possible
