# Babel/Codegen/AST Flows: Best Practices

## Table of Contents

1. [Core Architecture](#core-architecture)
2. [The Three-Phase Pipeline](#the-three-phase-pipeline)
3. [AST Structure & Node Types](#ast-structure--node-types)
4. [The Visitor Pattern](#the-visitor-pattern)
5. [Path Object API](#path-object-api)
6. [Plugin Architecture](#plugin-architecture)
7. [Code Generation](#code-generation)
8. [Performance Optimization](#performance-optimization)
9. [Real-World Patterns](#real-world-patterns)
10. [Common Pitfalls](#common-pitfalls)

---

## Core Architecture

Babel operates as a **JavaScript compiler** that transforms modern JavaScript into compatible code by manipulating the Abstract Syntax Tree (AST). The fundamental building block is the **plugin system**, which uses the **visitor pattern** to traverse and transform AST nodes.

### Key Packages

- **@babel/parser**: Parses source code into an AST
- **@babel/traverse**: Walks the AST using the visitor pattern
- **@babel/generator**: Converts the modified AST back into source code
- **@babel/types**: Contains utilities for building and checking AST nodes
- **@babel/core**: Wraps all functionality with high-level APIs

---

## The Three-Phase Pipeline

Babel transforms code through three distinct phases:

```
Input Code → [Parse] → AST → [Transform] → Modified AST → [Generate] → Output Code
```

### Phase 1: Parse (@babel/parser)

The parser converts JavaScript source code into an AST. It must handle all JavaScript syntax including JSX, TypeScript, Flow, and experimental features through plugins.

```javascript
import { parse } from "@babel/parser";

const code = "const greeting = 'hello';";
const ast = parse(code, { 
  sourceType: "module",
  plugins: ["jsx", "typescript"]
});
```

**Key Parser Options:**
- `sourceType`: "module" or "script"
- `plugins`: Array of parser plugins for JSX, TypeScript, decorators, etc.
- `tokens`: true - Preserve token information
- `attachComment`: true/false - Attach comments to AST nodes
- `createParenthesizedExpressions`: true - Preserve parenthesized expressions

### Phase 2: Transform (@babel/traverse + Visitor Pattern)

Babel traverses the AST and applies transformations via plugins. **Critical optimization:** Babel merges all visitor functions into a single traversal pass, avoiding redundant tree walks.

```javascript
import traverse from "@babel/traverse";
import { parse } from "@babel/parser";

const ast = parse(code);

traverse(ast, {
  Identifier(path) {
    // Handle identifier nodes
    path.node.name = path.node.name.toUpperCase();
  }
});
```

### Phase 3: Generate (@babel/generator)

The modified AST is converted back into source code with optional source maps.

```javascript
import { generate } from "@babel/generator";

const { code, map } = generate(ast, {
  sourceMaps: true,
  sourceFileName: "input.js"
});
```

---

## AST Structure & Node Types

Every piece of JavaScript is represented as a node with a specific type. Babel's AST extends the ESTree specification with additional node types.

### Common Node Types

| Category | Node Types |
|----------|-----------|
| **Literals** | StringLiteral, NumericLiteral, BooleanLiteral, NullLiteral, BigIntLiteral |
| **Expressions** | Identifier, BinaryExpression, CallExpression, MemberExpression, ArrowFunctionExpression |
| **Statements** | ExpressionStatement, BlockStatement, IfStatement, ForStatement, ReturnStatement |
| **Declarations** | FunctionDeclaration, VariableDeclaration, ClassDeclaration, ImportDeclaration |
| **Patterns** | ObjectPattern, ArrayPattern, AssignmentPattern, RestElement |
| **Class-related** | ClassBody, ClassMethod, ClassProperty, ClassPrivateProperty |

### Node Properties

Every node contains:
- `type`: The node type (string)
- `loc`: Location information (line, column)
- `start`/`end`: Character positions in source
- Additional properties specific to the node type

```javascript
{
  type: "AssignmentExpression",
  operator: "=",
  left: { type: "Identifier", name: "foo" },
  right: { type: "StringLiteral", value: "bar" }
}
```

---

## The Visitor Pattern

The visitor pattern allows plugins to selectively process specific node types without manually traversing the entire tree.

### Basic Visitor Structure

```javascript
export default function(babel) {
  const { types: t } = babel;
  
  return {
    name: "my-plugin", // optional but recommended
    visitor: {
      // Visitor for a specific node type
      FunctionDeclaration(path, state) {
        // path: NodePath object
        // state: Plugin state with options
      },
      
      // Visitor for multiple node types
      "Identifier|MemberExpression"(path) {
        // Called for both Identifier and MemberExpression nodes
      }
    }
  };
}
```

### Enter/Exit Phases

Each node is visited twice: once on entry and once on exit. This allows pre- and post-processing.

```javascript
visitor: {
  Function: {
    enter(path) {
      // Called when entering a function node
      console.log("Entering function");
    },
    exit(path) {
      // Called when exiting a function node
      // Useful for post-processing after children are visited
      console.log("Exiting function");
    }
  }
}
```

**Execution Order:**
```
Pre() → Program.enter() → ... traversal ... → Program.exit() → Post()
```

### Visitor Method Forms

```javascript
// Method form (recommended for clarity)
visitor: {
  Identifier(path) { }
}

// Object form with enter/exit
visitor: {
  Identifier: {
    enter(path) { },
    exit(path) { }
  }
}

// Array form (for multiple handlers, rarely used)
visitor: {
  Identifier: [
    { enter(path) { } },
    { enter(path) { } }
  ]
}
```

---

## Path Object API

The `path` parameter passed to visitor functions is the most powerful API for AST manipulation. It wraps a node with context about its position in the tree.

### Accessing Node Information

```javascript
visitor: {
  Identifier(path) {
    path.node              // The actual AST node
    path.node.name         // Node properties
    path.parent            // Parent node
    path.listKey           // Key if node is in a list
    path.key               // Property key in parent
    path.isXXX()           // Type checking methods
  }
}
```

### Path Navigation

```javascript
path.getFunctionParent()      // Find nearest function ancestor
path.getStatementParent()     // Find nearest statement ancestor
path.findParent(callback)     // Custom parent search

// Traverse up/down the tree
path.parentPath
path.getNextSibling()
path.getPrevSibling()
```

### Node Modification Methods

```javascript
// Replace the current node
const [newPath] = path.replaceWith(t.stringLiteral("new"));

// Replace with multiple nodes
path.replaceWithMultiple([node1, node2]);

// Replace with source string (inefficient, not recommended)
path.replaceWithSourceString('"hello"');

// Remove the current node
path.remove();

// Insert before/after
path.insertBefore(node);
path.insertAfter(node);

// Container operations
path.unshiftContainer("body", node);  // Prepend to array
path.pushContainer("body", node);     // Append to array
```

**Best Practice:** `replaceWith()` returns an array of new paths, allowing immediate further manipulation:

```javascript
const [replaced] = path.replaceWith(newNode);
replaced.traverse(visitor);  // Traverse the new node
```

### Flow Control

```javascript
path.skip()          // Skip visiting children of this node
path.stop()          // Stop traversal entirely
path.remove()        // Remove node and continue
path.traverse(visitor) // Manually traverse children with specific visitor
```

### Scope Management

```javascript
path.scope              // Scope object for this binding context
path.scope.bindings    // Object of all bindings in current scope
path.scope.getBinding(name)  // Get specific binding

path.scope.traverse(visitor)  // Traverse only this scope
path.scope.parent       // Parent scope

// Scope analysis
path.isReferenced()     // Is this node referenced?
path.isConstant()       // Is this node constant?
```

---

## Plugin Architecture

### Plugin Function Signature

```javascript
export default function plugin(api, options) {
  const { types: t, traverse, template } = api;
  
  return {
    name: "plugin-name",
    
    // Optional: Run before all visitor traversals
    pre(file) {
      this.data = {};
    },
    
    // Main transformation logic
    visitor: { /* ... */ },
    
    // Optional: Run after all visitor traversals
    post(file) {
      // Access and use collected data
      console.log(this.data);
    }
  };
}
```

### Plugin Options

Options are passed from configuration and available in visitor methods:

```javascript
visitor: {
  CallExpression(path, state) {
    const options = state.opts;  // Plugin options
    if (options.someOption) {
      // conditional transformation
    }
  }
}
```

### Plugin Lifecycle

1. **Pre-phase**: `pre()` called before any traversal
2. **Visitor phase**: All visitors run on a merged single traversal
3. **Post-phase**: `post()` called after traversal completes

### Visitor Merging Optimization

**Critical Pattern:** Babel automatically merges all plugin visitors into a single traversal. This is a major performance optimization.

```javascript
// ✅ GOOD: Single visitor traversal
visitor: {
  Identifier(path) { /* handle */ },
  FunctionDeclaration(path) { /* handle */ }
}

// ❌ AVOID: Multiple separate traversals
visitor: {
  FunctionDeclaration(path) {
    path.traverse({
      Identifier(path) { /* ... */ }  // Extra traversal!
    });
  }
}
```

---

## Code Generation

### Generator Options

The `generate()` function converts AST back to code with numerous formatting options:

```javascript
const { code, map, decodedMap, rawMappings } = generate(ast, {
  // Formatting
  compact: false,              // Add whitespace
  concise: false,              // Minimal whitespace (less than compact)
  minified: false,             // Remove all whitespace
  
  // Comments
  comments: true,              // Include comments from AST
  shouldPrintComment: (comment) => {
    return comment.includes("@preserve");
  },
  
  // Decorators
  decoratorsBeforeExport: false,
  
  // Line preservation (useful for source maps)
  retainLines: false,
  retainFunctionParens: false,
  
  // Source maps
  sourceMaps: true,
  sourceFileName: "source.js",
  sourceRoot: "/",
  inputSourceMap: { /* ... */ },
  
  // Import attributes
  importAttributesKeyword: "with",  // "with" | "assert"
  
  // Experimental
  experimental_preserveFormat: false
});
```

### Format Output Control

```javascript
// Minified output
generate(ast, { minified: true, compact: true })

// Pretty-printed
generate(ast, { compact: false })

// Preserve line numbers (for stack traces)
generate(ast, { retainLines: true })

// Custom source map processing
const { code, rawMappings } = generate(ast, { sourceMaps: true });
```

### Multiple Source Merging

When combining AST from multiple sources:

```javascript
const astA = parse("var a = 1;", { sourceFilename: "a.js" });
const astB = parse("var b = 2;", { sourceFilename: "b.js" });

const merged = {
  type: "Program",
  body: [...astA.program.body, ...astB.program.body]
};

const { code, map } = generate(merged, { sourceMaps: true }, {
  "a.js": "var a = 1;",
  "b.js": "var b = 2;"
});
```

---

## Performance Optimization

### 1. Merge Visitors (Single Traversal)

**Problem:** Multiple traversals multiply AST walks.

```javascript
// ❌ BAD: Three separate traversals
path.traverse({
  Identifier(path) { /* ... */ }
});

path.traverse({
  BinaryExpression(path) { /* ... */ }
});

path.traverse({
  CallExpression(path) { /* ... */ }
});

// ✅ GOOD: Single merged traversal
path.traverse({
  Identifier(path) { /* ... */ },
  BinaryExpression(path) { /* ... */ },
  CallExpression(path) { /* ... */ }
});
```

### 2. Skip Unnecessary Children

Use `path.skip()` to prevent traversing irrelevant subtrees:

```javascript
visitor: {
  ArrowFunctionExpression(path) {
    path.skip();  // Don't visit children of arrow functions
  }
}
```

### 3. Manual Lookup Instead of Traversal

When looking for shallow properties, avoid traversal:

```javascript
// ❌ EXPENSIVE: Full traversal
path.traverse({
  Identifier(innerPath) {
    if (innerPath.parent === path.node) {
      // Handle direct children
    }
  }
});

// ✅ EFFICIENT: Direct property access
path.node.params.forEach(param => {
  // Handle params directly
});
```

### 4. Plugin Pruning

Disable unused plugins and presets in `.babelrc`:

```javascript
// ❌ Loads unnecessary plugins
{
  "presets": ["@babel/preset-env", "@babel/preset-react", "@babel/preset-typescript"],
  "plugins": ["plugin1", "plugin2", "plugin3"]
}

// ✅ Only essential transformations
{
  "presets": ["@babel/preset-env"],
  "plugins": []
}
```

**Impact:** Can reduce compilation time by ~40%.

### 5. Caching Strategy

Enable Babel caching in webpack/build tools:

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true,  // 2-6x faster incremental builds
            cacheCompression: false
          }
        }
      }
    ]
  }
};
```

### 6. Scope Binding Caching

Cache scope binding lookups to avoid repeated traversals:

```javascript
visitor: {
  FunctionDeclaration(path) {
    // Get binding once
    const binding = path.scope.getBinding("someVar");
    
    // Reuse binding data
    if (binding) {
      binding.referencePaths.forEach(refPath => {
        // Handle each reference
      });
    }
  }
}
```

### 7. Targeted Type Checks

Use early termination with type checks:

```javascript
// ✅ Stop early if node isn't relevant
visitor: {
  CallExpression(path) {
    if (!path.isReferencedIdentifier()) {
      return;  // Skip unreferenced identifiers
    }
    // Process...
  }
}
```

### 8. Build Tool Configuration

For monorepos, use workspace-local Babel configs:

```bash
# Avoid hoisting config to root
# Each package gets its own .babelrc
# Reduces unnecessary AST traversals by 10-15% in 100+ module projects
```

---

## Real-World Patterns

### Pattern 1: Transform Function Names

```javascript
export default function(babel) {
  const { types: t } = babel;
  
  return {
    name: "uppercase-functions",
    visitor: {
      FunctionDeclaration(path) {
        if (path.node.id) {
          path.node.id.name = path.node.id.name.toUpperCase();
        }
      }
    }
  };
}
```

### Pattern 2: Replace Code at Build-Time

```javascript
export default function(babel) {
  const { types: t } = babel;
  
  return {
    visitor: {
      IfStatement(path) {
        // Remove dead code branches
        if (path.node.test.type === "BooleanLiteral") {
          if (path.node.test.value) {
            path.replaceWith(path.node.consequent);
          } else if (path.node.alternate) {
            path.replaceWith(path.node.alternate);
          } else {
            path.remove();
          }
        }
      }
    }
  };
}
```

### Pattern 3: Add Logging to Function Calls

```javascript
export default function(babel) {
  const { types: t, template } = babel;
  
  return {
    visitor: {
      CallExpression(path) {
        if (path.node.callee.name === "criticalFunction") {
          const logCall = template.expression(`
            console.log("Called critical function", arguments)
          `);
          
          path.insertBefore(logCall());
        }
      }
    }
  };
}
```

### Pattern 4: Modify Import Paths

```javascript
export default function(babel) {
  const { types: t } = babel;
  
  return {
    visitor: {
      ImportDeclaration(path) {
        if (path.node.source.value.startsWith(".")) {
          // Convert relative imports to absolute
          path.node.source.value = path.node.source.value
            .replace(/^\.\//, "src/");
        }
      }
    }
  };
}
```

### Pattern 5: Scope-Based Transformations

```javascript
export default function(babel) {
  const { types: t } = babel;
  
  return {
    visitor: {
      VariableDeclarator(path) {
        const name = path.node.id.name;
        const binding = path.scope.getBinding(name);
        
        // Only transform if used exactly once
        if (binding && binding.referencePaths.length === 1) {
          // Inline the value
          const ref = binding.referencePaths[0];
          ref.replaceWith(path.node.init);
          path.remove();
        }
      }
    }
  };
}
```

### Pattern 6: Pre/Post Processing

```javascript
export default function(babel) {
  const { types: t } = babel;
  
  return {
    pre(file) {
      // Initialize tracking state
      this.usedIdentifiers = new Set();
      this.importedModules = [];
    },
    
    visitor: {
      Identifier(path, state) {
        state.filename = this.usedIdentifiers;
        state.filename.add(path.node.name);
      },
      
      ImportDeclaration(path) {
        this.importedModules.push(path.node.source.value);
      }
    },
    
    post(file) {
      // Generate report
      console.log("Used identifiers:", this.usedIdentifiers);
      console.log("Imported modules:", this.importedModules);
    }
  };
}
```

---

## Common Pitfalls

### Pitfall 1: Visiting Nodes Multiple Times

**Problem:** Manual traversals cause redundant visits.

```javascript
// ❌ BAD
visitor: {
  FunctionDeclaration(path) {
    path.traverse({
      Identifier(innerPath) { /* ... */ }
    });
  }
}

// ✅ GOOD: Let Babel merge visitors
visitor: {
  FunctionDeclaration(path) { /* ... */ },
  Identifier(path) { /* ... */ }
}
```

### Pitfall 2: Modifying Node During Traversal

**Problem:** Changing AST while traversing can invalidate paths.

```javascript
// ❌ RISKY
path.node.body.forEach(stmt => {
  if (shouldRemove(stmt)) {
    // Modifying array during iteration
    path.node.body.splice(index, 1);
  }
});

// ✅ SAFE
const nodesToRemove = [];
path.node.body.forEach((stmt, index) => {
  if (shouldRemove(stmt)) {
    nodesToRemove.push(index);
  }
});
// Remove in reverse order to maintain indices
nodesToRemove.reverse().forEach(index => {
  path.node.body.splice(index, 1);
});
```

### Pitfall 3: Ignoring Source Map Impact

**Problem:** Generator recreates formatting, losing original formatting.

```javascript
// AST doesn't preserve whitespace
// Original:   const a   =   1;
// Generated:  const a = 1;

// Solution: Use retainLines for stack traces
generate(ast, { retainLines: true })
```

### Pitfall 4: Not Using Template Strings

**Problem:** Building AST nodes manually is error-prone.

```javascript
// ❌ VERBOSE AND ERROR-PRONE
const node = {
  type: "CallExpression",
  callee: {
    type: "MemberExpression",
    object: { type: "Identifier", name: "console" },
    property: { type: "Identifier", name: "log" }
  },
  arguments: [{ type: "StringLiteral", value: "hello" }]
};

// ✅ CLEAN WITH TEMPLATE
const { template } = babel;
const node = template.expression(`console.log("hello")`);
```

### Pitfall 5: Incorrect Scope Analysis

**Problem:** Assuming scope without checking parent scopes.

```javascript
// ❌ INCOMPLETE
const binding = path.scope.getBinding("var");
// What if var is from parent scope?

// ✅ CORRECT: Check all scopes
let scope = path.scope;
let binding = scope.getBinding("var");
while (!binding && scope.parent) {
  scope = scope.parent;
  binding = scope.getBinding("var");
}
```

### Pitfall 6: Plugin Ordering Issues

**Problem:** Plugin execution order matters for dependencies.

```javascript
// ✅ CORRECT ORDER in .babelrc
{
  "plugins": [
    "transform-decorators",  // Decorators must run first
    "transform-class-properties",
    "transform-flow-strip-types"
  ]
}

// Order matters: some plugins depend on others running first
```

### Pitfall 7: Over-Aggressive Caching

**Problem:** Caching invalidated by plugin modifications.

```javascript
// ❌ RISKY: Cache becomes stale
const cache = new Map();
visitor: {
  Identifier(path) {
    if (cache.has(path.node.name)) {
      // Other plugins may have changed the node
      return cache.get(path.node.name);
    }
  }
}

// ✅ SAFER: Validate cache
if (cache.has(key) && cache.get(key).node === path.node) {
  return cache.get(key);
}
```

---

## Summary: Best Practices Checklist

- ✅ Merge visitors to use single traversal
- ✅ Use `path.skip()` to avoid unnecessary subtrees
- ✅ Prefer direct property access over traversal for shallow lookups
- ✅ Minimize plugin set in `.babelrc`
- ✅ Enable caching in build tools
- ✅ Use template strings for AST node creation
- ✅ Preserve source maps with `sourceMaps: true`
- ✅ Validate scope bindings across parent scopes
- ✅ Avoid modifying AST during iteration
- ✅ Use `pre()` and `post()` for state management
- ✅ Test plugin ordering for complex transformations
- ✅ Profile with `NODE_OPTIONS="--trace-time"` to identify bottlenecks
- ✅ Use `retainLines: true` to preserve stack traces
- ✅ Document plugin purpose and options clearly