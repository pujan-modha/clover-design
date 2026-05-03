export default {
  providers: [
    {
      type: "customJwt" as const,
      applicationID: "designforge",
      issuer: "http://localhost:3000",
      jwks: "http://localhost:3000/api/auth/jwks",
      algorithm: "RS256",
    },
  ],
};
