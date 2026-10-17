import bcrypt from 'bcryptjs';
import { env } from '@config/env';

export const hashPassword = (plain: string): Promise<string> => bcrypt.hash(plain, env.bcryptRounds);

export const verifyPassword = (plain: string, hash: string): Promise<boolean> => bcrypt.compare(plain, hash);

/**
 * Compared against when the email doesn't exist, so "no such user" and "wrong password"
 * take the same time and an attacker can't discover which emails are registered.
 */
let dummyHash: Promise<string> | undefined;
export const burnPasswordCheck = async (plain: string): Promise<void> => {
  dummyHash ??= hashPassword('not-a-real-password');
  await bcrypt.compare(plain, await dummyHash);
};
