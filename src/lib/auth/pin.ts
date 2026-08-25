import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

// Same bcrypt approach as password.ts, kept as its own module because a
// transaction PIN is a distinct credential (6 digits, used to confirm a
// transaction, not to log in) with its own lifecycle in
// user_transaction_pins — see M02 planning doc, Architecture Decision #3.
export function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, SALT_ROUNDS);
}

export function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}
