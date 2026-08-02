import { signInSchema, signUpSchema } from "./validation";

describe("signInSchema", () => {
  it("accepts a valid email + password", () => {
    expect(signInSchema.safeParse({ email: "a@b.com", password: "secret" }).success).toBe(true);
  });

  it("rejects a missing email and an invalid email", () => {
    expect(signInSchema.safeParse({ email: "", password: "x" }).success).toBe(false);
    expect(signInSchema.safeParse({ email: "not-an-email", password: "x" }).success).toBe(false);
  });

  it("rejects an empty password", () => {
    expect(signInSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
});

describe("signUpSchema", () => {
  const valid = { email: "a@b.com", password: "longenough", confirmPassword: "longenough" };

  it("accepts a valid signup", () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a short password", () => {
    expect(
      signUpSchema.safeParse({ ...valid, password: "short", confirmPassword: "short" }).success,
    ).toBe(false);
  });

  it("rejects mismatched confirmation", () => {
    expect(
      signUpSchema.safeParse({ ...valid, confirmPassword: "different" }).success,
    ).toBe(false);
  });
});
