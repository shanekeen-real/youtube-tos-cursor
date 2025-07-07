# Yellow Dollar Component Inventory

This document lists all UI components (atomic, molecular, and section-level) for the Yellow Dollar SaaS app. Use this as a checklist and reference for implementation and design consistency.

---

## 🧩 Atomic Components
| Component      | Variants/States                | Props/Notes                        | Source         |
|----------------|-------------------------------|------------------------------------|----------------|
| Button         | Primary, Secondary, Outlined, Danger, Success, Loading, Disabled | size, variant, icon, fullWidth     | shadcn/ui + custom |
| Input          | Text, Email, Password, Search  | label, placeholder, error, icon    | shadcn/ui      |
| Textarea       | Standard, Auto-resize          | label, placeholder, error          | shadcn/ui      |
| Select         | Standard, With icons           | options, label, error              | shadcn/ui      |
| Checkbox       | Standard                       | label, checked, error              | shadcn/ui      |
| Radio          | Standard                       | label, checked, error              | shadcn/ui      |
| Switch         | Standard                       | checked, label                     | shadcn/ui      |
| Badge/Tag/Pill | Risk (red), Safe (green), Neutral (gray) | text, color, icon                | shadcn/ui + custom |
| Icon           | Lucide, Custom SVG             | name, size, color                  | lucide-react   |

---

## 🏗️ Molecular Components
| Component      | Description                    | Props/Notes                        | Source         |
|----------------|-------------------------------|------------------------------------|----------------|
| Card           | For content, pricing, features | title, children, variant           | shadcn/ui + custom |
| FeatureCard    | For feature highlights         | icon, title, description           | custom         |
| PricingCard    | For pricing tiers              | tier, price, features, cta         | custom         |
| FAQItem        | Expandable Q&A                 | question, answer                   | shadcn/ui Accordion |
| Table          | For comparisons                | columns, rows, highlight           | shadcn/ui Table |
| ProgressBar    | For loading, progress          | value, max, color                  | shadcn/ui      |
| Toast          | For notifications              | title, description, type           | shadcn/ui      |
| Modal/Dialog   | For auth, info, actions        | open, onClose, title, children     | shadcn/ui      |
| Tooltip        | For hints/help                 | content, children                  | shadcn/ui      |

---

## 🧱 Section Components (Landing Page)
| Section        | Description                    | Components Used                    |
|----------------|-------------------------------|------------------------------------|
| NavBar         | Top navigation, sticky         | Logo, NavLinks, Button, UserMenu   |
| Hero           | Main headline, subtitle, media | Title, Subtitle, CTA, Media        |
| Features       | Feature highlights             | FeatureCard, Icon, Grid            |
| Benefits       | Revenue safety, outcomes       | Card, Icon, List                   |
| Comparison     | Competitor table               | Table, Badge, Card                 |
| Pricing        | Pricing cards, CTA             | PricingCard, Button, Badge         |
| FAQ            | Expandable Q&A                 | FAQItem, Accordion                 |
| Footer         | Links, copyright, socials      | Logo, NavLinks, Icon               |
| SearchBar      | Sticky bottom search           | Input, Button, Icon                |

---

## 📝 Implementation Notes
- **shadcn/ui**: Use as base for all primitives, customize for brand
- **Radix UI**: Used under the hood by shadcn/ui for accessibility
- **Custom**: For unique branding or layout needs
- **Props**: Document all props for each component as you build
- **Variants**: Use CVA for scalable variants
- **Testing**: Add unit and visual tests for all components

---

*Update this doc as components are added, updated, or removed.* 