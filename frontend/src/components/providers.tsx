"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";

export function Providers({ children, clientId }: { children: React.ReactNode; clientId: string }) {
  return (
    <GoogleOAuthProvider clientId={clientId}>
      {children}
    </GoogleOAuthProvider>
  );
}
