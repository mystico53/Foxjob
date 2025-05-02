# Admin Area Authentication

This admin area uses Firebase Authentication with custom claims to restrict access to authorized users only.

## How It Works

1. The admin layout (`+layout.svelte`) checks if the current user has the `admin: true` custom claim.
2. All admin pages are protected by this layout, ensuring only authorized users can access them.
3. The Firestore rules are also updated to restrict access to admin users.

## Setting Up Admin Access

To grant admin access to a user:

1. Get the user's UID from Firebase Auth or from the dev-tools page (`/admin/dev-tools`) if you can log in as that user.
2. Use the `setAdminClaim.cjs` script in the `keys` folder:

```bash
# First, update the UID in the script
# Then run:
node keys/setAdminClaim.cjs
```

This script uses the Firebase Admin SDK to set the custom `admin` claim for the user.

## Dev Tools

A development tools page is available at `/admin/dev-tools` which shows:

- Current user details
- ID token claims
- Admin status

Use this page to verify that admin claims are correctly applied.

## Security Notes

1. Admin claims are set server-side and cannot be modified by clients.
2. Firestore rules enforce access control at the database level.
3. The SvelteKit layout enforces access control at the UI level.
