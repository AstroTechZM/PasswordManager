# Password Manager Extension

A secure, client-side, browser-based password manager extension designed for Google Chrome.

---

## Security Architecture

This extension follows a **Zero-Knowledge** security philosophy, ensuring that all encryption and decryption operations occur locally within the browser.

### Encryption
- **Algorithm:** AES-256-GCM
- Provides both data confidentiality and integrity.

### Key Derivation
- **Algorithm:** Argon2id (via the WebCrypto API)
- Securely derives encryption keys from the user's master password.

### Storage
- Encrypted vault data is stored locally using `chrome.storage.local`.
- The master password is **never** stored or transmitted.

### Isolation
- Sensitive cryptographic operations are executed exclusively within the **Background Service Worker**, preventing access from webpage contexts.

---

## Core Components

### Popup UI
Responsible for:
- User authentication
- Viewing stored credentials
- Managing password entries

### Background Service Worker
Responsible for:
- Application state management
- Key derivation
- Cryptographic operations
- Secure storage access

### Content Script
Responsible for:
- Detecting login forms
- Safely filling credentials into web pages

---

## Development Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
```

### 2. Load the Extension

1. Open:

   ```
   chrome://extensions
   ```

2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the project directory.

---

## Debugging

To inspect the extension's background logs:

1. Open `chrome://extensions`.
2. Locate the extension.
3. Click **Inspect views → Service Worker**.

This opens the developer console for the background service worker.

---

## Roadmap

- [ ] Implement Argon2id key derivation logic.
- [ ] Establish secure messaging between the Popup UI and the Service Worker.
- [ ] Design and implement the encrypted vault storage schema.
- [ ] Develop login form detection and secure auto-fill functionality.

---

## Security Disclaimer

> **Warning**
>
> This project is intended for educational and learning purposes.
>
> It is currently under active development and **has not undergone a formal security audit**.
>
> **Do not store real or sensitive credentials** in this password manager until its security has been independently reviewed and verified.

---

## Architecture Overview

```text
                    +----------------------+
                    |      Popup UI        |
                    | Authentication & UI  |
                    +----------+-----------+
                               |
                               | Secure Messaging
                               |
                    +----------v-----------+
                    | Background Service   |
                    |      Worker          |
                    |----------------------|
                    | • Argon2id           |
                    | • AES-256-GCM        |
                    | • Vault Management   |
                    | • chrome.storage     |
                    +----------+-----------+
                               |
                +--------------+--------------+
                |                             |
                |                             |
      +---------v---------+          +--------v---------+
      | Content Script    |          | chrome.storage   |
      | Detect & Fill DOM |          | Local Encrypted  |
      +-------------------+          | Vault            |
                                     +------------------+
```

---


