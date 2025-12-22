# Public Customer-Facing Pages

## Overview
This directory contains the customer-facing pages for the ticket booking website, converted from Bootstrap HTML to React TypeScript with Material-UI.

## Pages

### 1. Home (`/`)
- **Location**: `src/pages/Public/Home/index.tsx`
- **Features**:
  - Auto-rotating image carousel (3 slides)
  - Upcoming events section with event cards
  - Responsive design matching original Bootstrap layout
  - Event cards with hover effects
  - "TICKETS" button linking to event details

### 2. Event Details (`/event/:id`)
- **Location**: `src/pages/Public/EventDetails/index.tsx`
- **Features**:
  - Event information (left column)
  - Ticket booking form (right column)
  - Showtime selection (radio buttons)
  - Ticket category selection with quantity dropdowns
  - Real-time total calculation
  - Payment modal with customer information form
  - Payment method selection (Visa, Mastercard, Amex, HNB, eZ Cash)

## Components

### PublicNavbar
- **Location**: `src/components/public/PublicNavbar.tsx`
- **Features**:
  - Fixed top navigation bar
  - "Tickets.lk" branding
  - Navigation links (About, Services, Contact)
  - Social media icons (Facebook, Twitter)
  - Mobile responsive with drawer menu

## Design Specifications

### Colors
- Background: `#242a33` (dark blue-gray)
- Primary: `#ff1955` (pink/red)
- Secondary: `#fcd0a5` (beige)
- Text: `#fff` (white), `#333` (dark)

### Typography
- Font Family: **Raleway** (Google Fonts)
- Weights: 300 (Light), 700 (Bold), 900 (Black)

### Images
All images are located in `public/images/`:
- Carousel slides: `1.jpg`, `2.jpg`, `3.jpg`
- Event backgrounds: `home-upcoming-events1.jpg`, `home-upcoming-events2.jpg`
- Event details background: `mt-0390-tickets-bg.jpg`
- Payment methods: `visa.jpg`, `master.jpg`, `amex.jpg`, `hnb.jpg`, `ezcash.jpg`

## Routing

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Home | Homepage with carousel and events |
| `/home` | Home | Alternative homepage route |
| `/event/:id` | EventDetails | Event details and ticket booking |

## Admin Routes (Updated)

All admin routes now have `/admin` prefix:
- `/admin/login` - Admin login
- `/admin/dashboard` - Admin dashboard
- `/admin/events` - Events management
- etc.

## Key Features

✅ **Pixel-Perfect Conversion**: Exact match to original Bootstrap design
✅ **Material-UI Components**: Modern React components
✅ **TypeScript**: Full type safety
✅ **Responsive Design**: Mobile, tablet, and desktop support
✅ **Auto-Rotating Carousel**: 5-second intervals
✅ **Interactive Elements**: Hover effects, transitions
✅ **Payment Integration**: Modal with payment method selection
✅ **Real-Time Calculations**: Dynamic ticket total updates

## Usage

### Running the Application

\`\`\`bash
cd ticket-booking-admin
npm start
\`\`\`

### Building for Production

\`\`\`bash
npm run build
\`\`\`

### Accessing Pages

1. **Customer Homepage**: http://localhost:3000/
2. **Event Details**: http://localhost:3000/event/1
3. **Admin Portal**: http://localhost:3000/admin/login

## Next Steps

- [ ] Connect to backend API for real event data
- [ ] Implement actual payment gateway integration
- [ ] Add event search and filtering
- [ ] Add user authentication for booking
- [ ] Implement booking confirmation and ticket generation
- [ ] Add email notifications
- [ ] SEO optimization for public pages

## Notes

- Original design files are preserved in `ticket-booking-system/design-files/html-2/`
- All images are copied to `public/images/`
- Raleway font is loaded via Google Fonts CDN
- The design maintains exact spacing, colors, and typography from the original Bootstrap version
