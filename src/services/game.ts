import { GameInstance, GameMode, inject, NetworkTravelCoordinator, PlayerLifecycleCoordinator, Service } from "@hology/core/gameplay"
import CharacterActor from "../actors/character-actor"
import { PlayerController } from "../actors/player-controller"
import type { PlayerSession } from "@hology/core/gameplay/net"
import { Euler, Vector3 } from "three"
import { PlayerState } from '../actors/player-state'
import { GameState } from '../actors/game-state'

@Service()
class ShooterGameMode extends GameMode {
  override createGameState() {
    return this.world.spawnActor(GameState)
  }

  override createPlayerState() {
    return this.world.spawnActor(PlayerState)
  }

  override createPlayerController(player: PlayerSession) {
    return player.localPlayerIndex != null
      ? this.world.spawnLocalPlayerController(PlayerController)
      : this.world.spawnActor(PlayerController)
  }

  override spawnDefaultPawn(player: PlayerSession, controller: PlayerController) {
    const position = player.localPlayerIndex != null ? new Vector3(2, 0, 0) : new Vector3(0, 0, 0)
    return this.world.spawnActor(CharacterActor, position, new Euler(), { owner: controller })
  }
}

@Service()
class Game extends GameInstance {
  private readonly playerLifecycle = inject(PlayerLifecycleCoordinator)
  private readonly networkTravel = inject(NetworkTravelCoordinator)
  private readonly gameMode = inject(ShooterGameMode)

  override async onStart() {
    await this.playerLifecycle.start(this.gameMode)
    this.networkTravel.start(this.gameMode)
  }

  override async onUnload() {
    this.networkTravel.stop()
    await this.playerLifecycle.stop()
  }
}

export default Game
