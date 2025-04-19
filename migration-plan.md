# Prosparity.AI Project Reorganization Plan

## Current Structure Issues
- Mixed usage of Pages Router (/pages) and App Router (/app)
- Inconsistent component organization
- Redundant code in multiple places
- API routes scattered across different directories

## New Structure

### App Directory (App Router)
```
/app
  /api
    /auth
    /calls
    /companies
    /knowledge
    /leads
    /tasks
  /auth
    /login
    /register
    /register-company
  /dashboard
    /page.js
    /companies
    /leads
    /tasks
    /ai-instructions
  /calls
  /knowledge
  /leads
  /profile
  /sales-scripts
  /settings
  /tasks
  layout.js
  page.js
```

### Components Directory
```
/components
  /auth         # Authentication related components
  /common       # Reusable components (buttons, inputs, etc.)
  /dashboard    # Dashboard specific components (Stats, etc.)
  /layout       # Layout components (headers, footers, etc.)
  /leads        # Lead management components
  /tasks        # Task management components
  /calls        # Call management components
  /knowledge    # Knowledge base components
  /ui           # UI components (cards, modals, etc.)
```

### Lib Directory 
```
/lib
  /auth         # Authentication utilities
  /api          # API client utilities
  /db           # Database utilities
  /ai           # AI related utilities
  /utils        # General utilities
  /hooks        # Custom React hooks
```

## Migration Steps

1. Create the new folder structure in the app directory
2. Reorganize components into their appropriate directories
3. Migrate API routes to the new structure
4. Create new route files in the app directory
5. Update imports throughout the codebase
6. Test functionality to ensure everything works
7. Clean up redundant or outdated files 