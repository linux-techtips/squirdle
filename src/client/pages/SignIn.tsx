import { Router, Auth } from "@/client";

import * as React from "react";

export default function SignIn() {
  const router = Router.use();
  const auth = Auth.use();

  const submit = async (_error: string, body: FormData) => {
    const resp = await auth.signIn(body);
    if (resp.ok) {
      router.navigate("/");
      return "";
    }

    if (resp.status === 401) return "unable to sign in";

    return "something went wrong";
  };

  const [error, action, pending] = React.useActionState(submit, "");

  return (
    <>
      <form action={action}>
        <label>Username <input type="text" name="username" required /></label>
        <label>Password <input type="password" name="password" required /></label>
        {error ? <small>{error}</small> : null}
        <button type="submit" disabled={pending} aria-busy={pending}>Sign In</button>
      </form>
      <a href="/signup">Sign Up instead</a>
    </>
  );
}
