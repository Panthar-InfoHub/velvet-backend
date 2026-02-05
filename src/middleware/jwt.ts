import jwt from "jsonwebtoken";
import { User } from "../prisma/generated/prisma/client.js";
import { env } from "../lib/config-env.js";

export const generate_JWT = (user: User): string => {
  const payload = {
    id: user.id,
    phone_no: user.phone_no,
    usr: user.usr,
    inv_id: user.inv_id,
    pwd: user.pwd
  };

  const token = jwt.sign(payload, env.JWT_SECRET!, {
    expiresIn: "7d",
  });

  return token;
};

export const verify_JWT = (token: string): any => {
  try {
    return jwt.verify(token, env.JWT_SECRET!);
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
};