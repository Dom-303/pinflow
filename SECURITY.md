# Security

PinFlow is designed for local development workflows. It is not a hosted service
and should not be exposed to the public internet.

## Local Data

PinFlow writes development artifacts into `.pinflow/`:

- `.pinflow/manifest.jsonl` maps instrumented DOM IDs to source locations.
- `.pinflow/annotations/` stores local annotation tasks and agent responses.
- `.pinflow/relay.lock` stores the local relay port and process metadata.

The init wizard adds `.pinflow` to `.gitignore`. Keep it ignored in consuming
projects because annotations may contain screenshots-in-text, UI copy, file
paths, user instructions, or implementation details.

## Relay Binding

The relay binds to `127.0.0.1` by default. Keep that default for normal use.
Only pass `--host 0.0.0.0` on trusted networks and only for short-lived manual
testing.

PinFlow's browser overlay needs cross-origin access during local development
because dev servers commonly run on different localhost ports. Treat the relay
as a trusted local development process, not as a network service.

## Redaction

PinFlow includes PII redaction utilities for common sensitive patterns such as
emails, phone numbers, credit cards, SSNs, API keys, JWTs, and IP addresses.
Redaction lowers accidental leakage risk, but it is not a substitute for review.

Before sharing logs, annotations, or `.pinflow/` contents, inspect them for:

- credentials and API keys,
- private file paths,
- customer/user data,
- internal URLs or hostnames,
- proprietary UI copy.

## Reporting

Please report security issues privately to the repository owner instead of
opening a public issue. Include reproduction steps, affected package/version,
and whether the issue requires a non-default relay host or other manual setup.
