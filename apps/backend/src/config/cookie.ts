import ms,{ type StringValue } from "ms";
interface CookieOptionsArgs {
  rememberMe?: boolean;
}

export function generateCookieOptions({ rememberMe = false }: CookieOptionsArgs = {}) {
  const expiry = rememberMe ? process.env.REFRESH_TOKEN_EXPIRY_REMEMBER_ME : process.env.REFRESH_TOKEN_EXPIRY;
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none" as const,
    maxAge: ms(expiry as StringValue),
  };
}