export interface WorldSize {
  width: number;
  height: number;
}

export interface RectBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MapPoint {
  x: number;
  y: number;
}

export interface MapImageConfig {
  src: string;
  width: number;
  height: number;
}

export interface PlayerConfig {
  radius: number;
  speed: number;
}

export interface RectObstacle {
  kind: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CircleObstacle {
  kind: "circle";
  x: number;
  y: number;
  radius: number;
}

export type CollisionObstacle = RectObstacle | CircleObstacle;

export interface VenueMapConfig {
  image: MapImageConfig;
  world: WorldSize;
  playableBounds: RectBounds;
  player: PlayerConfig;
  spawn: MapPoint;
  obstacles: CollisionObstacle[];
}
