import * as react from "react";

export function Counter() {
  const [count, setCount] = react.useState(0);

  const inc = () => setCount((c) => c + 1);
  const dec = () => setCount((c) => c - 1);

  return (
    <>
      <span>{count}</span>
      <button onClick={inc}>+</button>
      <button onClick={dec}>-</button>
    </>
  );
}
