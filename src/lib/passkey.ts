/**
 * ZK-PayLink Passkey Helpers
 */

export const registerPasskey = async (username: string) => {
  // WebAuthn registration logic
  console.log("Registering passkey for", username);
};

export const signWithPasskey = async (challenge: string) => {
  // WebAuthn signature logic
  console.log("Signing challenge", challenge);
  return "mock_signature";
};
