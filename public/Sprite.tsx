export function Sprite({ pokemon }: { pokemon: string }) {
  return (
    <img src={`/sprites/${pokemon}.png`} width="96px" height="96px"></img>
  );
}
