# Yellow Dollar Design System

## Branding
- **Name:** Yellow Dollar
- **Core Colors:** Yellow, White, Gray, Black
- **Accent Colors:** Red (risk), Green (safe)
- **Font:** Archivo or Satoshi (use three weights/sizes per card/section)

---

## 🎨 Color Palette
| Name         | Hex       | Usage                        |
|--------------|-----------|------------------------------|
| Yellow       | #F6C232   | Primary brand, highlights    |
| Black        |rgb(15, 11, 11)   | Text, nav, footer            |
| White        | #FFFFFF   | Background, cards            |
| Light Gray   | #F5F5F5   | Background, card fill        |
| Medium Gray  | #E0E0E0   | Borders, dividers            |
| Dark Gray    | #212121   | Headings, strong text        |
| Red          | #FF3B30   | Risk/alert tags/pills        |
| Green        | #00C853   | Safe/success tags/pills      |

---

## 🅰️ Typography
- **Font:** Archivo or Satoshi (webfont, fallback to system-ui)
- **Font Weights:** 400 (Regular), 600 (SemiBold), 700 (Bold)
- **Font Sizes:**
  - Display: 3rem (Hero)
  - Title: 2rem
  - Subtitle: 1.25rem
  - Body: 1rem
  - Caption: 0.875rem
- **Line Height:** 1.2 (headings), 1.5 (body)
- **Rule of Three:** Use three distinct font sizes/weights per card/section for hierarchy

---

## 📏 Spacing & Layout
- **Spacing Scale:** 4px, 8px, 16px, 24px, 32px, 48px
- **Card Padding:** 24px (desktop), 16px (mobile)
- **Section Padding:** 48px top/bottom (desktop), 24px (mobile)
- **Grid Gaps:** 24px (desktop), 16px (mobile)
- **White Space:** Generous, especially around cards and CTAs

---

## ⬜ Borders & Surfaces
- **No Shadows**
- **Border Radius:** 12px (cards, buttons, inputs)
- **Border Color:** #E0E0E0 (Medium Gray)
- **Card Background:** #FFFFFF (White) or #F5F5F5 (Light Gray)

---

## 🧩 Components
### Buttons
- **Variants:** Primary (Yellow), Secondary (Gray), Outlined, Danger (Red), Success (Green)
- **States:** Default, Hover, Focus, Disabled
- **Border Radius:** 12px
- **No shadows**

### Cards
- **Border:** 1px solid #E0E0E0
- **Radius:** 12px
- **No shadow**
- **Padding:** 24px

### Tags/Pills
- **Risk:** Red background, white text
- **Safe:** Green background, white text
- **Neutral:** Gray background, black text
- **Radius:** 9999px (fully rounded)

### Inputs
- **Border:** 1px solid #E0E0E0
- **Radius:** 12px
- **Focus:** 2px solid #FFD600 (Yellow)

### NavBar & SearchBar
- **Sticky** (top and bottom)
- **Background:** White
- **Border:** 1px solid #E0E0E0
- **Height:** 64px (desktop), 56px (mobile)

---

## 🌗 Dark Mode (Future-Proofing)
- Use CSS variables for all colors
- Plan for dark backgrounds, white/yellow text, and accessible contrast

---

## 🛠 Implementation Notes
- Use Tailwind CSS for utility classes, extend with custom theme in `tailwind.config.ts`
- Use shadcn/ui for base components, customize as needed
- Use Framer Motion for micro-interactions
- Test all color/contrast for accessibility (WCAG AA+)

---

## 📚 References
- [shadcn/ui](https://ui.shadcn.com/)
- [Radix UI](https://www.radix-ui.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Archivo Font](https://fonts.google.com/specimen/Archivo)
- [Satoshi Font](https://www.fontshare.com/fonts/satoshi)

---

*Update this doc as the design system evolves.* 