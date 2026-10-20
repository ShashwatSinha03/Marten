import { jwtVerify, type JWTVerifyGetKey } from "jose";

export function createAuthenticator(key: JWTVerifyGetKey, issuer: string, audience: string) {
  return async (token: string): Promise<string | null> => {
    if (!token || token.length > 16384) return null;
    try {
      const { payload } = await jwtVerify(token, key, {
        issuer, audience, algorithms: ["EdDSA"], requiredClaims: ["sub", "exp", "iss", "aud"],
      });
      return typeof payload.sub === "string" && payload.sub.length > 0 ? payload.sub : null;
    } catch { return null; }
  };
}
