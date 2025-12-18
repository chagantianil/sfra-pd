# PWA Kit Integration Setup Guide

This guide explains how to configure the integration between SFRA and your PWA Kit application.

## Problem

Salesforce Commerce Cloud (SFCC) has security restrictions that prevent server-side HTTPClient from accessing `localhost` or internal IP addresses. This is a security control to prevent SSRF (Server-Side Request Forgery) attacks.

**Error you may see:**
```
Error fetching PWA content: com.demandware.core.security.controls.SecurityControlRuntimeException: Access attempt to internal IP address space: localhost
```

## Solution

Use Site Preferences to configure a publicly accessible URL for your PWA Kit application. The PWAProxy controller will read this URL from Site Preferences instead of hardcoding `localhost`.

## Setup Steps

### Step 1: Expose Your Local PWA Kit Application Publicly

Since SFCC cannot access `localhost`, you need to expose your PWA Kit application via a public URL. Here are recommended options:

#### Option A: Using ngrok (Recommended for Development)

1. **Install ngrok:**
   ```bash
   # Download from https://ngrok.com/download
   # Or using npm:
   npm install -g ngrok
   ```

2. **Start your PWA Kit application:**
   ```bash
   cd demo-multisite-app
   npm start
   # Your app should be running on http://localhost:3000
   ```

3. **Expose it via ngrok:**
   ```bash
   ngrok http 3000
   ```

4. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

#### Option B: Using localtunnel

1. **Install localtunnel:**
   ```bash
   npm install -g localtunnel
   ```

2. **Expose your app:**
   ```bash
   lt --port 3000
   ```

3. **Copy the provided URL** (e.g., `https://your-subdomain.loca.lt`)

#### Option C: Deploy to a Public Server

Deploy your PWA Kit application to a publicly accessible server (e.g., Heroku, AWS, Azure, etc.) and use that URL.

### Step 2: Import Site Preferences Metadata

1. **Upload the metadata file to Business Manager:**
   - Go to **Administration > Site Development > Import & Export**
   - Click **Import**
   - Select the file: `app_custom_storefront/meta/system-objecttype-extensions.xml`
   - Click **Next** and then **Import**

   This adds the `pwaKitURL` custom preference to Site Preferences.

### Step 3: Configure Site Preferences

1. **Navigate to Site Preferences:**
   - Go to **Merchant Tools > Site Preferences > Custom Preferences**
   - Find the **PWA Kit** section

2. **Set the PWA Kit URL:**
   - In the **PWA Kit URL** field, enter your publicly accessible PWA Kit URL
   - **Important:** 
     - Use `https://` protocol (not `http://`)
     - Do NOT include a trailing slash
     - Do NOT include the site ID or page path (just the base URL)
   
   **Examples:**
   - ✅ `https://abc123.ngrok.io`
   - ✅ `https://your-pwa-app.herokuapp.com`
   - ✅ `https://pwa.yourdomain.com`
   - ❌ `http://localhost:3000` (won't work - not publicly accessible)
   - ❌ `https://abc123.ngrok.io/` (trailing slash will be handled, but avoid it)
   - ❌ `https://abc123.ngrok.io/my-store` (don't include site ID)

3. **Save the preferences**

### Step 4: Verify the Integration

1. **Access your SFRA page** that uses the `pwaPage` template
2. **Check the browser console** for any errors
3. **Verify the PWA content loads** correctly

## How It Works

1. The `pwaPage.isml` template makes a request to `PWAProxy-GetContent`
2. The `PWAProxy.js` controller reads the `pwaKitURL` from Site Preferences
3. It constructs the full URL: `{pwaKitURL}/{siteID}/page/{pageID}?preview=true`
4. It fetches the content server-side and returns it to the template
5. The template injects the content into the page using Shadow DOM for CSS isolation

## Troubleshooting

### Error: "PWA Kit URL not configured"
- **Solution:** Make sure you've imported the metadata and set the URL in Site Preferences

### Error: "Failed to fetch PWA content" with status 404
- **Solution:** Verify your PWA Kit URL is correct and the route `/{siteID}/page/{pageID}` exists in your PWA Kit app

### Error: "Failed to fetch PWA content" with status 0 or timeout
- **Solution:** 
  - Verify your PWA Kit app is running and accessible via the public URL
  - Check if ngrok/localtunnel is still active (they may have expired)
  - Verify the URL is publicly accessible (try opening it in a browser)

### Content loads but styles are broken
- **Solution:** This is expected if using Shadow DOM. The Shadow DOM isolates CSS. You may need to adjust your CSS or use a different approach for style injection.

## Notes

- **ngrok free tier:** URLs change on each restart. For production, use a paid ngrok plan with a static domain or deploy to a permanent server.
- **Security:** Always use HTTPS in production. The Site Preference supports both HTTP and HTTPS, but HTTPS is recommended.
- **Performance:** Consider caching the fetched content if pages don't change frequently.



