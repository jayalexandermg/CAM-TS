# Designer Agent Context

## Design System Foundations

### Typography Scale

```
Display:    48px / 1.1 line-height / -0.02em letter-spacing
H1:         36px / 1.2 line-height / -0.01em letter-spacing
H2:         30px / 1.25 line-height / 0
H3:         24px / 1.3 line-height / 0
H4:         20px / 1.4 line-height / 0
Body Large: 18px / 1.5 line-height / 0
Body:       16px / 1.5 line-height / 0
Body Small: 14px / 1.5 line-height / 0
Caption:    12px / 1.4 line-height / 0.01em letter-spacing
```

### Spacing Scale (8px base)

```
xs:   4px   (0.25rem)
sm:   8px   (0.5rem)
md:   16px  (1rem)
lg:   24px  (1.5rem)
xl:   32px  (2rem)
2xl:  48px  (3rem)
3xl:  64px  (4rem)
4xl:  96px  (6rem)
```

### Color System

```
Primary:    #6366F1 (Indigo 500)
Secondary:  #8B5CF6 (Violet 500)
Success:    #10B981 (Emerald 500)
Warning:    #F59E0B (Amber 500)
Error:      #EF4444 (Red 500)
Info:       #3B82F6 (Blue 500)

Neutral:
  50:  #FAFAFA
  100: #F4F4F5
  200: #E4E4E7
  300: #D4D4D8
  400: #A1A1AA
  500: #71717A
  600: #52525B
  700: #3F3F46
  800: #27272A
  900: #18181B
```

## Component Patterns

### Button States
- **Default**: Base styling, ready for interaction
- **Hover**: Slight elevation or color shift
- **Active/Pressed**: Reduced elevation, color darkens
- **Focus**: Visible focus ring (3px offset, primary color)
- **Disabled**: 50% opacity, cursor: not-allowed
- **Loading**: Spinner replaces text/icon, disabled interaction

### Form Input States
- **Empty**: Placeholder text visible
- **Focused**: Border color change, optional label animation
- **Filled**: Value visible, placeholder hidden
- **Valid**: Success indicator (green checkmark)
- **Invalid**: Error state (red border, error message below)
- **Disabled**: Reduced opacity, not editable
- **Read-only**: Editable appearance removed, value visible

### Modal Dialog Pattern
```
┌─────────────────────────────────────┐
│ [Icon] Title                    [X] │  ← Header with close
├─────────────────────────────────────┤
│                                     │
│  Content area with adequate         │
│  padding and readable line          │
│  length (max 65-75 characters)      │
│                                     │
├─────────────────────────────────────┤
│              [Cancel] [Primary]     │  ← Action buttons right-aligned
└─────────────────────────────────────┘
```

### Card Component
```
┌─────────────────────────────────────┐
│  ┌─────────────────────────────┐    │
│  │        Image/Media          │    │
│  └─────────────────────────────┘    │
│                                     │
│  Title (H3 or H4)                   │
│  Subtitle/metadata (muted)          │
│                                     │
│  Body text with reasonable          │
│  padding and line length.           │
│                                     │
│  [Action Button]                    │
└─────────────────────────────────────┘
```

## Accessibility Guidelines (WCAG 2.1)

### Color Contrast Requirements

| Element Type | Minimum Ratio (AA) | Enhanced (AAA) |
|--------------|-------------------|----------------|
| Normal text | 4.5:1 | 7:1 |
| Large text (18px+ or 14px+ bold) | 3:1 | 4.5:1 |
| UI components & graphics | 3:1 | N/A |
| Focus indicators | 3:1 | N/A |

### Keyboard Navigation Checklist
- [ ] All interactive elements focusable via Tab
- [ ] Logical tab order (follows visual flow)
- [ ] Visible focus indicator on all elements
- [ ] Skip links for main content
- [ ] Escape key closes modals/menus
- [ ] Arrow keys navigate within components
- [ ] Enter/Space activate buttons and links

### Screen Reader Requirements
- [ ] All images have alt text (or empty alt for decorative)
- [ ] Form inputs have associated labels
- [ ] Landmarks used (main, nav, header, footer)
- [ ] Headings follow hierarchy (no skipping levels)
- [ ] Link text is descriptive (not "click here")
- [ ] Tables have headers and scope attributes
- [ ] ARIA labels for icon-only buttons
- [ ] Live regions for dynamic content

### Focus Management
```javascript
// Trap focus in modal
const focusableElements = modal.querySelectorAll(
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
);
const firstElement = focusableElements[0];
const lastElement = focusableElements[focusableElements.length - 1];

// Return focus when modal closes
const previouslyFocused = document.activeElement;
// ... on close: previouslyFocused.focus();
```

## Responsive Breakpoints

```
Mobile:      320px  - 639px   (sm)
Tablet:      640px  - 1023px  (md)
Desktop:     1024px - 1279px  (lg)
Large:       1280px - 1535px  (xl)
Extra Large: 1536px+          (2xl)
```

### Common Responsive Patterns

**Stack to Grid**
- Mobile: Single column stack
- Tablet: 2-column grid
- Desktop: 3-4 column grid

**Navigation**
- Mobile: Hamburger menu → drawer
- Tablet: Condensed horizontal nav
- Desktop: Full horizontal nav with dropdowns

**Tables**
- Mobile: Card-based or horizontal scroll
- Tablet+: Standard table layout

## Heuristic Evaluation Checklist

### Nielsen's 10 Usability Heuristics

1. **Visibility of system status**
   - [ ] Loading states shown
   - [ ] Progress indicators for long tasks
   - [ ] Success/error feedback immediate

2. **Match between system and real world**
   - [ ] Familiar language used
   - [ ] Icons are recognizable
   - [ ] Natural logical order

3. **User control and freedom**
   - [ ] Undo available
   - [ ] Easy navigation back
   - [ ] Cancel options provided

4. **Consistency and standards**
   - [ ] Platform conventions followed
   - [ ] Internal consistency maintained
   - [ ] Same words for same actions

5. **Error prevention**
   - [ ] Confirmation for destructive actions
   - [ ] Constraints prevent invalid input
   - [ ] Good defaults provided

6. **Recognition rather than recall**
   - [ ] Options visible
   - [ ] Recent items accessible
   - [ ] Help in context

7. **Flexibility and efficiency of use**
   - [ ] Keyboard shortcuts available
   - [ ] Frequently used actions accessible
   - [ ] Customization options

8. **Aesthetic and minimalist design**
   - [ ] No unnecessary information
   - [ ] Visual hierarchy clear
   - [ ] Whitespace used effectively

9. **Help users recognize, diagnose, and recover from errors**
   - [ ] Error messages in plain language
   - [ ] Problem clearly identified
   - [ ] Solution suggested

10. **Help and documentation**
    - [ ] Easy to search
    - [ ] Task-focused
    - [ ] Concise steps listed

## Design Handoff Checklist

- [ ] All states documented (default, hover, active, disabled, error)
- [ ] Spacing values specified
- [ ] Typography tokens referenced
- [ ] Color tokens referenced
- [ ] Responsive behavior described
- [ ] Animation/transition timing noted
- [ ] Accessibility requirements listed
- [ ] Edge cases addressed (empty states, loading, errors)
- [ ] Copy/microcopy finalized
