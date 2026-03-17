# NEU Access - Library Visitor Monitoring System

> **Live Preview:** https://9000-firebase-studio-1773507394175.cluster-yylgzpipxrar4v4a72liastuqy.cloudworkstations.dev

## Description

NEU Access is a modern, mobile-first web application designed to streamline library visitor management and monitoring for New Era University. The system provides real-time tracking of library visits, enabling administrators and staff to monitor facility usage patterns, generate analytics, and manage visitor information efficiently. Built with cutting-edge technologies, the application supports role-based access control (students, staff, and administrators) and features a seamless cross-device authentication flow optimized for iOS, Android, and desktop platforms.

The architecture leverages Firebase for authentication and real-time data management, Next.js 15 for server-side rendering and API routes, and Tailwind CSS with Radix UI for a responsive, accessible user interface. The application implements strict institutional domain validation (@neu.edu.ph) to ensure only authorized university members can access the system, with automated session management and comprehensive error recovery mechanisms.

## Key Features

- **Google OAuth Authentication** – Secure institutional login with automatic @neu.edu.ph domain validation across all devices
- **Role-Based Access Control** – Three-tier permission system: Student/User, Staff, and Administrator roles with customized dashboards for each
- **Cross-Device Compatibility** – Optimized authentication flows for iOS (popup-based), Android (redirect-based), and desktop platforms
- **Library Visit Tracking** – Students can log visits with purpose selection (Reading, Research, PC Use, Studying, Reviewing, Consultation, Printing, Discussion)
- **Admin Dashboard** – Comprehensive analytics, user management, visit history tracking, and account blocking capabilities
- **User Onboarding** – Seamless college/department selection flow for first-time users
- **Session Management** – Automatic visit session tracking with check-in/check-out timestamps
- **Real-Time Data Synchronization** – Firebase Firestore integration for instant data updates across clients
- **Stuck Login Recovery** – Automatic detection and recovery from authentication failures with manual reset option
- **Responsive Design** – Mobile-first interface with adaptive layouts for all screen sizes
- **Accessibility** – Built with Radix UI components ensuring WCAG compliance and keyboard navigation

## Tech Stack

**Frontend:**
- **Framework:** Next.js 15.5.9 with TypeScript 5
- **UI Library:** React 19.2 with Radix UI component library
- **Styling:** Tailwind CSS 3.4 with custom animations
- **Form Management:** React Hook Form with Zod schema validation
- **Data Visualization:** Recharts for analytics charts
- **Icons:** Lucide React
- **Carousel:** Embla Carousel

**Backend & Services:**
- **Authentication:** Firebase Auth with Google OAuth 2.0
- **Database:** Firebase Firestore (NoSQL)
- **Hosting:** Firebase App Hosting
- **AI Services:** Google Genkit with Google Generative AI (1.28.0)

**Development Tools:**
- **Package Manager:** npm
- **Build Tool:** Next.js with Turbopack
- **Linting:** ESLint
- **Type Checking:** TypeScript compiler (tsc)
- **Environment:** Node.js 20+

## Local Development Setup

### Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** version 20 LTS or higher (download from [nodejs.org](https://nodejs.org))
- **npm** (bundled with Node.js) or equivalent package manager
- **Git** for version control
- **A text editor/IDE** such as VS Code, WebStorm, or similar
- **Firebase Project** – Access to a Firebase project with:
  - Authentication (Google Sign-in provider enabled)
  - Firestore Database (created and configured)
  - Firebase Hosting (optional, for production deployment)
- **Environment:** Supports Windows, macOS, and Linux environments with standard Node.js support

### Installation

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd NEUAccess
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Create a `.env.local` file in the root directory
   - Add your Firebase configuration (copy from Firebase Console):
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=<your-api-key>
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<your-auth-domain>
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=<your-project-id>
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<your-storage-bucket>
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<your-sender-id>
   NEXT_PUBLIC_FIREBASE_APP_ID=<your-app-id>
   ```

4. **Configure Firestore Rules** (Production Security)
   - In Firebase Console, navigate to Firestore Database > Rules
   - Replace default rules with rules from `firestore.rules` file in the project root
   - This ensures proper access control for users and visits collections

5. **Setup Google OAuth** (Authentication)
   - Go to Firebase Console > Authentication > Sign-in method
   - Enable Google provider
   - Add authorized redirect URIs:
     - `http://localhost:3000` (development)
     - `http://localhost:9002` (alt dev port)
     - Your production domain

### Running Locally

**Start the Development Server:**
```bash
npm run dev
```

The application will be available at `http://localhost:9002` (configured in package.json).

**Alternative Development Commands:**

- **Build for Production:**
  ```bash
  npm run build
  ```

- **Run Production Build Locally:**
  ```bash
  npm run start
  ```

- **Type Checking:**
  ```bash
  npm run typecheck
  ```

- **Linting:**
  ```bash
  npm run lint
  ```

### First-Time User Flow

1. Visit the application
2. Click "Sign in with Google"
3. Authenticate with @neu.edu.ph institutional account
4. Complete college selection during onboarding
5. Access the user dashboard to log library visits

### Admin/Staff Access

- Administrators and staff members automatically see the admin dashboard upon login
- Admin features include:
  - View all user visits and visit history
  - User management and account blocking
  - Library analytics and usage statistics
  - System configuration

### Troubleshooting

**Stuck on Login Page:**
- Click the "Stuck? Reset Sign-in" button if it appears (after 10 seconds of loading)
- Clear browser cache and cookies, then refresh
- Try signing in from an incognito/private window

**Firebase Configuration Errors:**
- Verify all environment variables in `.env.local` are correct
- Check Firebase project settings in the console
- Ensure Firestore database is created and running

**Domain Validation Failed:**
- Ensure you're signing in with a @neu.edu.ph email address
- Contact your institution administrator if your email is not recognized

**Popup Blocked:**
- Enable popups for this domain in your browser settings
- Use the "Open Window" button in the Sign-In Blocked dialog

### Contributing

When making changes to authentication flows, always test on multiple devices:
- iOS (using real device or Xcode simulator)
- Android (using real device or Android emulator)
- Desktop (Chrome, Firefox, Safari)

Refer to [AUTH_FIX_DOCUMENTATION.md](AUTH_FIX_DOCUMENTATION.md) for detailed authentication implementation notes.

### Support

For issues, questions, or feature requests, contact the development team.
