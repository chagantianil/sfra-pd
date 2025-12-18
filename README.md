# SFRA Page Designer + PWA Kit Integration

This repository contains a custom SFRA implementation that integrates **Salesforce Page Designer** with **PWA Kit**, enabling visual content management for headless PWA storefronts.

## Overview

This integration allows merchants to use SFCC's Page Designer to visually edit pages that are rendered by PWA Kit on the Managed Runtime. Components can be added, removed, and rearranged in Page Designer, with changes automatically reflected in the PWA Kit storefront.

## How It Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Page Designer (SFCC)                              │
│                                                                             │
│  1. Merchant opens page in Page Designer                                    │
│  2. SFCC sends service request to PWA Kit with ?preview=true                │
│  3. PWA Kit returns HTML with Page Designer classes/attributes              │
│  4. HTML is rendered in Page Designer for visual editing                    │
│  5. On component update, latest HTML is fetched and synced                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PWA Kit (Managed Runtime)                            │
│                                                                             │
│  • Receives request with preview=true parameter                             │
│  • Adds CSS classes and data attributes for Page Designer detection        │
│  • Returns component HTML that Page Designer can parse                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Concepts

1. **SFCC Domain Allowlisting**: SFCC domain URLs are added to `ssr.js` in PWA Kit to allow SFCC to fetch page HTML from the Managed Runtime.

2. **Service Request**: A server-side request is made from SFCC to the PWA Kit page URL to retrieve the page HTML, bypassing CORS restrictions.

3. **Preview Mode**: When sending the service request, a `preview=true` parameter is passed to PWA Kit.

4. **Component Detection**: In PWA Kit, when `preview=true` is detected, required CSS classes and data attributes are added to components (similar to how SFRA handles Page Designer components).

5. **Visual Editing**: Since the HTML loaded in Page Designer contains the proper classes and attributes, components can be added, removed, and rearranged visually.

6. **Auto-Sync**: When a component is updated in Page Designer, the latest HTML is automatically fetched from the Managed Runtime and synced back to SFCC.

---

## Setup Guide

### Prerequisites

- SFCC sandbox with Page Designer access
- PWA Kit project deployed to Managed Runtime
- Business Manager access for custom preferences

---

### Step 1: Configure PWA Kit

#### 1.1 Update `ssr.js` to Allow SFCC Domains

In your PWA Kit project, update `ssr.js` to add your SFCC domain to the allowed origins:

```javascript
// app/ssr.js
const allowedOrigins = [
    'https://your-sfcc-sandbox.demandware.net',
    'https://your-production-domain.com'
];
```

#### 1.2 Handle Preview Mode in Components

In your PWA Kit components, check for the `preview` query parameter and add Page Designer classes/attributes:

```javascript
// Example: In your page component
import { useLocation } from 'react-router-dom';

const MyComponent = ({ componentId, ...props }) => {
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const isPreview = searchParams.get('preview') === 'true';

    // Add Page Designer attributes when in preview mode
    const pdAttributes = isPreview ? {
        'data-component-id': componentId,
        className: 'experience-component'
    } : {};

    return (
        <div {...pdAttributes}>
            {/* Component content */}
        </div>
    );
};
```

#### 1.3 Deploy to Managed Runtime

Deploy your PWA Kit changes to the Managed Runtime:

```bash
npm run push
```

---

### Step 2: Configure SFCC

#### 2.1 Create Custom Site Preference

1. Go to **Business Manager** → **Administration** → **Site Development** → **System Object Types**
2. Find or create a custom preference group for PWA Kit settings
3. Add a custom attribute:
   - **ID**: `pwaKitURL`
   - **Display Name**: PWA Kit URL
   - **Type**: String
   - **Description**: Base URL of the PWA Kit Managed Runtime (e.g., `https://your-project.mobify-storefront.com`)

#### 2.2 Set the PWA Kit URL

1. Go to **Business Manager** → **Merchant Tools** → **Site Preferences** → **Custom Preferences**
2. Set the **PWA Kit URL** to your Managed Runtime URL (e.g., `https://your-project.mobify-storefront.com`)

#### 2.3 Upload the Custom Cartridge

1. Upload the `app_custom_storefront` cartridge to your sandbox
2. Add it to your cartridge path:
   ```
   app_custom_storefront:app_storefront_base:...
   ```

#### 2.4 Import System Object Extensions (Optional)

If you need the custom site preference, import the metadata:

```
app_custom_storefront/meta/system-objecttype-extensions.xml
```

---

### Step 3: Create a PWA Page Type in Page Designer

#### 3.1 Register the Page Type

The custom cartridge includes a `pwaPage` page type:

- **Location**: `app_custom_storefront/cartridges/app_custom_storefront/cartridge/experience/pages/`
- **Files**:
  - `pwaPage.js` - Page controller
  - `pwaPage.json` - Page type definition

#### 3.2 Create a Page in Page Designer

1. Go to **Business Manager** → **Merchant Tools** → **Content** → **Page Designer**
2. Create a new page using the **PWA Page** type
3. Add and arrange components as needed
4. Publish the page

---

## Architecture

### SFCC Components

| File | Description |
|------|-------------|
| `controllers/PWAProxy.js` | Server-side proxy that fetches HTML from PWA Kit |
| `experience/pages/pwaPage.js` | Page Designer page type controller |
| `experience/pages/pwaPage.json` | Page type definition |
| `templates/default/experience/pages/pwaPage.isml` | Page template with remote include |

### Request Flow

1. **Page Designer opens page** → Triggers `pwaPage.js`
2. **pwaPage.isml** → Includes `PWAProxy-GetContent` controller
3. **PWAProxy.js** → Makes HTTP request to PWA Kit with `?preview=true`
4. **PWA Kit** → Returns HTML with Page Designer attributes
5. **Page Designer** → Renders HTML and enables visual editing

---

## Troubleshooting

### CORS Errors

If you encounter CORS errors:
- Ensure your SFCC domain is added to the allowed origins in PWA Kit's `ssr.js`
- The `PWAProxy` controller makes server-side requests to bypass browser CORS restrictions

### Components Not Detected

If Page Designer doesn't detect components:
- Verify the `preview=true` parameter is being passed
- Check that PWA Kit components have the required CSS classes and data attributes
- Inspect the HTML returned from PWA Kit for proper Page Designer markup

### Connection Timeouts

If requests to PWA Kit timeout:
- Check the Managed Runtime is accessible
- Verify the `pwaKitURL` site preference is correct
- Check network/firewall settings between SFCC and Managed Runtime

### Empty Page Content

If the page appears empty:
- Verify the PWA Kit URL is correctly configured in Site Preferences
- Check the PWAProxy controller logs for errors
- Test the PWA Kit URL directly in a browser with `?preview=true`

---

## Development

### Local Testing

For local development, you can point the `pwaKitURL` to your local PWA Kit instance:

```
http://localhost:3000
```

Note: This requires proper CORS configuration on your local PWA Kit server.

### Building Client-Side Assets

```bash
cd app_custom_storefront
npm install
npm run build
```

---

## License

This project is based on the Salesforce Commerce Cloud Storefront Reference Architecture (SFRA).
