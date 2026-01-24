# DESIGN TOKENS STANDARD: JSON Examples and Best Practices from DTCG

## Overview

The Design Tokens Community Group (DTCG) W3C specification provides a standardized JSON format for exchanging design tokens between tools. This document compiles JSON examples and best practices from the official DTCG specification.

## File Format

**Media Type:** `application/design-tokens+json` or `application/json`

**File Extensions:** `.tokens` or `.tokens.json`

## Basic Token Structure

Every design token consists of a JSON object with required `$value` and optional properties prefixed with `$`:

```json
{
  "tokenName": {
    "$description": "(optional) A description of this token",
    "$type": "[token type]",
    "$value": "[token value - different shape depending on $type]",
    "$extensions": "(optional) Used by third-party tools"
  }
}
```

### Key Principles

- **Required:** `$value` property identifies an object as a token
- **Reserved:** All `$` prefixed properties are reserved by the spec
- **Naming:** Token names MUST NOT begin with `$` or contain `{`, `}`, `.` characters
- **Case-sensitive:** Token names are case-sensitive

### Simple Token Example

```json
{
  "color-primary": {
    "$type": "color",
    "$value": {
      "colorSpace": "srgb",
      "components": [0, 0.4, 0.8],
      "hex": "#0066cc"
    },
    "$description": "Primary brand color"
  }
}
```

## Groups

Groups organize tokens hierarchically. Any JSON object WITHOUT a `$value` property is considered a group.

```json
{
  "color": {
    "$description": "Color palette tokens",
    "$type": "color",
    "primary": {
      "$value": {
        "colorSpace": "srgb",
        "components": [0, 0.4, 0.8],
        "hex": "#0066cc"
      }
    },
    "secondary": {
      "$value": {
        "colorSpace": "srgb",
        "components": [0.8, 0.2, 0.4],
        "hex": "#cc3366"
      }
    }
  }
}
```

### Group Properties

Groups MAY include:
- `$description` - Plain text description
- `$type` - Default type inherited by child tokens
- `$extends` - Inherit tokens from another group
- `$deprecated` - Mark group as deprecated
- `$extensions` - Vendor-specific data

### Type Inheritance

```json
{
  "spacing": {
    "$type": "dimension",
    "small": {
      "$value": { "value": 8, "unit": "px" }
    },
    "medium": {
      "$value": { "value": 16, "unit": "px" }
    },
    "large": {
      "$value": { "value": 24, "unit": "px" }
    }
  }
}
```

### Root Tokens

Groups can have a root token using the reserved `$root` name:

```json
{
  "color": {
    "brand": {
      "$type": "color",
      "$root": {
        "$value": {
          "colorSpace": "srgb",
          "components": [0, 0.4, 0.8],
          "hex": "#0066cc"
        }
      },
      "light": {
        "$value": {
          "colorSpace": "srgb",
          "components": [0.2, 0.533, 0.867],
          "hex": "#3388dd"
        }
      }
    }
  }
}
```

Reference: `{color.brand.$root}` or `{color.brand.light}`

## Extending Groups

Groups can inherit from other groups using `$extends`:

```json
{
  "button": {
    "background": {
      "$value": {
        "colorSpace": "srgb",
        "components": [1, 1, 1],
        "hex": "#ffffff"
      }
    },
    "field": {
      "width": {
        "$value": { "value": 200, "unit": "px" }
      }
    }
  },
  "input-amount": {
    "$extends": "{button}",
    "field": {
      "width": {
        "$value": { "value": 100, "unit": "px" }
      }
    }
  }
}
```

**Result:** `input-amount` inherits `background` from `button` but overrides `field.width` with local value.

## Token Aliases (References)

Tokens can reference other tokens using curly brace syntax `{group.token}`:

```json
{
  "color": {
    "base": {
      "primary": {
        "$type": "color",
        "$value": {
          "colorSpace": "srgb",
          "components": [0, 0.4, 0.8],
          "hex": "#0066cc"
        }
      }
    },
    "semantic": {
      "brand": {
        "$type": "color",
        "$value": "{color.base.primary}"
      },
      "link": {
        "$type": "color",
        "$value": "{color.semantic.brand}"
      }
    }
  }
}
```

### Chained References

References can chain: `{semantic.link}` → `{semantic.brand}` → `{base.primary}` → color value

### JSON Pointer References

For advanced use cases, use `$ref` with JSON Pointer notation:

```json
{
  "colors": {
    "blue": {
      "$type": "color",
      "$value": {
        "colorSpace": "srgb",
        "components": [0, 0.4, 0.8],
        "hex": "#0066cc"
      }
    }
  },
  "brand": {
    "primary": {
      "$type": "color",
      "$ref": "#/colors/blue/$value"
    }
  }
}
```

### Property-Level References

JSON Pointer enables referencing specific properties:

```json
{
  "base": {
    "spacing": {
      "$type": "dimension",
      "$value": { "value": 16, "unit": "px" }
    }
  },
  "layout": {
    "small": {
      "$type": "dimension",
      "$value": {
        "$ref": "#/base/spacing/$value/value",
        "unit": "rem"
      }
    }
  }
}
```

## Deprecation

Mark tokens or groups as deprecated:

```json
{
  "old-color": {
    "$type": "color",
    "$value": {
      "colorSpace": "srgb",
      "components": [1, 0, 0],
      "hex": "#ff0000"
    },
    "$deprecated": "Please use {button.activeBorder} instead"
  }
}
```

Values:
- `true` - Deprecated without explanation
- `"string"` - Deprecated with explanation
- `false` - NOT deprecated (overrides group default)

## Token Types

### Color Type

**Type:** `color`

```json
{
  "brand-blue": {
    "$type": "color",
    "$value": {
      "colorSpace": "srgb",
      "components": [0, 0.4, 0.8],
      "alpha": 1,
      "hex": "#0066cc"
    }
  }
}
```

#### Color with Transparency

```json
{
  "overlay": {
    "$type": "color",
    "$value": {
      "colorSpace": "srgb",
      "components": [0, 0, 0],
      "alpha": 0.5,
      "hex": "#000000"
    }
  }
}
```

#### Color Spaces Examples

**sRGB (Most common):**
```json
{
  "red": {
    "$type": "color",
    "$value": {
      "colorSpace": "srgb",
      "components": [1, 0, 0],
      "hex": "#ff0000"
    }
  }
}
```

**HSL:**
```json
{
  "blue": {
    "$type": "color",
    "$value": {
      "colorSpace": "hsl",
      "components": [210, 100, 50]
    }
  }
}
```

**OKLCH (Perceptually uniform):**
```json
{
  "purple": {
    "$type": "color",
    "$value": {
      "colorSpace": "oklch",
      "components": [0.6, 0.216564, 269],
      "alpha": 1
    }
  }
}
```

**Display P3 (Wide gamut):**
```json
{
  "vibrant-red": {
    "$type": "color",
    "$value": {
      "colorSpace": "display-p3",
      "components": [1, 0.2, 0.3],
      "alpha": 1
    }
  }
}
```

#### Using "none" for Missing Components

```json
{
  "white": {
    "$type": "color",
    "$value": {
      "colorSpace": "hsl",
      "components": ["none", 0, 100]
    },
    "$description": "Hue is not applicable for white"
  }
}
```

### Dimension Type

**Type:** `dimension`

Represents distances like width, height, radius, thickness.

```json
{
  "spacing-small": {
    "$type": "dimension",
    "$value": { "value": 8, "unit": "px" }
  },
  "spacing-medium": {
    "$type": "dimension",
    "$value": { "value": 16, "unit": "px" }
  },
  "spacing-large": {
    "$type": "dimension",
    "$value": { "value": 1.5, "unit": "rem" }
  }
}
```

**Supported units:** `"px"`, `"rem"`

**Note:** Unit is required even if value is `0`.

### Font Family Type

**Type:** `fontFamily`

Single font or array of fonts (fallback order):

```json
{
  "font-base": {
    "$type": "fontFamily",
    "$value": "Helvetica Neue"
  },
  "font-system": {
    "$type": "fontFamily",
    "$value": ["system-ui", "-apple-system", "Segoe UI", "sans-serif"]
  }
}
```

### Font Weight Type

**Type:** `fontWeight`

Numeric (1-1000) or predefined string values:

```json
{
  "weight-normal": {
    "$type": "fontWeight",
    "$value": 400
  },
  "weight-bold": {
    "$type": "fontWeight",
    "$value": "bold"
  },
  "weight-black": {
    "$type": "fontWeight",
    "$value": 900
  }
}
```

**String aliases:**
- `100` = `"thin"`, `"hairline"`
- `200` = `"extra-light"`, `"ultra-light"`
- `300` = `"light"`
- `400` = `"normal"`, `"regular"`, `"book"`
- `500` = `"medium"`
- `600` = `"semi-bold"`, `"demi-bold"`
- `700` = `"bold"`
- `800` = `"extra-bold"`, `"ultra-bold"`
- `900` = `"black"`, `"heavy"`
- `950` = `"extra-black"`, `"ultra-black"`

### Duration Type

**Type:** `duration`

Animation timing in milliseconds or seconds:

```json
{
  "transition-fast": {
    "$type": "duration",
    "$value": { "value": 200, "unit": "ms" }
  },
  "transition-slow": {
    "$type": "duration",
    "$value": { "value": 0.5, "unit": "s" }
  }
}
```

**Supported units:** `"ms"`, `"s"`

### Cubic Bezier Type

**Type:** `cubicBezier`

Easing functions as four-number arrays [P1x, P1y, P2x, P2y]:

```json
{
  "ease-in": {
    "$type": "cubicBezier",
    "$value": [0.42, 0, 1, 1]
  },
  "ease-out": {
    "$type": "cubicBezier",
    "$value": [0, 0, 0.58, 1]
  },
  "ease-in-out": {
    "$type": "cubicBezier",
    "$value": [0.42, 0, 0.58, 1]
  }
}
```

**Constraints:** X coordinates [0, 1], Y coordinates [-∞, ∞]

### Number Type

**Type:** `number`

Plain numbers for gradient stops, line heights, etc.:

```json
{
  "line-height-tight": {
    "$type": "number",
    "$value": 1.2
  },
  "line-height-normal": {
    "$type": "number",
    "$value": 1.5
  },
  "gradient-stop": {
    "$type": "number",
    "$value": 0.5
  }
}
```

## Composite Token Types

Composite tokens combine multiple values with predefined structure.

### Stroke Style Type

**Type:** `strokeStyle`

**String value (predefined styles):**
```json
{
  "border-solid": {
    "$type": "strokeStyle",
    "$value": "solid"
  },
  "border-dashed": {
    "$type": "strokeStyle",
    "$value": "dashed"
  }
}
```

**Predefined values:** `"solid"`, `"dashed"`, `"dotted"`, `"double"`, `"groove"`, `"ridge"`, `"outset"`, `"inset"`

**Object value (custom dash patterns):**
```json
{
  "border-custom": {
    "$type": "strokeStyle",
    "$value": {
      "dashArray": [
        { "value": 5, "unit": "px" },
        { "value": 3, "unit": "px" }
      ],
      "lineCap": "round"
    }
  }
}
```

**lineCap values:** `"round"`, `"butt"`, `"square"`

### Border Type

**Type:** `border`

Combines color, width, and style:

```json
{
  "border-default": {
    "$type": "border",
    "$value": {
      "color": {
        "colorSpace": "srgb",
        "components": [0.5, 0.5, 0.5],
        "hex": "#808080"
      },
      "width": { "value": 1, "unit": "px" },
      "style": "solid"
    }
  },
  "border-accent": {
    "$type": "border",
    "$value": {
      "color": "{color.brand.primary}",
      "width": { "value": 2, "unit": "px" },
      "style": "solid"
    }
  }
}
```

### Transition Type

**Type:** `transition`

Animated transitions:

```json
{
  "transition-default": {
    "$type": "transition",
    "$value": {
      "duration": { "value": 200, "unit": "ms" },
      "delay": { "value": 0, "unit": "ms" },
      "timingFunction": [0.42, 0, 0.58, 1]
    }
  },
  "transition-slow": {
    "$type": "transition",
    "$value": {
      "duration": "{transition-fast.duration}",
      "delay": { "value": 100, "unit": "ms" },
      "timingFunction": "{ease-in-out}"
    }
  }
}
```

### Shadow Type

**Type:** `shadow`

Single or multiple shadows:

**Single shadow:**
```json
{
  "shadow-small": {
    "$type": "shadow",
    "$value": {
      "color": {
        "colorSpace": "srgb",
        "components": [0, 0, 0],
        "alpha": 0.5,
        "hex": "#000000"
      },
      "offsetX": { "value": 0.5, "unit": "rem" },
      "offsetY": { "value": 0.5, "unit": "rem" },
      "blur": { "value": 1.5, "unit": "rem" },
      "spread": { "value": 0, "unit": "rem" }
    }
  }
}
```

**With inset:**
```json
{
  "shadow-inset": {
    "$type": "shadow",
    "$value": {
      "color": {
        "colorSpace": "srgb",
        "components": [0, 0, 0],
        "alpha": 0.3
      },
      "offsetX": { "value": 0, "unit": "px" },
      "offsetY": { "value": 2, "unit": "px" },
      "blur": { "value": 4, "unit": "px" },
      "spread": { "value": 0, "unit": "px" },
      "inset": true
    }
  }
}
```

**Multiple shadows (layered):**
```json
{
  "shadow-layered": {
    "$type": "shadow",
    "$value": [
      {
        "color": {
          "colorSpace": "srgb",
          "components": [0, 0, 0],
          "alpha": 0.1
        },
        "offsetX": { "value": 0, "unit": "px" },
        "offsetY": { "value": 1, "unit": "px" },
        "blur": { "value": 3, "unit": "px" },
        "spread": { "value": 0, "unit": "px" }
      },
      {
        "color": {
          "colorSpace": "srgb",
          "components": [0, 0, 0],
          "alpha": 0.2
        },
        "offsetX": { "value": 0, "unit": "px" },
        "offsetY": { "value": 4, "unit": "px" },
        "blur": { "value": 6, "unit": "px" },
        "spread": { "value": 0, "unit": "px" }
      }
    ]
  }
}
```

**Mixing references and explicit values:**
```json
{
  "shadow-complex": {
    "$type": "shadow",
    "$value": [
      "{base.shadow}",
      {
        "color": "{brand.accent}",
        "offsetX": { "value": 4, "unit": "px" },
        "offsetY": { "value": 4, "unit": "px" },
        "blur": { "value": 8, "unit": "px" },
        "spread": { "value": 0, "unit": "px" }
      }
    ]
  }
}
```

### Gradient Type

**Type:** `gradient`

Array of gradient stops with color and position:

```json
{
  "gradient-primary": {
    "$type": "gradient",
    "$value": [
      {
        "color": {
          "colorSpace": "srgb",
          "components": [0, 0.4, 0.8],
          "hex": "#0066cc"
        },
        "position": 0
      },
      {
        "color": {
          "colorSpace": "srgb",
          "components": [0, 0.6, 1],
          "hex": "#0099ff"
        },
        "position": 1
      }
    ]
  }
}
```

**Three-stop gradient:**
```json
{
  "gradient-sunset": {
    "$type": "gradient",
    "$value": [
      {
        "color": {
          "colorSpace": "srgb",
          "components": [1, 0.6, 0],
          "hex": "#ff9900"
        },
        "position": 0
      },
      {
        "color": {
          "colorSpace": "srgb",
          "components": [1, 0.2, 0.4],
          "hex": "#ff3366"
        },
        "position": 0.5
      },
      {
        "color": {
          "colorSpace": "srgb",
          "components": [0.6, 0, 0.8],
          "hex": "#9900cc"
        },
        "position": 1
      }
    ]
  }
}
```

**Using references:**
```json
{
  "gradient-brand": {
    "$type": "gradient",
    "$value": [
      {
        "color": "{color.brand.primary}",
        "position": 0
      },
      {
        "color": "{color.brand.secondary}",
        "position": 1
      }
    ]
  }
}
```

### Typography Type

**Type:** `typography`

Complete typographic style:

```json
{
  "typography-heading": {
    "$type": "typography",
    "$value": {
      "fontFamily": ["Helvetica Neue", "Arial", "sans-serif"],
      "fontSize": { "value": 32, "unit": "px" },
      "fontWeight": 700,
      "letterSpacing": { "value": -0.5, "unit": "px" },
      "lineHeight": 1.2
    }
  }
}
```

**With references:**
```json
{
  "typography-body": {
    "$type": "typography",
    "$value": {
      "fontFamily": "{font.base}",
      "fontSize": "{font.size.medium}",
      "fontWeight": "{font.weight.normal}",
      "letterSpacing": { "value": 0, "unit": "px" },
      "lineHeight": 1.5
    }
  }
}
```

**Complete example with all properties:**
```json
{
  "typography-large-heading": {
    "$type": "typography",
    "$value": {
      "fontFamily": "system-ui",
      "fontSize": { "value": 3.2, "unit": "rem" },
      "fontWeight": 700,
      "letterSpacing": { "value": -0.02, "unit": "rem" },
      "lineHeight": 1.1
    },
    "$description": "Main page heading style"
  }
}
```

## Best Practices

### Token Architecture Layers

**Three-tier approach:**

1. **Base Tokens** (primitive, raw values)
2. **Alias Tokens** (semantic, contextual)
3. **Component-Specific Tokens** (implementation)

```json
{
  "color": {
    "$type": "color",
    "blue": {
      "400": {
        "$value": {
          "colorSpace": "srgb",
          "components": [0.2, 0.533, 0.867],
          "hex": "#3388dd"
        }
      },
      "500": {
        "$value": {
          "colorSpace": "srgb",
          "components": [0, 0.4, 0.8],
          "hex": "#0066cc"
        }
      },
      "600": {
        "$value": {
          "colorSpace": "srgb",
          "components": [0, 0.32, 0.64],
          "hex": "#0052a3"
        }
      }
    }
  },
  "semantic": {
    "background": {
      "primary": {
        "$type": "color",
        "$value": "{color.blue.500}"
      }
    },
    "text": {
      "default": {
        "$type": "color",
        "$value": {
          "colorSpace": "srgb",
          "components": [1, 1, 1],
          "hex": "#ffffff"
        }
      }
    }
  },
  "button": {
    "primary": {
      "background": {
        "$type": "color",
        "$value": "{semantic.background.primary}"
      },
      "text": {
        "$type": "color",
        "$value": "{semantic.text.default}"
      }
    }
  }
}
```

### Naming Conventions

**Recommended patterns:**

**Descriptive (base):**
- `color.blue.500`, `color.red.700`
- Pros: Clear, scalable with numeric increments
- Cons: Less memorable

**Semantic (alias):**
- `color.background.primary`, `color.text.default`
- Pros: Intent-driven, easy to understand
- Cons: Can become verbose

**Component-specific:**
- `button.primary.background`, `card.border.color`
- Pros: Clear ownership, easy refactoring
- Cons: Can cause token bloat

**Best practice structure:**
```
{category}.{concept}.{property}.{variant}.{state}
```

Examples:
- `color.background.primary`
- `spacing.inset.large`
- `button.primary.background.hover`

### Avoid Common Mistakes

**❌ Don't:**
```json
{
  "color-1": { "$value": "#0066cc" },
  "myButton_Color": { "$value": "#0066cc" }
}
```

**✅ Do:**
```json
{
  "color": {
    "brand": {
      "primary": {
        "$type": "color",
        "$value": {
          "colorSpace": "srgb",
          "components": [0, 0.4, 0.8],
          "hex": "#0066cc"
        }
      }
    }
  }
}
```

### Extensions

Add vendor-specific data without breaking compatibility:

```json
{
  "color-primary": {
    "$type": "color",
    "$value": {
      "colorSpace": "srgb",
      "components": [0, 0.4, 0.8],
      "hex": "#0066cc"
    },
    "$extensions": {
      "com.figma.metadata": {
        "styleId": "abc123",
        "scopes": ["ALL_FILLS"]
      },
      "org.mycompany.designSystem": {
        "category": "brand",
        "usage": "primary-actions"
      }
    }
  }
}
```

### Complete Real-World Example

```json
{
  "$description": "Design system tokens",
  "color": {
    "$type": "color",
    "blue": {
      "100": {
        "$value": {
          "colorSpace": "srgb",
          "components": [0.9, 0.95, 1],
          "hex": "#e6f2ff"
        }
      },
      "500": {
        "$value": {
          "colorSpace": "srgb",
          "components": [0, 0.4, 0.8],
          "hex": "#0066cc"
        }
      },
      "900": {
        "$value": {
          "colorSpace": "srgb",
          "components": [0, 0.13, 0.27],
          "hex": "#002144"
        }
      }
    },
    "gray": {
      "100": {
        "$value": {
          "colorSpace": "srgb",
          "components": [0.98, 0.98, 0.98],
          "hex": "#fafafa"
        }
      },
      "500": {
        "$value": {
          "colorSpace": "srgb",
          "components": [0.5, 0.5, 0.5],
          "hex": "#808080"
        }
      }
    }
  },
  "semantic": {
    "background": {
      "primary": {
        "$type": "color",
        "$value": "{color.blue.500}",
        "$description": "Primary background color for buttons and key UI elements"
      },
      "surface": {
        "$type": "color",
        "$value": "{color.gray.100}"
      }
    },
    "text": {
      "primary": {
        "$type": "color",
        "$value": "{color.blue.900}"
      },
      "inverse": {
        "$type": "color",
        "$value": {
          "colorSpace": "srgb",
          "components": [1, 1, 1],
          "hex": "#ffffff"
        }
      }
    }
  },
  "spacing": {
    "$type": "dimension",
    "xs": {
      "$value": { "value": 4, "unit": "px" }
    },
    "sm": {
      "$value": { "value": 8, "unit": "px" }
    },
    "md": {
      "$value": { "value": 16, "unit": "px" }
    },
    "lg": {
      "$value": { "value": 24, "unit": "px" }
    },
    "xl": {
      "$value": { "value": 32, "unit": "px" }
    }
  },
  "font": {
    "family": {
      "base": {
        "$type": "fontFamily",
        "$value": ["system-ui", "-apple-system", "Segoe UI", "sans-serif"]
      },
      "mono": {
        "$type": "fontFamily",
        "$value": ["Monaco", "Courier New", "monospace"]
      }
    },
    "size": {
      "$type": "dimension",
      "small": {
        "$value": { "value": 12, "unit": "px" }
      },
      "medium": {
        "$value": { "value": 16, "unit": "px" }
      },
      "large": {
        "$value": { "value": 20, "unit": "px" }
      },
      "xl": {
        "$value": { "value": 24, "unit": "px" }
      }
    },
    "weight": {
      "$type": "fontWeight",
      "normal": {
        "$value": 400
      },
      "bold": {
        "$value": 700
      }
    }
  },
  "shadow": {
    "small": {
      "$type": "shadow",
      "$value": {
        "color": {
          "colorSpace": "srgb",
          "components": [0, 0, 0],
          "alpha": 0.1
        },
        "offsetX": { "value": 0, "unit": "px" },
        "offsetY": { "value": 2, "unit": "px" },
        "blur": { "value": 4, "unit": "px" },
        "spread": { "value": 0, "unit": "px" }
      }
    },
    "medium": {
      "$type": "shadow",
      "$value": {
        "color": {
          "colorSpace": "srgb",
          "components": [0, 0, 0],
          "alpha": 0.15
        },
        "offsetX": { "value": 0, "unit": "px" },
        "offsetY": { "value": 4, "unit": "px" },
        "blur": { "value": 8, "unit": "px" },
        "spread": { "value": 0, "unit": "px" }
      }
    }
  },
  "button": {
    "primary": {
      "$type": "typography",
      "text": {
        "$value": {
          "fontFamily": "{font.family.base}",
          "fontSize": "{font.size.medium}",
          "fontWeight": "{font.weight.bold}",
          "letterSpacing": { "value": 0, "unit": "px" },
          "lineHeight": 1.5
        }
      },
      "background": {
        "$type": "color",
        "$value": "{semantic.background.primary}"
      },
      "color": {
        "$type": "color",
        "$value": "{semantic.text.inverse}"
      },
      "padding": {
        "$type": "dimension",
        "$value": "{spacing.md}"
      },
      "shadow": {
        "$type": "shadow",
        "$value": "{shadow.small}"
      }
    }
  }
}
```

## Validation Rules

**Token validation checklist:**

1. ✅ All tokens have `$value` property
2. ✅ Token names don't start with `$`
3. ✅ Token names don't contain `{`, `}`, or `.`
4. ✅ `$type` is either set directly or inherited from parent group
5. ✅ Values match the expected format for their type
6. ✅ References use valid syntax: `{group.token}` or `$ref` with JSON Pointer
7. ✅ No circular references in aliases or `$extends`
8. ✅ Dimension values include both `value` and `unit`
9. ✅ Color values include `colorSpace` and `components`
10. ✅ Font weight numeric values are in range [1, 1000]

## Tool Support

**Adoption by major tools:**
- Tokens Studio (Figma plugin)
- Style Dictionary
- Cobalt
- Terrazzo
- Amazon Style Dictionary
- Adobe Spectrum
- Material Design

## References

- **Official Spec:** https://www.designtokens.org/tr/drafts/format/
- **Color Module:** https://www.designtokens.org/tr/drafts/color/
- **GitHub:** https://github.com/design-tokens/community-group
- **W3C Community Group:** https://www.w3.org/community/design-tokens/

---

*Document based on DTCG W3C Specification (October 2025 draft)*