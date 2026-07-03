
let sessionMasterPassword = null; 
// --- 1. MESSAGING LAYER ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "REQ_AUTOFILL_DATA") {
    handleAutofillRequest(message.payload)
      .then((response) => sendResponse(response))
      .catch((error) => {
        console.error("Autofill Request Failed:", error);
        sendResponse({ status: "ERROR", message: "Internal Vault Error" });
      });
    return true; // Keep the message channel open for async response
  }
});

async function handleAutofillRequest(payload) {
  if (!sessionMasterPassword) {
    console.log("Vault is locked, cannot autofill.");
    return { 
      status: "VAULT_LOCKED", 
      message: "Unlock me in the popup first!" 
    };
  }

  console.log(`Vault is unlocked. Searching for: ${payload.hostname}`);
  

  const decryptedRecord = await StorageService.getRecords(payload.hostname, sessionMasterPassword);
  
  if (decryptedRecord) {
    return { 
      status: "SUCCESS", 
      credentials: {
        username: decryptedRecord.username,
        password: decryptedRecord.password
      }
    };
  } else {
    return {
      status: "NO_MATCH",
      message: "No credentials saved for this site."
    };
  }
}




// --- 2. STORAGE LAYER ---
const StorageService = {
  async saveRecord(hostname, username, password, masterKey) {
    const record = new Record(hostname, username, password);
    const data = await chrome.storage.local.get(['vault']);
    
    // Initialize vault if it doesn't exist
    const vault = (data.vault && data.vault.records) ? data.vault : new Vault();
    
    // Encrypt the payload
    const encryptedData = await CryptoService.encryptData(record, masterKey);
    
    // Save to storage
    vault.records.push({ hostname: hostname, data: encryptedData });
    await chrome.storage.local.set({ vault });
  },
  
  async getRecords(hostname, masterKey) {
    const data = await chrome.storage.local.get(['vault']);
    const record = data.vault ? data.vault.records.find(r => r.hostname === hostname) : null;
    
    if (record) {
      return await CryptoService.decryptData(record.data, masterKey);
    }
    return null; 
  }
};

class Record {
  constructor(hostname, username, password) {
    this.hostname = hostname; 
    this.username = username;
    this.password = password;
    this.createdAt = Date.now();
  }
}

class Vault {
  constructor() {
    this.salt = null;
    this.masterKeyVerifier = null;
    this.records = [];
    this.lastUpdated = Date.now();
  }
}

// --- 3. CRYPTO LAYER ---
const CryptoService = {
  async deriveKey(masterPassword, saltUint8Array) {
    const encoder = new TextEncoder();
    const basekey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(masterPassword),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    return await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: saltUint8Array,
        iterations: 100000,
        hash: "SHA-256"
      },
      basekey,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  },

  async encryptData(data, masterPassword) { 
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await this.deriveKey(masterPassword, salt);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(JSON.stringify(data));

    const encryptedData = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encodedData
    );

    return {
      salt: Array.from(salt),
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encryptedData))
    };
  },

  async decryptData(encryptedObject, masterPassword) {
    const { salt, iv, data } = encryptedObject;
    const key = await this.deriveKey(masterPassword, new Uint8Array(salt));
    
    const decryptedData = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(iv) },
      key,
      new Uint8Array(data)
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decryptedData));
  }
};

// --- 4. AUTHENTICATION HELPERS ---

async function verifyMasterPassword(masterPassword, saltArray, verifierHex) {
  const salt = new Uint8Array(saltArray);
  const derivedKey = await CryptoService.deriveKey(masterPassword, salt);
  
  const exportedKey = await crypto.subtle.exportKey("raw", derivedKey);
  const keyBytes = new Uint8Array(exportedKey);
  
  const verifierBytes = hexToUint8Array(verifierHex);
  return safeCompare(keyBytes, verifierBytes);
}

function safeCompare(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i]; 
  }
  return result === 0; 
}

function hexToUint8Array(hex) {
  return new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}