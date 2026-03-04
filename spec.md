# Labellezaoculta

## Current State
Full-stack photo gallery with admin panel. Users can view albums and photos. Admin can manage albums (create, rename, delete) and photos (upload, edit, delete). Authentication via Internet Identity.

**Known bugs:**
1. Navigation buttons (Admin login) not visible on some screen sizes - only hamburger icon shown
2. Album renaming fails silently - no error message shown
3. `registerAsAdmin()` in backend uses `AccessControl.initialize` with empty tokens `("", "")`, which registers the user as `#user` instead of `#admin` because the empty string doesn't match the `CAFFEINE_ADMIN_TOKEN`. This means authenticated users can never get admin permissions via the self-registration flow.
4. `useActor.ts` (protected file) calls `_initializeAccessControlWithSecret("")` with empty token, which may cause the authenticated actor to malfunction.

## Requested Changes (Diff)

### Add
- A new `selfRegisterFirstAdmin()` backend function that allows the first unauthenticated user to register as admin (bypass token check for first admin only)
- Better error surfacing in the album rename flow

### Modify
- `registerAsAdmin()` in backend: change to assign the caller as `#admin` directly if no admin has been assigned yet (first-come-first-served), or as `#user` otherwise. Remove the token dependency entirely.
- Nav: ensure Admin/login button is always visible regardless of screen width (not hidden on small screens behind hamburger only)

### Remove
- Nothing

## Implementation Plan
1. Regenerate backend Motoko to fix `registerAsAdmin()` - it should assign `#admin` role directly without token check when no admin exists, and `#user` role otherwise
2. Update frontend Nav to ensure login/Admin button is visible at all breakpoints
3. Ensure error toasts are shown when album rename fails
