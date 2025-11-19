# Frontend Dashboard

A modern, responsive dashboard for the Arbitrage Scanner built with Vite, React, TypeScript, TailwindCSS, and React Query.

## Features

- **Real-time Data**: React Query with automatic refetching and caching
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Dark Theme**: Professional dark theme with color tokens
- **API Integration**: Centralized REST service layer
- **Accessibility**: ARIA roles, keyboard navigation support
- **Testing**: Vitest + React Testing Library

## Project Structure

```
frontend/
├── src/
│   ├── api/              # API service layer
│   │   ├── client.ts     # HTTP client
│   │   ├── services.ts   # API endpoints
│   │   ├── types.ts      # TypeScript types
│   │   └── index.ts      # Barrel export
│   ├── components/       # Reusable components
│   │   ├── __tests__/    # Component tests
│   │   ├── Topbar.tsx
│   │   ├── PeriodSelector.tsx
│   │   ├── StatCard.tsx
│   │   ├── OpportunitiesTable.tsx
│   │   ├── PairsTable.tsx
│   │   ├── Toast.tsx
│   │   └── index.ts
│   ├── hooks/            # Custom React hooks
│   │   ├── useQueries.ts # React Query hooks
│   │   ├── useToast.ts   # Toast management
│   │   └── index.ts
│   ├── utils/            # Utility functions
│   │   ├── format.ts     # Formatting & Decimal helpers
│   │   ├── a11y.ts       # Accessibility utilities
│   │   └── index.ts
│   ├── test/             # Test setup
│   │   └── setup.ts
│   ├── App.tsx           # Main application component
│   ├── main.tsx          # Entry point
│   └── styles.css        # Global styles
├── vite.config.ts        # Vite configuration
├── vitest.config.ts      # Vitest configuration
├── postcss.config.js     # PostCSS configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── index.html            # HTML entry point
```

## Development

### Prerequisites

- Node.js 20.10.0
- pnpm 8.15.0

### Setup

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Run tests with UI
pnpm test:ui

# Lint code
pnpm lint

# Clean build artifacts
pnpm clean
```

## API Endpoints

The frontend connects to the following backend endpoints:

### Opportunities
- `GET /api/opportunities/latest` - Get latest opportunities with pagination
- `GET /api/opportunities/:id` - Get opportunity by ID
- `PUT /api/opportunities/:id/status` - Update opportunity status
- `GET /api/opportunities/pair/:id` - Get opportunities by pair

### Pairs
- `GET /api/pairs` - Get all pairs
- `GET /api/pairs/top` - Get top pairs
- `GET /api/pairs/:id` - Get pair by ID
- `GET /api/pairs/symbol/:symbol` - Get pair by symbol
- `POST /api/pairs` - Create new pair
- `PUT /api/pairs/:id/status` - Update pair status

### Statistics
- `GET /api/stats/opportunities` - Get opportunity statistics
- `GET /api/stats/scans` - Get scan statistics
- `GET /api/stats/overall` - Get overall statistics
- `GET /api/stats/scans/:id` - Get detailed scan statistics
- `GET /api/stats/scans/global` - Get global scan statistics

### Scan
- `POST /api/scan` - Enqueue a scan job
- `GET /api/scan/jobs` - Get all scan jobs
- `GET /api/scan/jobs/:jobId` - Get job status
- `DELETE /api/scan/jobs/:jobId` - Cancel job
- `GET /api/scan/queue/stats` - Get queue statistics

### Settings
- `GET /api/settings` - Get all settings
- `GET /api/settings/:key` - Get setting by key
- `PUT /api/settings/:key` - Update setting

### Seed (Development Only)
- `POST /api/seed` - Seed database with sample data

## Component Architecture

### Topbar
Displays dashboard title, connection status, and manual scan trigger button.

**Props:**
- `onScanSuccess?: (message: string) => void` - Success callback
- `onScanError?: (error: string) => void` - Error callback

### PeriodSelector
Radio button selector for time periods with error display.

**Props:**
- `value: Period` - Current period ('1h' | '24h' | '7d' | '30d')
- `onChange: (period: Period) => void` - Change handler
- `error?: string` - Error message to display

### StatCard
Displays a single statistic with optional icon and loading state.

**Props:**
- `title: string` - Card title
- `value: string | number` - Main value
- `subValue?: string` - Secondary value
- `loading?: boolean` - Loading state
- `icon?: React.ReactNode` - Icon element
- `color?: 'primary' | 'success' | 'warning' | 'error'` - Color variant

### OpportunitiesTable
Paginated table of opportunities with status indicators and formatting.

**Props:**
- `opportunities: Opportunity[]` - Data rows
- `loading?: boolean` - Loading state
- `total?: number` - Total items
- `page?: number` - Current page
- `pageSize?: number` - Items per page
- `onPageChange?: (page: number) => void` - Page change handler

### PairsTable
Table of trading pairs with status indicators.

**Props:**
- `pairs: Pair[]` - Data rows
- `loading?: boolean` - Loading state
- `title?: string` - Table title

### Toast
Notification message with auto-dismiss.

**Props:**
- `message: string` - Toast message
- `type?: 'success' | 'error' | 'info'` - Toast type
- `duration?: number` - Auto-dismiss duration in ms (0 = no auto-dismiss)
- `onClose?: () => void` - Close handler

## Styling

The application uses Tailwind CSS with a custom dark theme. Key color tokens:

- **Primary**: Sky blue (`primary-600` = `#0284c7`)
- **Success**: Green (`success-500` = `#22c55e`)
- **Warning**: Amber (`warning-500` = `#f59e0b`)
- **Error**: Red (`error-500` = `#ef4444`)
- **Purple**: Status indicator (`purple-500` = `#a855f7`)

### CSS Classes

- `.btn-primary`, `.btn-secondary`, `.btn-outline` - Button variants
- `.card` - Card container
- `.status-badge` - Status indicator
- `.status-active`, `.status-closed`, `.status-pending`, `.status-failed` - Status variants
- `.skeleton` - Loading placeholder
- `.table`, `.table-container` - Table styles

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test -- --coverage

# Run tests in watch mode
pnpm test -- --watch

# Run tests with UI
pnpm test:ui
```

### Writing Tests

Tests are located in `__tests__` directories alongside components. Example:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## Accessibility

The application includes accessibility features:

- ARIA roles and labels for interactive elements
- Keyboard navigation support (Tab, Enter, Escape, Arrow keys)
- Color contrast compliant for WCAG AA standards
- Screen reader announcements via `announceToScreenReader()` utility
- Semantic HTML structure

### Accessibility Utilities

Available in `src/utils/a11y.ts`:

- `isKeyboardEvent()` - Check if event is keyboard-related
- `isEnterKey()` - Check for Enter key
- `isEscapeKey()` - Check for Escape key
- `isArrowKey()` - Check for arrow keys
- `announceToScreenReader()` - Announce message to screen readers
- `focusElement()` - Programmatically focus element

## Performance

- **React Query**: Automatic caching and refetching
- **Code Splitting**: Vite handles dynamic imports
- **Lazy Loading**: Images and components can be lazy-loaded
- **Tree Shaking**: Unused code removed during build

## Production Build

```bash
# Build optimized production bundle
pnpm build

# Preview production build locally
pnpm preview
```

The build output is in the `dist/` directory, optimized for deployment.

## Environment Variables

The frontend proxies API requests to `http://localhost:3000` in development. For production, update the proxy configuration or set an environment variable.

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions

## License

See LICENSE in repository root.
