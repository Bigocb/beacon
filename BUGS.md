# Bug Tracker - Minecraft Tracker

Track bugs, issues, and known problems here.

## Active Bugs

### [HIGH] - Local user auth persistence was failing after account creation
- **Status:** ✅ FIXED
- **Date Found:** 2026-03-21
- **Root Cause:** JWT tokens weren't being generated or stored after local user creation
- **Fix:**
  - Modified desktop/src/auth/oauth.ts to generate JWT tokens via jsonwebtoken
  - Updated LoginPage.tsx to call storeToken(result.token)
  - Token now persists in localStorage and database
- **Test:** Create local user → verify auto-login to dashboard → logout → login again

### [HIGH] - __dirname undefined error on app startup
- **Status:** ✅ FIXED
- **Date Found:** 2026-03-21
- **Root Cause:** Main process Node.js code (oauth.ts) was being bundled with renderer code, causing localStorage calls in Node environment
- **Fix:**
  - Created desktop/src/renderer/auth/tokenStorage.ts for renderer-only token management
  - Removed token functions from desktop/src/auth/oauth.ts
  - Separated main process and renderer imports
- **Build Status:** ✅ Builds successfully, 150 modules (down from 177)
- **Test:** Run `npm run dev` - app should start without white blank screen

### [MEDIUM] - Minecraft OAuth blocked by Xbox Developer Program
- **Status:** 🟡 WORKAROUND - Using local auth instead
- **Date Found:** 2026-03-18
- **Root Cause:** No Xbox Developer Program application under review, XboxLive.signin scope not available
- **Current Status:**
  - Local user authentication fully functional
  - Minecraft OAuth will work once app approved by Xbox program
- **Next Steps:** Monitor Xbox Developer Program enrollment status

### [LOW] - App bundle size warning
- **Status:** ⚠️ ACKNOWLEDGED
- **Details:** Renderer chunk is 520 KB (gzip 165 KB), exceeds 500 KB limit
- **Impact:** Not critical, code still works fine
- **Future:** Consider code-splitting with dynamic imports if needed
- **Ticket:** https://github.com/users/bigoc/projects/

## Fixed Bugs

| Bug | Fix Date | Status |
|-----|----------|--------|
| Profile page couldn't be exited without deleting account | 2026-03-21 | ✅ Added back button to ProfilePage |
| Google OAuth still shown in LoginPage | 2026-03-21 | ✅ Removed Google OAuth, Minecraft only |
| User profile not displaying avatar | 2026-03-21 | ✅ Implemented avatar URL input and preview |
| Token not included in API requests | 2026-03-21 | ✅ Added axios interceptor for auth headers |

## Known Issues / Limitations

- Minecraft OAuth temporarily unavailable (Xbox Developer Program limitation)
- Theme preference stored but no UI for switching (dark mode default)
- Profile name optional field not yet used in app
- No email verification for local accounts
- Single user per app instance (can log out and switch users, but no multi-user session)

## Testing Checklist

- [ ] Local user creation works
- [ ] Local user persists after app restart
- [ ] Profile page loads with user info
- [ ] Profile avatar URL can be edited
- [ ] Profile changes save to database
- [ ] Logout returns to LoginPage
- [ ] Token cleared from localStorage on logout
- [ ] User menu displays in header
- [ ] Back button navigates from ProfilePage to DashboardPage
- [ ] Delete account shows confirmation dialog
- [ ] Error messages display on API failures
- [ ] Loading states show during async operations

## Backlog / Future Improvements

- [ ] Implement Minecraft OAuth once Xbox app approved
- [ ] Add email field to user profiles
- [ ] Implement theme switcher (dark/light mode)
- [ ] Add bio/bio field to profiles
- [ ] User avatar upload (instead of just URL)
- [ ] Profile picture generation from username
- [ ] Settings page for user preferences
- [ ] Two-factor authentication
- [ ] Email notifications
- [ ] User badges/achievements
