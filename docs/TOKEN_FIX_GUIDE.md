# Token Authentication Fix

## Problem

The application was showing "Invalid or expired token" errors when loading pages like Classes, Teachers, and Students.

## Root Cause

The issue was caused by **Server-Side Rendering (SSR)** in Next.js attempting to access `localStorage` during the server-side rendering phase. Since `localStorage` only exists in the browser (client-side), this was causing the auth token to not be sent with API requests.

## Solution Applied

### 1. Fixed API Client (`frontend/src/lib/api.ts`)

Added browser environment checks to prevent accessing `localStorage` on the server:

```typescript
// Request interceptor - now checks for browser environment
if (typeof window !== "undefined") {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
}

// Response interceptor - now checks for browser environment
if (typeof window !== "undefined") {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/auth/login";
}
```

### 2. Added Debug Logging

**Backend (`backend/src/middleware/auth.ts`):**

- Logs when auth header is present/missing
- Logs JWT_SECRET availability
- Logs token verification success/failure
- Shows detailed error messages

**Backend (`backend/src/controllers/auth/authController.ts`):**

- Logs token generation during login
- Shows JWT_SECRET status
- Displays token payload

**Frontend (`frontend/src/lib/api.ts`):**

- Logs each API request
- Shows whether token is being sent
- Indicates server-side vs client-side requests

## How to Test the Fix

### 1. Restart Both Servers

**Backend:**

```powershell
cd "c:\Projects in C\ventionz\schools\backend"
npm run dev
```

**Frontend:**

```powershell
cd "c:\Projects in C\ventionz\schools\frontend"
npm run dev
```

### 2. Test Login Flow

1. Open browser to `http://localhost:3000`
2. Navigate to Login page
3. Open browser DevTools (F12) → Console
4. Login with your credentials
5. Check Console for:
   - `[API] Request to /auth/login WITHOUT token` (expected before login)
   - Token storage confirmation

### 3. Test Protected Pages

1. After logging in, navigate to:
   - Classes: `http://localhost:3000/dashboard/classes`
   - Teachers: `http://localhost:3000/dashboard/teachers`
   - Students: `http://localhost:3000/dashboard/students`

2. Check Console for:
   - `[API] Request to /academic/classes with token: eyJhb...` (token present)
   - No "Invalid or expired token" errors

3. Check Backend Terminal for:
   - `✅ Token verified successfully`
   - User payload details

### 4. Verify Expected Behavior

**✅ SHOULD WORK:**

- Pages load without "Invalid or expired token" errors
- Data displays correctly on Classes, Teachers, Students pages
- Token is sent with every authenticated request
- Console shows token being used

**❌ SHOULD FAIL (Expected):**

- If you manually clear localStorage and refresh → redirects to login
- If you try to access dashboard without logging in → redirects to login

## Debug Information Available

### Frontend Console Logs

- `[API] Request to {endpoint} with token:` - Request being made with auth
- `[API] Request to {endpoint} WITHOUT token` - Request without auth
- `[API] Server-side request to {endpoint}` - SSR request (token skipped intentionally)

### Backend Console Logs

- `=== AUTH DEBUG ===` - Token verification attempt
- `✅ Token verified successfully` - Auth succeeded
- `❌ Token verification failed` - Auth failed (with reason)
- `=== LOGIN TOKEN GENERATION ===` - New token created during login

## Common Issues & Solutions

### Issue: Still seeing "Invalid or expired token"

**Solution:**

1. Clear browser localStorage (F12 → Application → Local Storage → Clear)
2. Logout and login again
3. Check backend terminal for JWT_SECRET status

### Issue: Token not being sent

**Solution:**

1. Verify you're logged in (check localStorage for "token" key)
2. Check browser console for `[API]` logs
3. Ensure you're on a client-side page (has "use client" directive)

### Issue: JWT_SECRET mismatch

**Solution:**

1. Verify backend `.env` file has: `JWT_SECRET=your-super-secret-jwt-key-change-this-in-production`
2. Restart backend server after changing `.env`
3. Login again to get new token with correct secret

## What Changed in the Code

### Files Modified:

1. **`frontend/src/lib/api.ts`**
   - Added `typeof window !== "undefined"` checks
   - Added debug logging to request/response interceptors

2. **`backend/src/middleware/auth.ts`**
   - Added comprehensive debug logging
   - Shows token verification process and errors

3. **`backend/src/controllers/auth/authController.ts`**
   - Added token generation logging
   - Shows JWT_SECRET availability

### Files Created:

1. **`backend/test-token.ts`** (optional test file)
   - Can be used to manually test JWT generation/verification

## Removing Debug Logs (Optional)

Once you've confirmed everything works, you can remove the console.log statements from:

- `frontend/src/lib/api.ts` (lines with `console.log('[API]'...`)
- `backend/src/middleware/auth.ts` (lines between `=== AUTH DEBUG ===`)
- `backend/src/controllers/auth/authController.ts` (lines between `=== LOGIN TOKEN ===`)

## Summary

The fix ensures that:

1. ✅ `localStorage` is only accessed in browser environment
2. ✅ Server-side requests skip token retrieval (they wouldn't need it anyway)
3. ✅ Client-side requests properly include the auth token
4. ✅ Detailed debug info helps troubleshoot any remaining issues
5. ✅ Token verification works correctly on the backend

The "Invalid or expired token" errors should now be resolved!
