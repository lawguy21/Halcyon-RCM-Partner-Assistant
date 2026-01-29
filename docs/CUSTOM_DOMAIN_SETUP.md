# Custom Domain Configuration

This guide covers setting up custom domains for white-label partner instances of the Halcyon RCM Partner Assistant.

## Table of Contents

- [Overview](#overview)
- [Adding a Custom Domain](#adding-a-custom-domain)
- [DNS Configuration](#dns-configuration)
- [SSL Certificate Provisioning](#ssl-certificate-provisioning)
- [Domain Verification](#domain-verification)
- [Multi-Domain Setup](#multi-domain-setup)
- [Troubleshooting](#troubleshooting)

---

## Overview

Each partner organization can use their own custom domain(s) to access the Halcyon RCM platform. This provides:

- **Brand consistency**: Users see the partner's domain, not the platform domain
- **Trust**: Patients trust communications from their healthcare provider's domain
- **Email deliverability**: Emails sent from verified domains have better deliverability
- **SEO isolation**: Each partner has their own domain authority

### Supported Domain Configurations

| Configuration | Example | Use Case |
|---------------|---------|----------|
| Subdomain | `rcm.partnerhospital.com` | Most common, easy setup |
| Apex domain | `partnerrcm.com` | Dedicated RCM brand |
| Multiple subdomains | `app.partner.com`, `api.partner.com` | Separate frontend/API |

---

## Adding a Custom Domain

### Step 1: Register the Domain via API

```bash
curl -X POST https://api.halcyon-rcm.com/api/organizations/{orgId}/domains \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "rcm.partnerhospital.com",
    "type": "web",
    "isPrimary": true
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "domain_abc123",
    "domain": "rcm.partnerhospital.com",
    "type": "web",
    "status": "pending_verification",
    "verificationToken": "halcyon-verify-abc123xyz",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Step 2: Domain Types

| Type | Purpose | Example |
|------|---------|---------|
| `web` | Web application access | `app.partner.com` |
| `api` | API endpoint access | `api.partner.com` |
| `email` | Email sending domain | `mail.partner.com` |

---

## DNS Configuration

### Option 1: CNAME Record (Recommended for Subdomains)

Add a CNAME record pointing your subdomain to the platform:

```dns
; DNS Zone File
rcm.partnerhospital.com.    3600    IN    CNAME    platform.halcyon-rcm.com.
```

**DNS Provider Examples:**

| Provider | Record Type | Host/Name | Value/Target |
|----------|-------------|-----------|--------------|
| Cloudflare | CNAME | `rcm` | `platform.halcyon-rcm.com` |
| AWS Route53 | CNAME | `rcm.partnerhospital.com` | `platform.halcyon-rcm.com` |
| GoDaddy | CNAME | `rcm` | `platform.halcyon-rcm.com` |
| Namecheap | CNAME | `rcm` | `platform.halcyon-rcm.com.` |

### Option 2: A Record (For Apex Domains)

If using an apex domain (e.g., `partnerrcm.com`), use A records:

```dns
; DNS Zone File
partnerrcm.com.    3600    IN    A    203.0.113.10
partnerrcm.com.    3600    IN    A    203.0.113.11
```

> **Note:** Contact support for current IP addresses. Consider using ALIAS/ANAME records if your DNS provider supports them.

### Option 3: Multiple Subdomains

For separate frontend and API domains:

```dns
; Web application
app.partner.com.    3600    IN    CNAME    platform.halcyon-rcm.com.

; API endpoint
api.partner.com.    3600    IN    CNAME    api.halcyon-rcm.com.
```

---

## SSL Certificate Provisioning

### Automatic SSL (Let's Encrypt)

SSL certificates are automatically provisioned via Let's Encrypt once domain verification is complete.

**Process:**

1. Domain verification passes (DNS records confirmed)
2. Let's Encrypt challenge initiated (HTTP-01 or DNS-01)
3. Certificate issued and installed
4. Certificate auto-renews every 60 days

**Timeline:**
- DNS propagation: 5 minutes to 48 hours
- Certificate issuance: 5-15 minutes after DNS propagation
- Total: Usually under 1 hour

### Custom SSL Certificate

For organizations requiring custom certificates (e.g., EV certificates):

```bash
curl -X POST https://api.halcyon-rcm.com/api/organizations/{orgId}/domains/{domainId}/certificate \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "certificate": "-----BEGIN CERTIFICATE-----\n...",
    "privateKey": "-----BEGIN PRIVATE KEY-----\n...",
    "chain": "-----BEGIN CERTIFICATE-----\n..."
  }'
```

### Certificate Requirements

| Requirement | Specification |
|-------------|---------------|
| Format | PEM encoded |
| Key Size | RSA 2048-bit minimum, 4096-bit recommended |
| Validity | Maximum 1 year (398 days) |
| Chain | Include intermediate certificates |

---

## Domain Verification

### Verification TXT Record

Add a TXT record to verify domain ownership:

```dns
; Verification TXT record
_halcyon-verify.rcm.partnerhospital.com.    3600    IN    TXT    "halcyon-verify=abc123xyz"
```

**DNS Provider Examples:**

| Provider | Record Type | Host/Name | Value |
|----------|-------------|-----------|-------|
| Cloudflare | TXT | `_halcyon-verify.rcm` | `halcyon-verify=abc123xyz` |
| AWS Route53 | TXT | `_halcyon-verify.rcm.partnerhospital.com` | `"halcyon-verify=abc123xyz"` |
| GoDaddy | TXT | `_halcyon-verify.rcm` | `halcyon-verify=abc123xyz` |

### Trigger Verification

```bash
# Request verification check
curl -X POST https://api.halcyon-rcm.com/api/organizations/{orgId}/domains/{domainId}/verify \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "status": "verified",
    "verifiedAt": "2024-01-15T11:00:00Z",
    "sslStatus": "provisioning"
  }
}
```

### Verification Status Values

| Status | Description |
|--------|-------------|
| `pending_verification` | DNS records not yet detected |
| `verification_failed` | DNS records incorrect or not found |
| `verified` | Domain ownership confirmed |
| `ssl_provisioning` | SSL certificate being issued |
| `active` | Domain fully configured and active |

---

## Multi-Domain Setup

### Primary and Secondary Domains

```bash
# Add primary domain
curl -X POST .../domains -d '{"domain": "app.partner.com", "isPrimary": true}'

# Add secondary domain (redirects to primary)
curl -X POST .../domains -d '{"domain": "partner-rcm.com", "isPrimary": false}'
```

### Redirect Configuration

Secondary domains automatically redirect to the primary domain:

```
partner-rcm.com -> 301 Redirect -> app.partner.com
www.partner-rcm.com -> 301 Redirect -> app.partner.com
```

### Separate API Domain

For enhanced security, use a separate API domain:

```bash
# Web application domain
curl -X POST .../domains -d '{"domain": "app.partner.com", "type": "web"}'

# API domain
curl -X POST .../domains -d '{"domain": "api.partner.com", "type": "api"}'
```

Update environment variables:

```bash
NEXT_PUBLIC_API_URL=https://api.partner.com
CORS_ORIGIN=https://app.partner.com
```

---

## Troubleshooting

### Common DNS Issues

#### DNS Records Not Propagating

**Symptoms:**
- Verification fails
- "DNS record not found" errors

**Solutions:**

1. **Check TTL values**: Lower TTL (300-3600 seconds) speeds up propagation

2. **Verify records with dig:**
   ```bash
   # Check CNAME record
   dig rcm.partnerhospital.com CNAME +short

   # Check TXT verification record
   dig _halcyon-verify.rcm.partnerhospital.com TXT +short

   # Check A record
   dig partnerrcm.com A +short
   ```

3. **Use multiple DNS servers:**
   ```bash
   dig @8.8.8.8 rcm.partnerhospital.com CNAME +short
   dig @1.1.1.1 rcm.partnerhospital.com CNAME +short
   ```

4. **Wait for propagation**: Can take up to 48 hours globally

#### Conflicting Records

**Symptoms:**
- SSL provisioning fails
- Intermittent access issues

**Solutions:**
- Remove conflicting A records when using CNAME
- Ensure no wildcard records interfere
- Check for proxy settings (Cloudflare orange cloud)

### SSL Certificate Issues

#### Certificate Not Issuing

**Symptoms:**
- Status stuck at `ssl_provisioning`
- HTTPS not working after 1 hour

**Causes and Solutions:**

1. **DNS not propagated**: Wait longer, verify with external tools
2. **Firewall blocking**: Ensure port 80 is open for HTTP-01 challenge
3. **CAA records**: Add CAA record allowing Let's Encrypt:
   ```dns
   partnerhospital.com.    3600    IN    CAA    0 issue "letsencrypt.org"
   ```

#### Certificate Mismatch

**Symptoms:**
- Browser shows security warning
- "Certificate name does not match" error

**Solutions:**
- Verify domain exactly matches certificate
- Check for www vs non-www mismatch
- Ensure certificate includes all subdomains

### Connection Issues

#### ERR_SSL_VERSION_OR_CIPHER_MISMATCH

**Solutions:**
- Update browser/client
- Check TLS version requirements
- Verify certificate chain is complete

#### ERR_TOO_MANY_REDIRECTS

**Solutions:**
- Check for redirect loops between HTTP/HTTPS
- Verify Cloudflare SSL mode is "Full (strict)"
- Ensure application isn't redirecting to itself

### Diagnostic Commands

```bash
# Check DNS resolution
nslookup rcm.partnerhospital.com

# Check SSL certificate
openssl s_client -connect rcm.partnerhospital.com:443 -servername rcm.partnerhospital.com

# Check certificate details
echo | openssl s_client -connect rcm.partnerhospital.com:443 2>/dev/null | openssl x509 -noout -dates

# Test HTTPS connection
curl -vI https://rcm.partnerhospital.com

# Check HTTP to HTTPS redirect
curl -I http://rcm.partnerhospital.com
```

### Support Escalation

If issues persist after troubleshooting:

1. **Gather information:**
   - Domain name
   - DNS provider
   - Error messages
   - dig/nslookup output
   - SSL certificate details

2. **Contact support:**
   - Email: support@halcyon-rcm.com
   - Include organization ID and domain ID

---

## Related Documentation

- [WHITE_LABEL_SETUP.md](./WHITE_LABEL_SETUP.md) - Overall setup guide
- [PARTNER_DEPLOYMENT.md](./PARTNER_DEPLOYMENT.md) - Deployment options
- [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) - Environment configuration
