# RIOM Client Frontend

React + Vite + Tailwind CSS dashboard for the RIOM Inventory Operations Manager. This client consumes the RIOM backend API to deliver SKU, order, analytics, and user management functionality.

## Overview

The application provides an authenticated dashboard experience backed by session-based cookies. Key capabilities include product and SKU maintenance, order tracking, user role administration, and analytics reporting. The codebase emphasizes a clean layout, modular data services, and predictable state handling through React context and hooks.

## Key Features

- Authenticated dashboard shell with protected routing and session persistence
- Role-aware navigation with shared layout (sidebar + topbar)
- SKU, product, order, report, and settings pages wired to backend services
- Axios service preconfigured for cookie-based auth, automatic 401 handling, and payload unwrapping
- Tailwind-powered responsive design tuned for desktop tablet breakpoints

## Tech Stack

- React 18, React Router 6 for SPA routing
- Vite 5 for fast bundling and dev tooling
- Tailwind CSS 3 for utility-first styling
- Axios for HTTP communication
- ESLint with React, Hooks, and Refresh plugins for linting

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+ (ships with Node 18)

### Environment Variables

Create `.env` in the project root (or `.env.local` for local-only overrides) with the API base URL exposed at build time.

```
VITE_API_URL=https://riom-backend.onrender.com
```

- The value should be the backend origin **without** a trailing slash. The client automatically appends `/api` when constructing requests.
- For local development you can swap in `http://localhost:5000` (or the port used by the backend server).

### Installation

1. Install dependencies:
	 ```bash
	 npm install
	 ```
2. Run the interactive lint fixer (optional, recommended after large merges):
	 ```bash
	 npm run lint
	 ```

### Development

- Start the Vite dev server on `http://localhost:5173` (default):
	```bash
	npm run dev
	```
- The client proxies API calls to `VITE_API_URL` via the configured Axios instance; no extra proxy setup is required when the backend is reachable from the browser.

### Production Build & Preview

- Generate an optimized bundle in `dist/`:
	```bash
	npm run build
	```
- Preview the production build locally:
	```bash
	npm run preview
	```

## Project Structure

```
src/
├── components/      Reusable UI primitives (layout shell, navigation, guards)
├── context/         Shared React contexts (authentication provider)
├── hooks/           Custom hooks for data fetching and form handling
├── pages/           Route-level containers for each dashboard area
├── services/        Axios instance and domain-specific API wrappers
├── App.jsx          Route configuration and top-level auth gating
├── main.jsx         App bootstrap (router + providers)
└── index.css        Tailwind base and global styles
```

## API Integration

- `src/services/api.js` creates a configured Axios instance with `withCredentials` enabled so session cookies issued by the backend are automatically included.
- Domain services (e.g., `productService.js`, `skuService.js`) expose semantic helpers that map to backend endpoints while reusing the shared client.
- Responses are normalized through `extractData`, allowing components to work with the unwrapped payload.

## Authentication Flow

- `AuthContext` manages the authenticated user, bootstrapping session state through `/auth/me`.
- `ProtectedRoute` guards non-login routes and redirects unauthenticated visitors to `/login`.
- Successful login triggers `/auth/login`, followed by a user fetch to populate context state and navigate to `/dashboard`.
- Logout clears both backend session (via `/auth/logout`) and frontend state before rerouting to `/login`.

## Deployment

1. Build the app with `npm run build` (Vite outputs to `dist/`).
2. Deploy the static assets to your hosting provider (e.g., Vercel, Netlify, S3 + CloudFront).
3. Configure the `VITE_API_URL` environment variable in the hosting platform to point at the deployed backend origin.
4. Ensure the backend allows cross-origin requests from the frontend domain and that session cookies are set with the appropriate `SameSite`/`Secure` flags.

### Vercel Quick Start

1. Push the client code to GitHub.
2. Create a new Vercel project, import the repository, and select `RIOM-CLIENT` as the root directory.
3. Add `VITE_API_URL` under Project Settings → Environment Variables.
4. Trigger a deploy; Vercel will detect Vite and use `npm run build` automatically.

## Available Scripts

- `npm run dev` – start the Vite dev server
- `npm run build` – create production bundle
- `npm run preview` – serve the built assets locally
- `npm run lint` – run ESLint checks (fails on warnings)

## Troubleshooting

- **401 redirect loop:** verify the backend session cookie domain includes the frontend host and that `VITE_API_URL` is correct.
- **Network calls hitting `/api` locally:** confirm the backend is running on the host set in `VITE_API_URL` and accessible from the browser.
- **Tailwind classes not applied:** ensure `tailwind.config.js` content paths include any newly added directories.
- **Build succeeds but deploy fails:** double-check that the hosting provider is pointing to the `dist/` output and that `VITE_API_URL` is set for each environment (Preview/Production).

## Testing & Quality

- Automated tests are not yet defined. Add React Testing Library or Cypress suites as the UI surface expands.
- Keep linting part of CI/CD (fails on warnings) to enforce consistent patterns.

## Contributing

- Use feature branches, run `npm run lint` before pushing, and include relevant screenshots or GIFs in pull requests when updating UI flows.

## License

Distributed under the project repository license. See the root-level `LICENSE` file if available.
