import { Actor, ActorLifetime } from '@hology/core/gameplay'
import { BasePlayerState } from '@hology/core/gameplay/actors'
import { Replicated } from '@hology/core/gameplay/net'

@Actor({ lifetime: ActorLifetime.game, replicate: true })
export class PlayerState extends BasePlayerState {
  @Replicated()
  score = 0

  @Replicated()
  deaths = 0
}
