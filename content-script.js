

/**
 * Phase 1 & 2: Query and Filter
 * Grabs all inputs and filters out the garbage.
 */
function getValidInputs() {
  const allInputs = document.querySelectorAll('input');
  const ignoredTypes = ['hidden', 'submit', 'button', 'checkbox', 'radio', 'search', 'image', 'file'];
  
  return Array.from(allInputs).filter(input => {
    // Keep it if it's not in the ignored list AND it is actually visible on the screen
    return !ignoredTypes.includes(input.type.toLowerCase()) && isElementVisible(input);
  });
}

/**
 * Helper: Is the element actually visible to the user?
 */
function isElementVisible(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    window.getComputedStyle(element).visibility !== 'hidden' &&
    window.getComputedStyle(element).display !== 'none'
  );
}

/**
 * Phase 3 & 4: Heuristics and Object Construction
 */
function discoverLoginForm() {
  const inputs = getValidInputs();
  let passwordField = null;
  let usernameField = null;

  // Find the anchor: The first visible password field
  for (let i = 0; i < inputs.length; i++) {
    if (inputs[i].type.toLowerCase() === 'password') {
      passwordField = inputs[i];
      
      // Heuristic: The username is usually the valid input immediately preceding the password
      if (i > 0) {
        usernameField = inputs[i - 1];
      }
      break; // We found our target, stop looking
    }
  }

  // If we didn't find a password field, there is no login form here
  if (!passwordField) {
    return null;
  }

  // Phase 4: Construct the payload
  return {
    url: window.location.hostname,
    passwordField: {
      id: passwordField.id,
      name: passwordField.name,
      type: passwordField.type
    },
    usernameField: usernameField ? {
      id: usernameField.id,
      name: usernameField.name,
      type: usernameField.type
    } : null
  };
}

// Execute the discovery
const loginFormDetails = discoverLoginForm();

if (loginFormDetails) {
  console.log("Password Manager: Found a login form!", loginFormDetails);
  // Next Step: Send this object to your Background Service Worker!
} else {
  console.log("Password Manager: No login form found on this page.");
}
