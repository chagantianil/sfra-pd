# SFRA Page Designer + PWA Kit Integration

This repository enables **visual content editing** in SFCC Page Designer for pages rendered by **PWA Kit** on the Managed Runtime.

---

## 🔗 Related Repositories

| Repository | Description |
|------------|-------------|
| **[demo-multisite-app](https://github.com/chagantianil/demo-multisite-app)** | PWA Kit project with Page Designer integration (required companion) |
| **This repo (storefront-reference-architecture)** | SFCC cartridge for Page Designer proxy |

> 💡 Both repositories work together. The SFCC cartridge fetches HTML from the PWA Kit app.

---

## 📋 Prerequisites

Before you begin, ensure you have:

| Requirement | Description |
|-------------|-------------|
| **SFCC Sandbox** | Access to Business Manager with admin rights |
| **PWA Kit Project** | A PWA Kit project deployed to Managed Runtime |
| **Cartridge Upload Tool** | VS Code + Prophet Debugger OR WebDAV client |

---

## 🎯 What This Does

Merchants can use SFCC Page Designer to:
- ✅ **Add components** to PWA Kit pages
- ✅ **Remove components** from PWA Kit pages  
- ✅ **Rearrange components** via drag-and-drop
- ✅ **See live preview** of PWA Kit rendered content
- ✅ **Auto-sync changes** - updates are automatically fetched from Managed Runtime

---

## 🔄 How It Works

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         PAGE DESIGNER (SFCC)                               │
│                                                                            │
│   1. Merchant opens page in Page Designer                                  │
│   2. pwaPage.isml triggers <isinclude> to PWAProxy controller              │
│   3. PWAProxy makes SERVER-SIDE HTTP request (bypasses CORS)               │
│   4. Request URL: {pwaKitURL}/{siteID}/page/{pageID}?preview=true          │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                      PWA KIT (Managed Runtime)                             │
│                                                                            │
│   5. PWA Kit receives request with ?preview=true                           │
│   6. Adds Page Designer CSS classes & data attributes to components        │
│   7. Returns HTML that Page Designer can parse and edit                    │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                         PAGE DESIGNER (SFCC)                               │
│                                                                            │
│   8. HTML rendered in Page Designer with editable components               │
│   9. Merchant adds/removes/rearranges components                           │
│  10. On save, latest HTML is re-fetched and synced                         │
└────────────────────────────────────────────────────────────────────────────┘
```

### Why Server-Side Request?

Direct browser requests from SFCC to PWA Kit would fail due to **CORS restrictions**. The `PWAProxy` controller makes the request **server-side**, completely bypassing CORS.

---

## 📁 SFCC Files Explained

### 1. Page Type Definition
**`experience/pages/pwaPage.json`**
```json
{
    "name": "PWA Page",
    "description": "PWA Page Type",
    "region_definitions": [
        {
            "id": "main",
            "name": "Main Region",
            "component_type_exclusions": []
        }
    ]
}
```
Registers "PWA Page" as a page type in Page Designer.

---

### 2. Page Controller
**`experience/pages/pwaPage.js`**
```javascript
var Site = require('dw/system/Site');

module.exports.render = function (context, modelIn) {
    var model = modelIn || new HashMap();
    
    var page = context.page;
    model.page = page;
    model.siteID = Site.getCurrent().getID();  // Gets current site ID dynamically
    
    // ... other setup code
    
    return new Template('experience/pages/pwaPage').render(model).text;
};
```
- Gets the **current site ID** using `Site.getCurrent().getID()`
- Passes page data to the ISML template

---

### 3. Page Template
**`templates/default/experience/pages/pwaPage.isml`**
```html
<div class="storepage" id="${pdict.page.ID}">
    <div class="container">
        <div class="row">
            <div id="pageid-ajax">
                <isinclude url="${URLUtils.url('PWAProxy-GetContent', 'pageID', pdict.page.ID)}" />
            </div>
        </div>
    </div>
</div>
```
- Uses `<isinclude>` to call the PWAProxy controller
- Passes only `pageID` (siteID is fetched server-side)

---

### 4. Proxy Controller
**`controllers/PWAProxy.js`**
```javascript
server.get('GetContent', server.middleware.include, function (req, res, next) {
    var Site = require('dw/system/Site');
    var pwaKitService = require('*/cartridge/scripts/services/pwaKitService');

    var siteID = Site.getCurrent().getID();
    var pageID = req.querystring.pageID;

    // Use the SFCC Service Framework to fetch content
    var result = pwaKitService.getPageContent(siteID, pageID);

    if (result.success) {
        res.setContentType('text/html');
        res.print(result.content);
    } else {
        res.setStatusCode(result.statusCode || 500);
        res.json({ error: result.error });
    }
    
    return next();
});
```

**Key Points:**
- Uses `server.middleware.include` for remote include support
- Uses **SFCC Service Framework** instead of direct HTTPClient
- Service provides better error handling, logging, and circuit breaker support

---

### 5. PWA Kit Service (HTTP Service)
**`scripts/services/pwaKitService.js`**
```javascript
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');

function getPWAKitService() {
    return LocalServiceRegistry.createService('pwakit.http.service', {
        createRequest: function (svc, params) {
            var url = baseURL + '/' + params.siteID + '/page/' + params.pageID + '?preview=true';
            svc.setURL(url);
            svc.setRequestMethod('GET');
            return null;
        },
        parseResponse: function (svc, client) {
            return {
                statusCode: client.statusCode,
                text: client.text
            };
        }
    });
}
```

**Benefits of Service Framework:**
- ✅ **Logging** - All requests logged in Business Manager
- ✅ **Circuit Breaker** - Automatic failure handling
- ✅ **Timeout Configuration** - Configurable via Business Manager
- ✅ **Mock Mode** - Test without actual service calls

---

### 6. Service Metadata
**`meta/services.xml`**

This file defines the HTTP service used to call PWA Kit. **You must import this file** to create the service.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<services xmlns="http://www.demandware.com/xml/impex/services/2014-09-26">
    <!-- Service Credential - Stores the base URL -->
    <service-credential id="pwakit.http.credential">
        <url>https://your-pwa-kit-url.mobify-storefront.com</url>
    </service-credential>

    <!-- Service Profile - Timeout and circuit breaker settings -->
    <service-profile id="pwakit.http.profile">
        <timeout-millis>10000</timeout-millis>
        <cb-enabled>true</cb-enabled>
        <cb-calls>5</cb-calls>
        <cb-millis>10000</cb-millis>
    </service-profile>

    <!-- Service Definition -->
    <service id="pwakit.http.service">
        <type>HTTP</type>
        <enabled>true</enabled>
        <log-prefix>PWAKit</log-prefix>
        <comm-log-enabled>true</comm-log-enabled>
        <profile-id>pwakit.http.profile</profile-id>
        <credential-id>pwakit.http.credential</credential-id>
    </service>
</services>
```

**What this creates:**
| Element | Description |
|---------|-------------|
| `pwakit.http.service` | The HTTP service definition |
| `pwakit.http.profile` | Timeout (10s) and circuit breaker settings |
| `pwakit.http.credential` | Stores the PWA Kit base URL |

**After import, you'll find it at:**
- **Administration** → **Operations** → **Services**

---

## 🚀 Setup Guide

### Step 1: Configure SFCC

#### 1.1 Upload Cartridge

Upload the `app_pagedesigner_pwa` cartridge to your SFCC instance:

**Using VS Code with Prophet Debugger:**
1. Configure `dw.json` with your sandbox credentials
2. Right-click on `app_pagedesigner_pwa/cartridges/app_pagedesigner_pwa` → **Upload Cartridge**

**Using WebDAV:**
1. Connect to `https://{your-sandbox}/on/demandware.servlet/webdav/Sites/Cartridges/{code-version}/`
2. Upload the `app_pagedesigner_pwa` folder

#### 1.2 Add Cartridge to Cartridge Path

1. Go to **Business Manager** → **Administration** → **Sites** → **Manage Sites**
2. Select your site (e.g., `RefArch`)
3. Click the **Settings** tab
4. Find **Cartridges** field and add `app_pagedesigner_pwa` at the beginning:
   ```
   app_pagedesigner_pwa:app_storefront_base:modules:...
   ```
5. Click **Apply**

> ⚠️ **Important:** The cartridge must be BEFORE `app_storefront_base` in the path to override templates properly.

#### 1.3 Import Service Metadata

Import the service definition for the PWA Kit HTTP service:

1. Go to **Business Manager** → **Administration** → **Operations** → **Import & Export**
2. Click **Upload** under "Import & Export Files"
3. Upload: `app_pagedesigner_pwa/meta/services.xml`
4. Go back to **Import & Export**
5. Click **Import** under "Services"
6. Select the uploaded file and click **Next** → **Import**

**What gets created:**
| Item | Location |
|------|----------|
| `pwakit.http.service` | Administration → Operations → Services |
| `pwakit.http.credential` | Administration → Operations → Services → Credentials |
| `pwakit.http.profile` | Administration → Operations → Services → Profiles |

#### 1.4 Configure Service Credential (Set PWA Kit URL)

After importing, update the service credential with your PWA Kit URL:

1. Go to **Administration** → **Operations** → **Services** → **Credentials**
2. Click on **pwakit.http.credential**
3. Update the **URL** to your Managed Runtime URL:
   ```
   https://your-project.mobify-storefront.com
   ```
   (No trailing slash)
4. Click **Apply**

---

### Step 2: Configure PWA Kit

> ⚠️ **Prerequisites:** You need a PWA Kit project deployed to Managed Runtime. This cartridge fetches HTML from your PWA Kit app.

#### Reference Implementation: `demo-multisite-app`

🔗 **GitHub Repository:** [https://github.com/chagantianil/demo-multisite-app](https://github.com/chagantianil/demo-multisite-app)

A complete PWA Kit implementation with Page Designer support. Clone this repository and use it as a reference or starting point. This implementation includes:

| File | Description |
|------|-------------|
| `overrides/app/routes.jsx` | Route `/page/:pageId` for Page Designer pages |
| `overrides/app/pages/page/[pageId]/index.jsx` | Page component using `usePage` hook |
| `overrides/app/pages/experience/core/` | Core rendering components |
| `overrides/app/pages/experience/pages/pwaPage/` | `pwaPage` type implementation |
| `overrides/app/ssr.js` | CORS configuration for SFCC domains |

#### 2.1 Key Components in PWA Kit

**Route Handler (`pages/page/[pageId]/index.jsx`):**
```jsx
const PageDetail = () => {
    const {pageId} = useParams()
    const {data, isLoading, error} = usePage({parameters: {pageId}})
    
    return <PageRenderer page={data} />
}
```

**Preview Mode Hook (`core/usePreviewMode.js`):**
```jsx
export const usePreviewMode = () => {
    const location = useLocation()
    const searchParams = new URLSearchParams(location?.search || '')
    return searchParams.get('preview') === 'true'
}
```

**Page Designer Attributes (`core/ComponentRenderer.jsx`):**
```jsx
const previewAttributes = isPreview ? {
    className: `experience-component experience-${typeId}`,
    'data-sfcc-pd-component-info': JSON.stringify({
        id: id,
        render_state: 'SUCCESS',
        type: typeId
    }),
    'data-allow-select': 'true',
    'data-allow-move': 'true',
    'data-allow-delete': 'true',
    'data-item-id': `component|${id}`
} : {}
```

#### 2.2 CORS Configuration in `ssr.js`

The `demo-multisite-app` already includes CORS middleware for SFCC domains:

```javascript
const allowedOrigins = [
    'https://zzap-249.dx.commercecloud.salesforce.com',
    'https://*.commercecloud.salesforce.com',
    'https://*.dx.commercecloud.salesforce.com'
]
```

**Update these to match your SFCC sandbox domain.**

#### 2.3 Deploy to Managed Runtime

```bash
cd ../demo-multisite-app
npm run push
```

Verify deployment by visiting:
```
https://your-project.mobify-storefront.com/page/{pageID}?preview=true
```

---

### Step 3: Create Page in Page Designer

1. Go to **Business Manager** → **Merchant Tools** → **Content** → **Page Designer**
2. Click **New Page**
3. Select **PWA Page** as the page type
4. Add components to the **Main Region**
5. **Publish** the page

---

## 🔧 Troubleshooting

### "PWA Kit URL not configured" Error
**Solution:** Set the URL in the service credential:
1. Go to **Administration** → **Operations** → **Services** → **Credentials**
2. Click on **pwakit.http.credential**
3. Enter your Managed Runtime URL (e.g., `https://your-project.mobify-storefront.com`)
4. Click **Apply**

### Empty Page / No Content
**Possible Causes:**
1. PWA Kit URL is incorrect
2. PWA Kit is not deployed
3. Network/firewall blocking SFCC → Managed Runtime

**Debug:** Check the PWA Kit URL by visiting directly:
```
https://your-project.mobify-storefront.com/{siteID}/page/{pageID}?preview=true
```

### Components Not Editable in Page Designer
**Solution:** Ensure PWA Kit components include Page Designer classes when `preview=true`:
```html
<div class="experience-component" data-component-id="...">
```

### Connection Timeout
**Solution:** 
- Increase timeout in `PWAProxy.js` (default: 10000ms)
- Check Managed Runtime health
- Verify network connectivity

---

## 📋 Quick Reference

| Service Credential | Value | Example |
|-------------------|-------|---------|
| `pwakit.http.credential` URL | PWA Kit Managed Runtime URL | `https://your-project.mobify-storefront.com` |

| Request URL Format | Description |
|-------------------|-------------|
| `{pwaKitURL}/{siteID}/page/{pageID}?preview=true` | Full URL constructed by PWAProxy |

| File | Purpose |
|------|---------|
| `pwaPage.json` | Registers "PWA Page" type in Page Designer |
| `pwaPage.js` | Page controller, gets siteID |
| `pwaPage.isml` | Template, includes PWAProxy controller |
| `PWAProxy.js` | Controller that fetches content via service |
| `scripts/services/pwaKitService.js` | SFCC Service Framework implementation |
| `meta/services.xml` | Creates HTTP service, profile, and credential |

---

## 🧪 Local Development

For local testing, set `pwaKitURL` to:
```
http://localhost:3000
```

**Note:** Your local PWA Kit must be running and accessible from your SFCC sandbox. This may require VPN or tunneling depending on your network setup.

---

## 📄 License

Based on Salesforce Commerce Cloud Storefront Reference Architecture (SFRA).
