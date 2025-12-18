# SFRA Page Designer + PWA Kit Integration

This repository enables **visual content editing** in SFCC Page Designer for pages rendered by **PWA Kit** on the Managed Runtime.

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

### 5. Metadata - Site Preference Definition
**`meta/system-objecttype-extensions.xml`**

This file defines the custom site preference used to store the PWA Kit URL. **You must import this file** to create the `pwaKitURL` site preference.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<metadata xmlns="http://www.demandware.com/xml/impex/metadata/2006-10-31">
    <type-extension type-id="SitePreferences">
        <custom-attribute-definitions>
            <attribute-definition attribute-id="pwaKitURL">
                <display-name xml:lang="x-default">PWA Kit URL</display-name>
                <description xml:lang="x-default">Base URL for the PWA Kit application 
                    (e.g., https://your-pwa-app.com). Must be publicly accessible.</description>
                <type>string</type>
                <mandatory-flag>false</mandatory-flag>
                <externally-managed-flag>false</externally-managed-flag>
                <min-length>0</min-length>
            </attribute-definition>
        </custom-attribute-definitions>
        <group-definitions>
            <attribute-group group-id="PWAKit">
                <display-name xml:lang="x-default">PWA Kit</display-name>
                <attribute attribute-id="pwaKitURL"/>
            </attribute-group>
        </group-definitions>
    </type-extension>
</metadata>
```

**What this creates:**
| Element | Description |
|---------|-------------|
| `pwaKitURL` | Custom site preference attribute (String type) |
| `PWAKit` | Attribute group - organizes the preference under "PWA Kit" tab in Business Manager |

**After import, you'll find it at:**
- **Merchant Tools** → **Site Preferences** → **Custom Preferences** → **PWA Kit** tab

---

### 7. Service Metadata
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
Upload `app_custom_storefront` cartridge and add to cartridge path:
```
app_custom_storefront:app_storefront_base:...
```

#### 1.2 Import Site Preference Metadata

Import the system object extension to create the `pwaKitURL` site preference:

1. Go to **Business Manager** → **Administration** → **Site Development** → **Import & Export**
2. Click **Upload** under "Import & Export Files"
3. Upload: `app_custom_storefront/meta/system-objecttype-extensions.xml`
4. Click **Import** under "Meta Data"
5. Select the uploaded file and click **Next** → **Import**

#### 1.3 Import Service Metadata (Required)

Import the service definition for the PWA Kit HTTP service:

1. Go to **Business Manager** → **Administration** → **Operations** → **Import & Export**
2. Click **Upload** under "Import & Export Files"
3. Upload: `app_custom_storefront/meta/services.xml`
4. Click **Import** under "Services"
5. Select the uploaded file and click **Next** → **Import**

**What gets created:**
| Item | Location |
|------|----------|
| `pwaKitURL` site preference | Merchant Tools → Site Preferences → Custom Preferences |
| `pwakit.http.service` | Administration → Operations → Services |
| `pwakit.http.credential` | Administration → Operations → Services → Credentials |
| `pwakit.http.profile` | Administration → Operations → Services → Profiles |

#### 1.4 Configure Service Credential

After importing, update the service credential with your PWA Kit URL:

1. Go to **Administration** → **Operations** → **Services** → **Credentials**
2. Click on **pwakit.http.credential**
3. Update the **URL** to your Managed Runtime URL:
   ```
   https://your-project.mobify-storefront.com
   ```
4. Click **Apply**

#### 1.5 Set the PWA Kit URL Site Preference
1. Go to **Merchant Tools** → **Site Preferences** → **Custom Preferences**
2. Set **PWA Kit URL** to your Managed Runtime URL:
   ```
   https://your-project.mobify-storefront.com
   ```
   (No trailing slash)

---

### Step 2: Configure PWA Kit

#### 2.1 Allow SFCC Domain in `ssr.js`

In your PWA Kit project, update `app/ssr.js` to allow your SFCC domain:

```javascript
// Add SFCC domains to allowed origins for the HTTP request
const runtime = getRuntime();

const options = {
    // ... other options
    proxyConfigs: [
        {
            host: 'your-sfcc-instance.demandware.net',
            path: 'on/demandware.store'
        }
    ]
};
```

Or in the server configuration, ensure SFCC domains can reach your Managed Runtime.

#### 2.2 Handle `preview=true` Parameter

In your PWA Kit components, detect preview mode and add Page Designer classes:

```jsx
// Example: ProductTile component
import { useLocation } from 'react-router-dom';

const ProductTile = ({ product, componentId }) => {
    const location = useLocation();
    const isPreview = new URLSearchParams(location.search).get('preview') === 'true';

    return (
        <div 
            className={isPreview ? 'experience-component experience-product-tile' : ''}
            data-component-id={isPreview ? componentId : undefined}
        >
            {/* Component content */}
        </div>
    );
};
```

**Required Attributes for Page Designer:**
- `class="experience-component"` - Marks element as a Page Designer component
- `data-component-id="{componentId}"` - Unique component identifier

#### 2.3 Deploy to Managed Runtime

```bash
npm run push
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
**Solution:** Set the `pwaKitURL` site preference in Business Manager:
- **Merchant Tools** → **Site Preferences** → **Custom Preferences**
- Enter your Managed Runtime URL (e.g., `https://your-project.mobify-storefront.com`)

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

| Site Preference | Value | Example |
|----------------|-------|---------|
| `pwaKitURL` | PWA Kit Managed Runtime URL | `https://your-project.mobify-storefront.com` |

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
| `meta/system-objecttype-extensions.xml` | Creates `pwaKitURL` site preference |
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
