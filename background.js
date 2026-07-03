

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 1. Route the action
  if (message.action === "REQ_AUTOFILL_DATA") {
    
    // 2. Perform the logic (Query storage, check if unlocked, etc)
    handleAutofillRequest(message.payload)
      .then((response) => {
        // 3. Send the result back to the Content Script
        sendResponse(response);
      });

    // IMPORTANT: Returns true to indicate the  sendResponse is called asynchronously
    return true; 
  }
});

async function handleAutofillRequest(payload) {
  const result = await chrome.storage.local.get(['vaultUnlocked']);
  if (result.vaultUnlocked) {
    console.log("Vault is unlocked, proceeding with autofill.");
    // Here you would typically fetch the credentials from storage and return them
    // For demonstration, we return a mock response
    return { 
        status: "SUCCESS", 
        credentials: {
          username: "exampleUser",
          password: "examplePass"
        }
      };
    } else {
      console.log("Vault is locked, cannot autofill.");
      return { 
        status: "VAULT_LOCKED", 
        message: "Unlock me in the popup first!" 
      };
    }
}


const StorageService = {
    async saveRecord(hostname, username, password,masterKey) {
      const record = new Record(hostname, username, password);
      const data = await chrome.storage.local.get(['vault']);
      const vault = data.vault || {records: []};
      const encryptedData = await CryptoService.encryptData(record, masterKey);
      vault.records.push({"hostname": hostname, "data": data});
      await chrome.storage.local.set({vault});
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
    this.username = username;
    this.password = password;
    this.createdAt = Date.now();
  }

}

class Vault{
  constructor(){
    this.records = [];
    this.lastUpdated = Date.now();
  }
}

class CryptoService {
  async deriveKey(masterPassword, salt) {
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
        salt: encoder.encode(salt),
        iterations: 100000,
        hash: "SHA-256"
      },
      basekey,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  }

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
  }

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
}