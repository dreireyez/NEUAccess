# **App Name**: NEU Access

## Core Features:

- Google Authentication: Secure sign-in exclusively via Google, validating that user emails strictly end with '@neu.edu.ph'.
- College Onboarding: Upon first login, users select their academic college from a predefined list, which is then stored in Firestore.
- Library Visit Logger: Users can record the purpose of their library visit by clicking pre-defined buttons, logging the activity to Firestore.
- Personal Visit History: Users view a clean table of their recent library visits and two summary cards detailing their activity.
- User Access Management: Admin users can toggle a user's 'isBlocked' status in Firestore to manage access to the application.
- Aggregate Visit Statistics: Staff and Admin users view key library usage statistics (Today, This Week, This Month) in summary cards.
- User and Visit Search: Admin and Staff can search through all user accounts and visit logs, with role-based view or edit permissions.

## Style Guidelines:

- Primary brand color, used for navigation, sidebars, and gradient overlays: Deep University Blue (#0B3D73).
- Key interactive elements and primary call-to-actions (CTAs) are highlighted with Gold (#D4AF37).
- Hover states and additional accents are vibrant Bright Gold (#F2C94C) for clear user feedback.
- Clean panels, cards, and button backgrounds utilize Pure White (#FFFFFF) for a stark contrast.
- The general application background is a subtle Light Gray (#F5F5F5) to ensure visual comfort.
- Standard typography and primary text are set in a readable Dark Text color (#333333).
- All text uses 'Inter' (grotesque-style sans-serif) for its modern, neutral, and highly legible appearance, suitable for both headlines and body copy.
- Employ a minimalist set of line-art or outline-style icons. Icons should adopt the Deep University Blue or Dark Text color, maintaining a consistent aesthetic.
- All layouts adhere strictly to a mobile-first approach, utilizing 'flex-col' for mobile screens and adapting to 'md:flex-row' for desktop arrangements. Fixed navigation bars and sidebars for administrative views are essential.
- Login page features a distinct split-screen layout with an 'object-cover' university image on one half and content panel on the other.
- Dynamic content grids are used for interactive button selections (e.g., college selection, visit reasons) ensuring responsiveness across devices.
- Subtle and quick hover effects on interactive elements, transitioning to Bright Gold, to provide immediate visual feedback.
- A temporary, prominent 'Welcome to NEU Library!' message will flash for 3 seconds upon successful visit logging, then fade.