export type RawInput = {
  held: Set<Action> // currently down this frame
  pressed: Set<Action> // just went down
  released: Set<Action> // just went up
}

export type Action = 'up' | 'down' | 'left' | 'right' | 'dig' | 'fill'

export type Renderer = {
  render(state: WorldState): void
}

export type Context = {
  state: WorldState
  inputHandler: InputHandler
  renderer: Renderer
}

export type Level = {
  width: number
  height: number
  surfaces: SurfaceSpawn[]
  entities: EntitySpawn[]
}

export type SurfaceSpawn = CellSurface & { pos: TilePos }

export type EntitySpawn = {
  kind: EntityKind
  pos: TilePos
}

export type Game = {
  update(): void
  render(alpha: number): void
}

export type InputHandler = {
  poll(): RawInput
}

export type WorldState = {
  grid: Cell[][]
  entities: Map<EntityId, Entity>
  playerId: EntityId
}

export type Cell = {
  surface: CellSurface
  occupants: Set<EntityId>
  pos: TilePos
}

export type DigState =
  | { kind: 'intact' }
  | { kind: 'digging'; progress: number } // 0..1
  | { kind: 'open' } // fully dug
  | { kind: 'filling'; progress: number } // 0..1
  | { kind: 'closing'; progress: number } // natural decay back to intact

export type ShieldState =
  | { kind: 'open'; progress: number }
  | { kind: 'closed'; progress: number }

export type CellSurface =
  | { kind: 'shield'; shield: ShieldState }
  | { kind: 'floor'; dig: DigState }
  | { kind: 'obstacle'; obstacle: ObstacleKind }

export type Entity = {
  id: EntityId
  kind: EntityKind

  tilePos: TilePos
  facing: Direction

  state: EntityState

  intent: Intent
}

export type EntityId = string

export type ObstacleKind = 'tree' | 'none'

export type EntityKind = 'player' | 'alien'

export type Direction = 'left' | 'right' | 'up' | 'down'

export type EntityState =
  | { kind: 'idle' }
  | { kind: 'walking'; dir: Direction; progress: number } // 0..1 between tiles
// | { kind: 'digging'; dir: Direction; progress: number }
// | { kind: 'filling'; progress: number }
// | { kind: 'falling'; progress: number }
// | { kind: 'trapped' }
// | { kind: 'dead' }

export type Intent = { kind: 'idle' } | { kind: 'move'; dir: Direction }
// | { kind: 'dig'; dir: Direction }
// | { kind: 'fill' }

export type GameEvent = {
  kind: 'entity_moved'
  entityId: EntityId
  from: TilePos
  to: TilePos
  dir: Direction
}
// | { kind: 'player_died'; entityId: EntityId; cause: DeathCause }
// | { kind: 'player_respawned'; entityId: EntityId; at: TilePos }

// export type DeathCause = 'caught_by_alien' | 'buried_alive'

export type TilePos = { x: number; y: number }
