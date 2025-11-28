# Password Reset Flow Fixes

## Issues Fixed

1. **Token URL Encoding**: Properly URL-encode tokens in email links to prevent truncation or corruption
2. **Expiry Check**: Use timestamp comparison (`getTime()`) instead of Date comparison for more reliable expiry checks
3. **Token Decoding**: Handle URL-decoding of tokens when reading from query parameters
4. **Better Logging**: Added detailed logging for debugging token validation and expiry issues
5. **NEXTAUTH_URL Validation**: Added warning if NEXTAUTH_URL is not set

## Changes Made

### 1. `src/app/api/auth/forgot-password/route.ts`
- Added proper URL encoding for token and reset ID in email link
- Added warning if NEXTAUTH_URL is not set
- Enhanced logging with token length and timestamp information

### 2. `src/app/api/auth/reset-password/route.ts`
- Changed expiry check from `Date` comparison to timestamp comparison (`getTime()`)
- Added token decoding to handle URL-encoded tokens
- Enhanced error logging with timestamp details

### 3. `src/app/api/auth/validate-reset-token/route.ts`
- Changed expiry check from `Date` comparison to timestamp comparison
- Added token decoding to handle URL-encoded tokens
- Enhanced error logging

### 4. `src/app/reset-password/page.tsx`
- Ensured proper URL encoding when making validation API call

## Environment Variables Required

Make sure these are set in your `.env` file:

```bash
NEXTAUTH_URL=https://travunited.com
# OR
NEXT_PUBLIC_APP_URL=https://travunited.com
```

## Testing Checklist

1. **Check Database Table Exists**:
   ```sql
   SELECT id, "userId", "tokenHash", used, "expiresAt", "createdAt" 
   FROM "PasswordReset" 
   ORDER BY "createdAt" DESC 
   LIMIT 10;
   ```

2. **Verify NEXTAUTH_URL**:
   ```bash
   echo $NEXTAUTH_URL
   # Should output: https://travunited.com
   ```

3. **Test Password Reset Flow**:
   - Go to `/forgot-password`
   - Enter a valid email
   - Check email for reset link
   - Click the link
   - Verify it opens `/reset-password?token=...&id=...`
   - Enter new password
   - Verify password is reset successfully

4. **Check Server Logs**:
   Look for these log entries:
   - `[Password Reset] Attempting to send email` - when email is sent
   - `[Password Reset] Email sent successfully` - confirmation
   - `[Password Reset] Token validated successfully` - when link is clicked
   - `[Password Reset] Successfully reset password` - when password is reset

## Common Issues and Solutions

### Issue: "Link expired" immediately
**Cause**: NEXTAUTH_URL not set or incorrect
**Solution**: Set `NEXTAUTH_URL=https://travunited.com` in `.env` and restart server

### Issue: "Invalid reset token"
**Cause**: Token encoding/decoding mismatch
**Solution**: Fixed in code - tokens are now properly URL-encoded/decoded

### Issue: Token not found in database
**Cause**: PasswordReset table missing or token not saved
**Solution**: Check database table exists, check logs for creation errors

### Issue: Email not received
**Cause**: Email service not configured
**Solution**: Check `RESEND_API_KEY` and `EMAIL_FROM` environment variables

## Manual Testing

To manually test with a token:

1. Create a test token in database:
   ```sql
   INSERT INTO "PasswordReset"(id, "userId", "tokenHash", used, "expiresAt", "createdAt")
   VALUES (
     'test-reset-1',
     '<USER_ID>',
     '$2a$10$...', -- bcrypt hash of a test token
     false,
     now() + interval '1 hour',
     now()
   );
   ```

2. Test reset endpoint:
   ```bash
   curl -X POST https://travunited.com/api/auth/reset-password \
     -H "Content-Type: application/json" \
     -d '{"id":"test-reset-1","token":"<RAW_TOKEN>","password":"NewPass123!"}'
   ```

## Next Steps

1. Deploy these changes to production
2. Test the password reset flow end-to-end
3. Monitor server logs for any errors
4. Verify emails are being sent correctly
5. Check that reset links work in different email clients

