

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
  // Placeholder: This is where the storage lookup logic will be
  console.log("Received request for:", payload.hostname);
  
  // Example response to test the pipe
  return { 
    status: "VAULT_LOCKED", 
    message: "Unlock me in the popup first!" 
  };
}
