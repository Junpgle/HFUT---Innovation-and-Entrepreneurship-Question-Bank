# Security Considerations

## Known Vulnerabilities

### xlsx Package (v0.18.5)

The `xlsx` package used in this project has two known vulnerabilities:

1. **SheetJS Regular Expression Denial of Service (ReDoS)**
   - CVE: GHSA-5pgg-2g8v-p4x9
   - Affected versions: < 0.20.2
   - Severity: High

2. **Prototype Pollution in sheetJS**
   - CVE: GHSA-4r6h-8v6p-xvw6
   - Affected versions: < 0.19.3
   - Severity: High

**Status**: No patched version is available on npm. Versions 0.19.3+ and 0.20.2+ exist in the SheetJS repository but are not published to npm.

## Risk Assessment

### Current Usage Context

In this application, the `xlsx` library is used specifically to:
1. Parse Excel files containing quiz questions
2. Files are fetched from trusted sources (GitHub repository)
3. Files are created and maintained by the repository owner
4. No user-uploaded Excel files are processed

### Security Analysis

**Risk Level: LOW to MEDIUM**

Reasons:
1. ✅ **Controlled Input**: Excel files come from a trusted, version-controlled source (GitHub)
2. ✅ **No User Input**: Users cannot upload arbitrary Excel files
3. ✅ **Limited Attack Surface**: ReDoS and Prototype Pollution require specially crafted malicious files
4. ⚠️ **Supply Chain Risk**: If the GitHub repository is compromised, malicious Excel files could be introduced

## Mitigation Strategies

### Currently Implemented

1. **Trusted Source Only**: Files are fetched from the official GitHub repository
2. **HTTPS**: All file fetches use secure HTTPS connections
3. **Error Handling**: Excel parsing errors are caught and handled gracefully

### Recommended Additional Measures

#### Short-term (Can be implemented now)

1. **File Size Validation**: Add size limits before parsing
   ```javascript
   const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
   if (data.byteLength > MAX_FILE_SIZE) {
       throw new Error('File too large');
   }
   ```

2. **Timeout Protection**: Add timeout for parsing operations
   ```javascript
   const parseWithTimeout = (data, timeout = 5000) => {
       return Promise.race([
           Promise.resolve(XLSX.read(data, { type: 'array' })),
           new Promise((_, reject) => 
               setTimeout(() => reject(new Error('Parse timeout')), timeout)
           )
       ]);
   };
   ```

3. **Content Security Policy**: Add CSP headers to prevent XSS
   ```html
   <meta http-equiv="Content-Security-Policy" 
         content="default-src 'self'; script-src 'self' 'unsafe-inline' cdn.jsdelivr.net;">
   ```

#### Medium-term (Requires more effort)

1. **Move to SheetJS Pro/Commercial**: The commercial version has the security fixes
   - Pros: Official support, security patches
   - Cons: Requires license purchase

2. **Pre-process Excel files**: Convert Excel files to JSON on the server/CI pipeline
   - Pros: Eliminates client-side Excel parsing
   - Cons: Requires build pipeline changes

3. **Alternative Format**: Store questions in JSON/CSV instead of Excel
   - Pros: Eliminates Excel dependency entirely
   - Cons: Requires reformatting existing question bank

#### Long-term (Best practices)

1. **Backend API**: Move Excel parsing to a secure backend service
   - Parse Excel files on the server
   - Expose questions via REST API
   - Implement rate limiting and authentication
   - Regular security audits

2. **Content Validation**: Implement strict validation of parsed data
   - Validate question structure
   - Sanitize all text content
   - Reject unexpected data formats

## Monitoring and Response

### Detection

Monitor for:
- Unusually long parsing times (ReDoS indicator)
- Unexpected application behavior after file updates
- Client-side errors during question bank loading

### Response Plan

If exploitation is suspected:

1. **Immediate**: Remove suspicious Excel files from the repository
2. **Short-term**: Revert to known good version of question bank
3. **Long-term**: Implement one of the recommended mitigation strategies

## Alternative Solutions Evaluated

### 1. exceljs
- **Status**: More actively maintained
- **Pros**: Better security posture, more features
- **Cons**: Larger bundle size (~400KB vs 150KB), different API
- **Recommendation**: Consider for future migration

### 2. xlsx-populate
- **Status**: Moderately maintained
- **Pros**: Better for Excel creation/modification
- **Cons**: Similar security concerns, less feature-complete for reading
- **Recommendation**: Not suitable for this use case

### 3. JSON format
- **Status**: No dependencies needed
- **Pros**: No security vulnerabilities, faster parsing
- **Cons**: Requires converting existing Excel files
- **Recommendation**: Best long-term solution

## Decision

**Current Decision**: Keep xlsx v0.18.5 with documented risks

**Rationale**:
1. Low actual risk given controlled input source
2. No suitable patched alternative available on npm
3. Significant effort required to migrate away
4. Clear mitigation strategies available if needed

**Review Date**: This decision should be reviewed when:
- xlsx package releases a patched version on npm
- The application adds user file upload features
- A security incident occurs
- After 6 months (July 2026)

## Security Contact

If you discover a security vulnerability in this project, please report it to the repository maintainer via GitHub Security Advisories.

## References

- [GHSA-5pgg-2g8v-p4x9](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9) - ReDoS vulnerability
- [GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6) - Prototype Pollution vulnerability
- [SheetJS Repository](https://github.com/SheetJS/sheetjs) - Official SheetJS repository
- [SheetJS Pro](https://sheetjs.com/pro) - Commercial version with security fixes
