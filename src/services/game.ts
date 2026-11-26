import { GameInstance, GameMode } from "@hology/core/gameplay"
import CharacterActor from "../actors/character-actor"
import { PlayerController } from "../actors/player-controller"

class ShooterGameMode extends GameMode {
  protected override readonly playerControllerClass = PlayerController
  protected override readonly defaultPawnClass = CharacterActor
}

export default class Game extends GameInstance {
  override readonly gameMode = ShooterGameMode
}
