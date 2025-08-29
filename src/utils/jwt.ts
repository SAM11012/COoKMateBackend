// src/utils/jwt.ts

import jwt from 'jsonwebtoken';

// Define the structure of our token's payload
interface UserPayload {
    id: string;
    email: string;
    name: string | null;
}

const JWT_SECRET = process.env.AUTH_SECRET;
const JWT_EXPIRES_IN = '7d'; // The token will expire in 7 days

if (!JWT_SECRET) {
    throw new Error("Missing JWT_SECRET in .env file");
}

/**
 * Signs a JWT token for a given user payload.
 * @param payload - The user data to include in the token.
 * @returns The signed JWT string.
 */
export const generateApiToken = (payload: UserPayload): string => {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
    });
};

/**
 * Verifies a JWT token.
 * @param token - The JWT string from the Authorization header.
 * @returns The decoded user payload if the token is valid.
 * @throws An error if the token is invalid or expired.
 */
export const verifyApiToken = (token: string): UserPayload => {
    return jwt.verify(token, JWT_SECRET) as UserPayload;
};