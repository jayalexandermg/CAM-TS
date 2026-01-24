<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# DESIGN_SYSTEM_CASE_STUDIES.md: Key Strategies and Schemas from Figma, Stripe, Primer, Polaris

## Token Architecture Patterns

### Three-Tier Token Hierarchy

The most successful design systems implement a multi-tier token architecture that separates concerns between **what**, **how**, and **where** design values are used.[^1_1][^1_2]

**Primitive Tokens (Base Layer)** represent raw values and define what properties exist within the system. These are reference-only tokens that map directly to values like `color-scale-pink-5` or specific hex codes. Primitive tokens don't respect color modes and should never be used directly in designs.[^1_2][^1_1]

**Semantic Tokens (Functional Layer)** provide context on how tokens should be used, representing global UI patterns such as text, borders, shadows, and backgrounds. Examples include `borderColor-sponsors-emphasis` or `surface/brand-contrast`. These tokens reference primitive tokens and respect color modes, making them the most commonly used throughout design systems.[^1_1][^1_2]

**Component-Specific Tokens** communicate where a token can be used, following naming patterns like `button-primary-background-default`. This detailed level is more common in enterprise-level systems and may not be necessary for every organization.[^1_2]

## Figma's Design System Approach

### Variables and Styles Integration

Figma's architecture uses both variables and styles to implement tokens, as each serves distinct purposes. Variables support complex token structures through aliasing, multiple modes for theming, scoping for usage specification, and code syntax for developer handoff. Styles complement variables by supporting color gradients and composite values like multiple fills or shadow effects.[^1_2]

### Token Aliasing Strategy

Aliasing allows tokens to reference other tokens, creating cascading updates throughout the system. When a referenced token changes, all tokens aliasing it update automatically. This enables organizing tokens into categories and sub-categories that communicate usage patterns without unintentionally affecting unrelated assets.[^1_2]

### Adoption Measurement

Pinterest's implementation of Figma tokens demonstrates measurable success tracking. Their design technologist Ravi Lingineni developed FigStats using Figma's REST API to track Gestalt (Pinterest's design system) usage across all Figma files nightly, producing adoption percentages that quantify design system investment impact.[^1_3]

## GitHub Primer Design System

### Inverted Scale Architecture

Primer employs an innovative inverted neutral scale approach where light scales start with white and dark scales start with black. This inversion allows light and dark themes to share functional color tokens without custom overrides, reducing maintenance complexity.[^1_1]

### Semantic Color Roles

Primer defines eight semantic color roles with specific meanings :[^1_1]

- **Accent**: Links, selected, active, focus states, neutral information
- **Success**: Primary buttons, positive messaging, successful states
- **Attention**: Warning states, active processes like queued PRs
- **Danger**: Danger buttons and error states
- **Open/Closed/Done**: Task and PR state representation
- **Sponsors**: GitHub Sponsors-related elements

Each semantic color provides foreground, background, and border variants with both `muted` and `emphasis` options.[^1_1]

### Contrast Management System

Primer's neutral scales use steps 0-13, with specific contrast ratios calculated against `bgColor-muted` to ensure proper accessibility. Steps 1-6 cover backgrounds, 7-8 handle borders (with step 8 as minimum contrast for interactive controls), and steps 9-10 provide text contrast meeting WCAG requirements.[^1_1]

## Stripe Elements Architecture

### Appearance API Customization

Stripe's design system centers on the Elements Appearance API, enabling visual customization while maintaining consistent layouts. The system starts with prebuilt themes (`stripe`, `night`, `flat`) that serve as foundations for customization.[^1_4]

### Three-Level Customization Hierarchy

Stripe's customization follows a progressive enhancement model :[^1_4]

1. **Theme Selection**: Choose base theme matching website aesthetic
2. **Variable-Level Customization**: Set broad variables like `fontFamily` and `colorPrimary` affecting all components
3. **Rule-Based Fine-Tuning**: Apply custom CSS properties to individual components and states

This hierarchy allows developers to achieve brand consistency with minimal configuration while supporting detailed customization when needed.[^1_4]

### Security-Focused Component Design

Stripe's architecture prioritizes PCI-DSS compliance through tokenization and secure data handling. Components are designed to collect sensitive payment information without exposing it to the application layer, maintaining security while providing customization flexibility.[^1_5]

## Shopify Polaris Design System

### Functional Organization Strategy

Polaris organizes components by functional categories rather than visual characteristics :[^1_6][^1_7]

- **Actions**: Account connections, buttons, button groups, page actions
- **Layout and Structure**: Bleed, box stack, callout cards, dividers, grids
- **Selection and Input**: Autocomplete, date pickers, forms, filters
- **Images and Icons**: Avatars, icons, keyboard keys, thumbnails
- **Feedback Indicators**: Badges, banners, exception lists, spinners
- **Lists and Tables**: Data tables, action lists, option lists
- **Navigation**: Tabs, footer help, links, pagination

This organization helps developers quickly locate components based on intended functionality rather than appearance.[^1_7]

### Token System for Admin Consistency

Polaris tokens standardize color, typography, spacing, and breakpoints to create consistent Shopify admin experiences. The token system enables developers to build apps that feel native to Shopify's admin interface, with variables that Shopify itself uses internally.[^1_8][^1_6][^1_7]

### Pattern-Based Guidance

Beyond components, Polaris provides pattern documentation covering screen structure, page components, standard layouts, and navigation best practices. This pattern library guides developers on arranging page layouts according to Shopify's UX principles.[^1_7]

## Cross-System Best Practices

### Token Naming Conventions

Successful design systems follow consistent naming principles :[^1_2]

- Use full words instead of abbreviations to reduce ambiguity
- Maintain consistent prefixes (e.g., all background colors start with "background")
- Create language-neutral names for international team accessibility
- Future-proof tokens by anticipating system growth
- Avoid brand-specific names to enable broader context usage


### Design-Code Synchronization

Modern design systems use tokens as the vocabulary for AI-driven design-to-code workflows. Semantic token names like `color-text-primary` enable AI tools to understand design intent rather than just visual output, improving code generation quality. This approach creates cross-platform harmony where the same tokens work across web, mobile, and desktop.[^1_9]

### Governance Through Architecture

Token architecture functions as implicit governance. Robust structures create clear boundaries between token types, enforce proper usage patterns, and prevent inconsistent implementations without requiring heavy-handed process oversight.[^1_10]

### Scalability Patterns

All four systems demonstrate scalability through :[^1_3][^1_7][^1_4][^1_1]

- Single source of truth eliminating design debates
- Centralized documentation serving multiple audiences
- Automated synchronization between design and code
- Component reusability reducing development time
- Theme support through token aliasing and modes

These architectural patterns enable teams to maintain consistency while scaling across products, platforms, and growing design teams.
<span style="display:none">[^1_11][^1_12][^1_13][^1_14][^1_15][^1_16][^1_17][^1_18][^1_19][^1_20][^1_21][^1_22][^1_23][^1_24][^1_25][^1_26][^1_27][^1_28][^1_29][^1_30][^1_31][^1_32][^1_33][^1_34][^1_35][^1_36][^1_37][^1_38][^1_39][^1_40][^1_41][^1_42][^1_43][^1_44][^1_45][^1_46][^1_47][^1_48][^1_49]</span>

<div align="center">⁂</div>

[^1_1]: https://primer.style/product/getting-started/foundations/color-usage

[^1_2]: https://help.figma.com/hc/en-us/articles/18490793776023-Update-1-Tokens-variables-and-styles

[^1_3]: https://www.figma.com/blog/design-systems-from-the-basics-to-big-things-ahead/

[^1_4]: https://docs.stripe.com/elements/appearance-api

[^1_5]: https://www.systemdesignhandbook.com/guides/stripe-system-design-interview/

[^1_6]: https://brainspate.com/blog/shopify-polaris-guide/

[^1_7]: https://ecomm.design/shopify-polaris/

[^1_8]: https://resources.storetasker.com/blog/how-to-build-your-shopify-app-with-polaris

[^1_9]: https://www.intodesignsystems.com/blog/why-every-designer-should-learn-design-tokens-to-get-ready-for-figma-mcp-ai

[^1_10]: https://www.reddit.com/r/DesignSystems/comments/1ja96hb/how_i_learned_the_hard_way_that_token/

[^1_11]: https://www.figma.com/community/file/1385187229049950367/design-token-architecture-nomenclature

[^1_12]: https://www.designsystemscollective.com/the-evolution-of-design-system-tokens-a-2025-deep-dive-into-next-generation-figma-structures-969be68adfbe

[^1_13]: https://www.contentful.com/blog/design-token-system/

[^1_14]: https://primer.style/product/components/token/

[^1_15]: https://docs.stripe.com/stripe-apps/components

[^1_16]: https://primer.style

[^1_17]: https://www.figma.com/blog/a-tale-of-two-parameter-architectures/

[^1_18]: https://stripe.com/payments/elements

[^1_19]: https://github.com/primer/react

[^1_20]: https://designstrategy.guide/design-tokens-101/

[^1_21]: https://blog.quastor.org/p/architecture-stripes-document-database

[^1_22]: https://github.blog/engineering/user-experience/unlocking-inclusive-design-how-primers-color-system-is-making-github-com-more-inclusive/

[^1_23]: https://www.figma.com/community/file/1493733526012952249/design-tokens-systems-governance-process

[^1_24]: https://selma.digital/building-a-design-system-for-scalable-fintech-growth/

[^1_25]: https://github.com/sturobson/Awesome-Design-Tokens

[^1_26]: https://docs.stripe.com/stripe-apps/design

[^1_27]: https://blog.getflits.com/shopify-polaris-design-system-flits-ux/

[^1_28]: https://www.bornfight.com/blog/design-systems-design-tokens-atomic-design-the-art-of-scaling-design/

[^1_29]: https://docs.stripe.com/payments/elements

[^1_30]: https://github.com/primer/primitives

[^1_31]: https://dev.to/sgchris/building-a-payment-system-stripes-architecture-for-financial-transactions-3mlg

[^1_32]: https://github.blog/news-insights/product-news/accelerating-github-theme-creation-with-color-tooling/

[^1_33]: https://www.youtube.com/watch?v=0HrQ9WWuD5U

[^1_34]: https://github.com/stripe/elements-examples

[^1_35]: https://github.com/coder/coder/issues/14780

[^1_36]: https://docs.recurly.com/recurly-subscriptions/docs/stripe-payment-elements

[^1_37]: https://www.youtube.com/watch?v=VzJ4KCz_8po

[^1_38]: https://www.reddit.com/r/DesignSystems/comments/1it1erb/3tier_design_token_system/

[^1_39]: https://www.designrush.com/best-designs/websites/trends/design-system-examples

[^1_40]: https://www.brainvire.com/blog/shopify-polaris-guide-for-developers/

[^1_41]: https://www.casestudy.club/case-studies

[^1_42]: https://www.thegenielab.com/blogs/articles/how-to-use-shopifys-design-system-polaris

[^1_43]: https://www.uxpin.com/studio/blog/best-design-system-examples/

[^1_44]: https://www.netguru.com/blog/key-design-systems-trends-and-best-practices

[^1_45]: https://forum.figma.com/ask-the-community-7/design-tokens-for-new-design-system-2-or-3-tier-42643

[^1_46]: https://uxplaybook.org/articles/ux-case-study-minto-pyramid-structure-guide

[^1_47]: https://www.zeroheight.com/blog/figma-variables-and-design-tokens-part-one-variable-architecture/

[^1_48]: https://www.reddit.com/r/UXDesign/comments/1hv8z7c/portfolio_case_study_and_resume_feedback_january/

[^1_49]: https://www.designsystemscollective.com/design-tokens-that-scale-mastering-multi-tier-architecture-for-modern-design-systems-96429b2fcee7

