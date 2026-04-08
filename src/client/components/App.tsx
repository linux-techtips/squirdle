import Sprite from "./Sprite";
import pokedex from "@/pokedex.json";

export default function App() {
  return <Sprite id={0} title={pokedex[0]!.name} />;
}
