import { Service, GameInstance, inject, World } from "@hology/core/gameplay"
import { SpawnPoint } from "@hology/core/gameplay/actors"
import { InputService } from "@hology/core/gameplay/input"
import CharacterActor from "../actors/character-actor"
import PlayerController from "./player-controller"

@Service()
class Game extends GameInstance {
  private world = inject(World)
  private inputService = inject(InputService)
  private playerController = inject(PlayerController)

  async onStart() {
    const spawnPoint = this.world.findActorByType(SpawnPoint)
    const character = await spawnPoint.spawnActor(CharacterActor)
    this.playerController.start()
    this.playerController.setup(character)
    this.inputService.start()

  }
}

export default Game