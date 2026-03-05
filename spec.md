# Labellezaoculta

## Current State
Gallery app with albums and photos. Admin access is broken: users get "access denied" because `_initializeAccessControlWithSecret` is called with an empty token in `useActor`, registering them as `#user`. Then `registerAsAdmin` can't elevate them. The `registerAsAdmin` backend function passes empty strings to `initialize()` which only works if `CAFFEINE_ADMIN_TOKEN` is also empty (it isn't).

## Requested Changes (Diff)

### Add
- Backend: new `claimAdmin()` function that allows the first non-anonymous, unregistered caller to become admin without a token (first-come-first-served). If admin is already assigned, returns an error.
- Backend: `isAdminClaimed()` query to check if an admin has already been registered.

### Modify
- Frontend `useQueries.ts`: `useRegisterAsAdmin` mutation should call `actor.claimAdmin()` directly instead of requiring `caffeineAdminToken` from the URL. Still invalidates isAdmin/isRegistered queries on success.
- Frontend `AdminPanel.tsx`: `AutoRegisterScreen` should handle the new error when admin is already claimed (show a different message explaining that admin is already taken).

### Remove
- Backend: remove `registerAsAdmin()` function that was broken (passed empty tokens).

## Implementation Plan
1. Add `claimAdmin()` and `isAdminClaimed()` to backend `main.mo`
2. Remove broken `registerAsAdmin()` from `main.mo`
3. Update `useRegisterAsAdmin` in `useQueries.ts` to call `actor.claimAdmin()`
4. Update `AutoRegisterScreen` in `AdminPanel.tsx` to handle "admin already claimed" error message
