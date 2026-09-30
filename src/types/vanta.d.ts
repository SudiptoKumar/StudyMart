declare module "vanta/dist/vanta.birds.min" {
  const BIRDS: (opts: Record<string, unknown>) => { destroy: () => void };
  export default BIRDS;
}

declare module "vanta/dist/vanta.clouds.min" {
  const CLOUDS: (opts: Record<string, unknown>) => { destroy: () => void };
  export default CLOUDS;
}
