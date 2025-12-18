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

### 4. Proxy Controller (The Key Component)
**`controllers/PWAProxy.js`**
```javascript
server.get('GetContent', server.middleware.include, function (req, res, next) {
    var HTTPClient = require('dw/net/HTTPClient');
    var Site = require('dw/system/Site');

    // Get site ID from current site (not from URL params)
    var siteID = Site.getCurrent().getID();
    var pageID = req.querystring.pageID;

    // Get PWA Kit URL from Site Preferences
    var pwaKitBaseURL = Site.getCurrent().getCustomPreferenceValue('pwaKitURL');
    
    // Construct URL: {pwaKitURL}/{siteID}/page/{pageID}?preview=true
    var pwaURL = pwaKitBaseURL + '/' + siteID + '/page/' + pageID + '?preview=true';

    // Make server-side HTTP request (bypasses CORS!)
    var httpClient = new HTTPClient();
    httpClient.setTimeout(10000);
    httpClient.open('GET', pwaURL);
    httpClient.send();

    if (httpClient.statusCode === 200) {
        res.setContentType('text/html');
        res.print(httpClient.text);  // Return PWA Kit HTML to Page Designer
    }
    
    return next();
});
```

**Key Points:**
- Uses `server.middleware.include` for remote include support
- Gets `siteID` from `Site.getCurrent().getID()` (not URL params)
- Gets PWA Kit base URL from **Site Preferences** (`pwaKitURL`)
- Appends `?preview=true` to tell PWA Kit to add Page Designer attributes
- Makes **server-side HTTP request** using `dw/net/HTTPClient`

---

## 🚀 Setup Guide

### Step 1: Configure SFCC

#### 1.1 Upload Cartridge
Upload `app_custom_storefront` cartridge and add to cartridge path:
```
app_custom_storefront:app_storefront_base:...
```

#### 1.2 Create Site Preference for PWA Kit URL

**Option A: Import Metadata**
Import the system object extension:
```
app_custom_storefront/meta/system-objecttype-extensions.xml
```

**Option B: Create Manually**
1. Go to **Business Manager** → **Administration** → **Site Development** → **System Object Types**
2. Select **SitePreferences** → **Attribute Definitions** → **New**
3. Create attribute:
   - **ID**: `pwaKitURL`
   - **Display Name**: PWA Kit URL
   - **Value Type**: String

#### 1.3 Set the PWA Kit URL Value
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
| `PWAProxy.js` | Makes server-side request to PWA Kit |

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
