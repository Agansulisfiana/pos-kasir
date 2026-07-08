# SECURITY

## Purpose

This document defines the mandatory security standards for the PTRIS website.

Every generated code, configuration, deployment, optimization, or feature must follow these security requirements.

Security is not optional.

Security must always take priority over convenience.

---

# Security Mindset

Think like:

- Security Engineer
- Penetration Tester
- OWASP Reviewer
- DevSecOps Engineer

Always assume:

- Every input is malicious.
- Every request can be manipulated.
- Every user can be an attacker.
- Every uploaded file can be dangerous.
- Every URL can be modified.
- Every JavaScript request can be intercepted.

Trust nothing.

Validate everything.

---

# Security Objectives

Every implementation must improve:

✔ Confidentiality

✔ Integrity

✔ Availability

✔ Authenticity

✔ Maintainability

✔ Auditability

---

# OWASP Top 10 Compliance

Always prevent:

A01 Broken Access Control

A02 Cryptographic Failures

A03 Injection

A04 Insecure Design

A05 Security Misconfiguration

A06 Vulnerable Components

A07 Authentication Failure

A08 Software Integrity Failure

A09 Logging Failure

A10 Server Side Request Forgery

---

# Input Validation

Always validate:

Text

Email

Phone

Number

URL

File Upload

Search

Dropdown

Textarea

Checkbox

Radio Button

Date

Never trust browser validation.

Always validate again.

---

# Input Sanitization

Always sanitize:

HTML

JavaScript

CSS

URL

JSON

Markdown

Special Characters

Prevent:

XSS

HTML Injection

Script Injection

DOM Injection

Attribute Injection

---

# Output Encoding

Always encode output before rendering.

Escape:

<

>

"

'

&

Never insert user input directly into HTML.

Never use innerHTML unless absolutely necessary.

Prefer:

textContent

setAttribute()

createElement()

---

# JavaScript Security

Never:

eval()

new Function()

document.write()

innerHTML

outerHTML

setTimeout(string)

setInterval(string)

Avoid dynamic code execution.

---

# Form Security

Every form must:

Validate input

Sanitize input

Limit maximum length

Reject invalid data

Prevent spam

Prevent abuse

Prevent automated submission

---

# API Keys

Never:

Hardcode API keys

Expose tokens

Commit credentials

Store secrets in JavaScript

Store passwords in HTML

Store passwords in CSS

Sensitive values belong only on secure servers.

---

# Authentication

Always:

Use secure session

Expire session

Logout correctly

Regenerate session

Secure cookies

HttpOnly

SameSite

Secure flag

Never store passwords in plain text.

---

# Password Policy

Minimum 12 characters

Uppercase

Lowercase

Number

Symbol

No dictionary words

Never expose password rules to attackers.

---

# HTTPS

Always enforce HTTPS.

Redirect HTTP → HTTPS.

Never load insecure resources.

Reject mixed content.

---

# HTTP Security Headers

Always use:

Content-Security-Policy

Strict-Transport-Security

Referrer-Policy

Permissions-Policy

X-Content-Type-Options

X-Frame-Options

Cross-Origin-Opener-Policy

Cross-Origin-Embedder-Policy

Cross-Origin-Resource-Policy

---

# CSP

Default:

default-src 'self'

Avoid:

unsafe-inline

unsafe-eval

Only allow trusted domains.

---

# External Links

Always use:

rel="noopener"

rel="noreferrer"

target="\_blank"

Never trust third-party websites.

---

# File Upload

Always verify:

Extension

MIME Type

File Size

Image Signature

Virus Scan (if backend available)

Rename uploaded files.

Never trust original filename.

Never execute uploaded files.

---

# Images

Use optimized images.

Never allow executable images.

Prefer:

WebP

SVG (trusted only)

PNG

---

# SVG Security

Treat SVG as code.

Never allow:

Embedded JavaScript

ForeignObject

External Resources

Unknown SVG sources

Sanitize SVG before use.

---

# SQL

Always use prepared statements.

Never concatenate SQL.

Never trust user input.

Avoid dynamic query building.

---

# Logging

Never log:

Password

Token

Session

API Key

Secret

Personal Information

Log only useful security events.

---

# Error Handling

Never expose:

Stack Trace

Framework Version

Database Error

Internal Path

Server Information

Generic error messages only.

---

# Sensitive Files

Protect:

.env

.git

.gitignore

.htaccess

config

backup

database

logs

cache

node_modules

vendor

Never expose system files.

---

# Directory Listing

Always disable directory listing.

Apache:

Options -Indexes

Verify after deployment.

---

# Git Security

Never commit:

.env

backup

tmp

cache

node_modules

dist-test

API Keys

Passwords

Certificates

Private Keys

---

# Development Security

Before commit verify:

No console.log

No debug code

No test credentials

No fake data

No TODO secrets

No localhost URLs

---

# Production Security

Verify:

HTTPS

SSL

Headers

Compression

Cache

Cloudflare

Firewall

Redirect

Error Pages

Robots

Sitemap

Favicon

No exposed folders

---

# Cloudflare

Recommended:

Bot Fight Mode

WAF

Browser Integrity Check

Always HTTPS

TLS 1.3

Automatic HTTPS Rewrite

DDoS Protection

Rate Limiting

Caching

Turnstile

---

# Dewaweb

Recommended:

SSL Active

Auto Backup

Malware Scanner

ModSecurity

Latest PHP

Latest Apache

SSH Disabled (if unused)

Strong cPanel Password

2FA Enabled

---

# Rate Limiting

Protect:

Login

Contact Form

Search

API

Password Reset

Prevent brute force attacks.

---

# Anti Spam

Use:

Cloudflare Turnstile

Honeypot

Rate Limit

Time Validation

Duplicate Submission Detection

---

# Security Testing

Before deployment test:

OWASP ZAP

Google Lighthouse

Security Headers

SSL Labs

PageSpeed

Broken Links

Console Errors

Mixed Content

---

# Monitoring

Regularly monitor:

404

403

500

Login Attempts

Traffic

Bandwidth

Cloudflare Events

Hosting Logs

Git Changes

---

# Backup

Always maintain:

Daily Backup

Weekly Backup

Monthly Backup

Offline Backup

Test restoration periodically.

---

# Incident Response

If a compromise is suspected:

Immediately enable maintenance mode.

Change all passwords.

Rotate API keys.

Review logs.

Restore from trusted backup.

Verify integrity before reopening.

---

# AI Rules

When generating code:

Always choose the safer implementation.

Never expose sensitive information.

Never disable security checks.

Never recommend insecure shortcuts.

Always explain security risks if a request would weaken the application.

---

# Final Security Checklist

Before completing any task verify:

✓ HTTPS enforced

✓ Input validated

✓ Input sanitized

✓ Output encoded

✓ No XSS

✓ No Injection

✓ No exposed secrets

✓ No directory listing

✓ Secure headers

✓ Secure external links

✓ No console.log

✓ No debug code

✓ No sensitive files exposed

✓ Cloudflare compatible

✓ Dewaweb compatible

✓ OWASP compliant

✓ Production ready

---

# Absolute Rules

Security always overrides convenience.

Never reduce security to simplify implementation.

Never expose confidential information.

Never assume users are trusted.

Always build with a Zero Trust mindset.

The objective is to make the PTRIS website resilient against common web attacks while remaining maintainable, performant, and enterprise-grade.
