export default {
  providers: [
    {
      type: "customJwt" as const,
      applicationID: "designforge",
      issuer: process.env.BETTER_AUTH_URL || "http://localhost:3000",
      jwks: `${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/api/auth/jwks`,
      algorithm: "RS256",
    },
  ],
};
