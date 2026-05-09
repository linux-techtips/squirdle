import { PokemonInput } from "@/client/components";
import { Router, Auth } from "@/client";

import * as React from "react";

import authBg from "../assets/patternpokeball.png";

export default function SignUp() {
  const router = Router.use();
  const auth = Auth.use();

  const submit = async (_error: string, body: FormData) => {
    const resp = await auth.signUp(body);
    if (resp.ok) {
      router.navigate("/");
      return "";
    }

    if (resp.status === 409) return "user with provided username already exists.";

    return "something went wrong";
  };

  const [error, action, pending] = React.useActionState(submit, "");

  return (
  <main className="auth-page">
    <img
      src={authBg}
      alt=""
      className="auth-bg-image"
    />
    <form action={action} className="auth-card">
      <h1 className="title">Sign Up</h1>

      <label>
        Username
        <input type="text" name="username" required />
      </label>

      <label>
        Password
        <input type="password" name="password" required />
      </label>

      <PokemonInput
        label="Favorite Pokemon"
        name="favorite_pokemon_id"
      />

      {error ? <small>{error}</small> : null}

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
      >
        Sign Up
      </button>

      <a href="/signin" className="auth-link">
        Sign In instead
      </a>
    </form>
  </main>
);
}
