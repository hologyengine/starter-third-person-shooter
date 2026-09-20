import { Actor, ActorLifetime } from '@hology/core/gameplay'
import { BaseGameState } from '@hology/core/gameplay/actors'

@Actor({ lifetime: ActorLifetime.game, replicate: true })
export class GameState extends BaseGameState {}
