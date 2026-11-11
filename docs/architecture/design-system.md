# Design System — Jago Coffee Two-Role Architecture

## Global Design Tokens

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| primary | #4CAF50 | Primary action buttons, nav highlights |
| secondary | #607D8B | Secondary text, inactives |
| accent | #FF9800 | Warning/error highlights |
| success | #8BC341 | Success states |
| background | #FFFFFF | Page background |
| surface | #F5F5F5 | Card/surface backgrounds |
| text-primary | #212121 | Main text color |
| text-secondary | #757575 | Secondary text |
| border | #E0E0E0 | Input borders, dividers |

### Typography
| Property | Value |
|----------|-------|
| Font Family | 'Montserrat', 'Open Sans', sans-serif |
| Base Font Size | 16px |
| Heading Scale | h1: 32px, h2: 24px, h3: 20px, h4: 18px |
| Font Weights | 400 (normal), 600 (semi-bold), 700 (bold), 900 (extra-bold) |
| Line Height | 1.5 base |
| Letter Spacing | 0.5px base |

### Spacing Scale (4px base)
- 4: small gaps
- 8: standard gap
- 12: card padding
- 16: container margin
- 24: section gap
- 32: large gap
- 48: page margin
- 64: extra-large gap
- 96: hero section

### Border Radius
- Default: 4px
- Card: 8px
- Modal: 8px
- Button: 4px

### Shadows
- Card: 0 2px 4px rgba(0,0,0,0.1)
- Modal: 0 4px 12px rgba(0,0,0,0.15)
- Focus: 0 0 0 2px rgba(76, 175, 80, 0.4)

### Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Laptop: 1024px - 1440px
- Desktop: > 1440px

## Component Library

### Button Variants
- **Primary**: Green background (#4CAF50), white text, hover darker
- **Secondary**: White background, green text/border, hover green text
- **Danger**: Red background (#f44336), white text
- **Outline**: White background, green text/border, hover green bg
- **Disabled**: 50% opacity, no hover
- **Loading**: Spinner inside, disabled state

### Input/Select Variants
- Standard input: white bg, border #E0E0E0, focus #4CAF50
- Select: same as input with arrow
- Textarea: same as input, min-height 100px

### Card
- White background
- 8px border-radius
- 4px shadow
- Hover: lift shadow

### Modal/Drawer
- White background
- 8px border-radius
- Full-width on mobile, 50% on desktop
- Header with close button
- Footer with action buttons

### Empty State
- Centered illustration/icon
- Title: "Tidak Ada Data"
- Optional description text
- Action button (if applicable)

### Toast/Notification
- Auto-dismiss after 3 seconds
- Color-coded: success=green, error=red, info=primary
- Bottom or top position
- Never overlap important content

### Tables (Admin)
- Zebra striping (alternating row bg)
- Hover row highlight
- Pagination controls
- Export CSV button (if data > 50 rows)

## Color Palette Reference (from Official Brand)

### Verified from Jago Coffee Website
- Primary: #4CAF50 (green) - brand color
- Secondary: #757575 (gray) - text
- Accent: #FF9800 (orange) - secondary actions
- White: #FFFFFF - backgrounds
- Black/Primary Text: #212121 - main text
- Disabled Text: #757575 - secondary text

## Usage Rules

1. **Never hardcode colors** in JS/CSS — use design tokens
2. **All buttons must have accessible contrast** (min 4.5:1)
3. **All text minimum 16px** for body copy
4. **Focus states required** on all interactive elements
5. **Responsive by default** — mobile-first approach
6. **No seller-specific colors or branding** — only Jago Coffee brand
7. **Admin uses same design tokens** — different layout only

## File Structure (resources/views/)

```
resources/
├── views/
│   ├── layouts/
│   │   ├── customer-layout.html    ← Shared customer layout
│   │   └── admin-layout.html       ← Shared admin layout
│   │   └── auth-layout.html        ← Login/register layout
│   ├── components/
│   │   ├── navbar.html            ← Customer/navbar
│   │   ├── footer.html            ← Shared footer
│   │   ├── product-card.html      ← Menu products
│   │   ├── form-field.html        ← Input/form
│   │   ├── empty-state.html       ← Empty state
│   │   └── toast.html             ← Notification
│   ├── customer/
│   │   ├── home.html
│   │   ├── menu.html
│   │   ├── cart.html
│   │   ├── checkout.html
│   │   ├── jago-party.html
│   │   ├── orders.html
│   │   ├── profile.html
│   │   └── wishlist.html
│   └── admin/
│       ├── dashboard.html
│       ├── orders.html
│       ├── customers.html
│       ├── products.html
│       ├── jago-party-list.html
│       └── settings.html
└── styles/
    ├── global.css                ← Design tokens
    ├── components.css            ← Reusable components
    ├── customer.css             ← Page-specific customer
    └── admin.css                ← Page-specific admin
```

## Design Verification Checklist

- [ ] All colors from verified official brand (#4CAF50 green)
- [ ] No seller branding elements remain
- [ ] All interactive elements have focus states
- [ ] Responsive at mobile (390px), tablet (768px), desktop (1440px)
- [ ] No horizontal overflow on any viewport
- [ ] Brand-consistent typography (Montserrat/Open Sans)
- [ ] Consistent spacing (4px base unit)
- [ ] Empty states present where data may be empty
- [ ] Loading skeletons present where async data
- [ ] Error states present where API may fail