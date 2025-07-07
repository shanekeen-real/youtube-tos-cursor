# Yellow Dollar Landing Page Outline

This document outlines the structure, content, and components for the Yellow Dollar SaaS landing page. Use this as a blueprint for implementation and review.

---

## 🏠 Landing Page Sections

### 1. NavBar (Sticky, Top)
- **Purpose:** Brand, navigation, auth entry
- **Content:** Logo, NavLinks Pricing, Sign in/Sign up buttons, UserMenu (if logged in)
- **Components:** NavBar, Button, Icon, UserMenu
- **Layout Notes:**
  - Sticky at top, white background, 1px gray border bottom
  - Responsive: collapses to hamburger on mobile

---

### 2. Hero Section
- **Purpose:** Grab attention, communicate value prop
- **Content:**
  - Title (e.g., "Protect Your YouTube Revenue")
  - Subtitle (short, benefit-driven)
  - CTA Button ("Try for Free")
  - Media: image/video or animated illustration
- **Components:** Title, Subtitle, Button, Media
- **Layout Notes:**
  - 2-column on desktop (text left, media right), stacked on mobile
  - Large, bold typography
  - Plenty of whitespace

---

### 3. Features Overview
- **Purpose:** Highlight key features/benefits
- **Content:** 3-6 feature cards (icon, title, description)
- **Components:** FeatureCard, Icon, Grid
- **Layout Notes:**
  - Grid on desktop, stacked on mobile
  - Use brand yellow for highlights

---

### 4. Benefits/Revenue Safety
- **Purpose:** Explain how Yellow Dollar protects revenue
- **Content:** List of benefits, short explanations, maybe a visual (chart, shield, etc.)
- **Components:** Card, Icon, List
- **Layout Notes:**
  - Section with light gray background
  - Use green/red tags for risk/safety

---

### 5. Competitor Comparison Table 
- **Purpose:** Show why Yellow Dollar is better
- **Content:** Table comparing features/pricing with competitors
- **Components:** Table, Badge, Card
- **Layout Notes:**
  - Horizontal scroll on mobile
  - Highlight Yellow Dollar column

---

### 6. Pricing Section
- **Purpose:** Present plans, drive signups
- **Content:** Pricing cards for each tier, feature list, CTA
- **Components:** PricingCard, Button, Badge
- **Layout Notes:**
  - Cards in a row on desktop, stacked on mobile
  - Highlight "Most Popular" plan

---

### 7. FAQ Section
- **Purpose:** Address common objections/questions
- **Content:** 5-8 expandable FAQ items
- **Components:** FAQItem, Accordion
- **Layout Notes:**
  - Single column, easy to scan
  - Use plus/minus icons for expand/collapse

---

### 8. Footer
- **Purpose:** Secondary navigation, legal, socials
- **Content:** Logo, nav links, copyright, social icons
- **Components:** Footer, Icon
- **Layout Notes:**
  - Dark background, light text
  - Responsive: stack on mobile

---

### 9. SearchBar (Sticky, Bottom)
- **Purpose:** Quick access to main feature (analyze content)
- **Content:** Input, CTA button, icon
- **Components:** SearchBar, Input, Button, Icon
- **Layout Notes:**
  - Sticky at bottom, white background, 1px gray border top
  - Full width, mobile-friendly

---

## 📱 Mobile/Responsive Considerations
- All sections stack vertically on mobile
- NavBar collapses to hamburger
- Cards and tables become horizontally scrollable if needed
- Buttons and inputs are touch-friendly
- Sticky elements remain accessible

---

## 💡 Special UI/UX Notes
- Use micro-interactions for button hovers, card focus, etc.
- Animate section transitions (Framer Motion)
- Use real copy/images as soon as possible
- Test for accessibility and performance

---

*Update this outline as the landing page evolves.* 