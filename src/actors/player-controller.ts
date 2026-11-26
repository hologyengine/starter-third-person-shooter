import { Actor, ActorLifetime, BaseActor, inject } from "@hology/core/gameplay"
import { BasePlayerController } from "@hology/core/gameplay/actors"
import { InputService, Keybind, Mousebind, Wheelbind } from "@hology/core/gameplay/input"
import CharacterActor from "./character-actor"

const InputAction = {
  moveForward: 'shooter.moveForward',
  moveBackward: 'shooter.moveBackward',
  moveLeft: 'shooter.moveLeft',
  moveRight: 'shooter.moveRight',
  jump: 'shooter.jump',
  sprint: 'shooter.sprint',
  rotate: 'shooter.rotate',
  rotateCamera: 'shooter.rotateCamera',
  zoomCamera: 'shooter.zoomCamera',
  shoot: 'shooter.shoot',
  toggleCamera: 'shooter.toggleCamera',
}

@Actor({ lifetime: ActorLifetime.game, replicate: true, relevancy: { ownerOnly: true }, spatial: false, placeable: false })
export class PlayerController extends BasePlayerController {
  private readonly inputService = inject(InputService)
  private character?: CharacterActor

  protected override onLocalPossess(pawn: BaseActor) {
    if (!(pawn instanceof CharacterActor)) return
    this.character = pawn
    pawn.setCameraMode('third')
    this.bindInput(pawn)
    this.inputService.start()
  }

  protected override onLocalUnpossess() {
    this.releaseInput()
  }

  override onEndPlay() {
    this.releaseInput()
  }

  private releaseInput() {
    if (this.character == null) return
    this.character.releaseCamera()
    this.character = undefined
    this.inputService.stop()
    for (const action of Object.values(InputAction)) {
      this.inputService.unbind(action)
      this.inputService.removeKeybind(action)
      this.inputService.removeMousebind(action)
      this.inputService.removeWheelbind(action)
    }
  }

  private bindInput(character: CharacterActor) {
    this.inputService.setKeybind(InputAction.jump, new Keybind(" "))
    this.inputService.setKeybind(InputAction.sprint, new Keybind("Shift"))
    this.inputService.setKeybind(InputAction.moveForward, new Keybind("w"))
    this.inputService.setKeybind(InputAction.moveBackward, new Keybind("s"))
    this.inputService.setKeybind(InputAction.moveLeft, new Keybind("a"))
    this.inputService.setKeybind(InputAction.moveRight, new Keybind("d"))
    this.inputService.setMousebind(
      InputAction.rotate,
      new Mousebind(0.003, true, "x")
    )
    this.inputService.setMousebind(
      InputAction.rotateCamera,
      new Mousebind(0.003, false, "y")
    )
    this.inputService.setWheelbind(
      InputAction.zoomCamera,
      new Wheelbind(0.0003, false)
    )
    this.inputService.setKeybind(InputAction.shoot, new Keybind('MouseLeft'))
    this.inputService.setKeybind(InputAction.toggleCamera, new Keybind('v'))
    const playerMove = character.movement.directionInput
    const playerJump = character.movement.jumpInput
    const playerSprint = character.movement.sprintInput

    this.inputService.bindToggle(InputAction.jump, playerJump.toggle)
    this.inputService.bindToggle(InputAction.sprint, playerSprint.toggle)
    this.inputService.bindToggle(InputAction.moveForward, playerMove.togglePositiveY)
    this.inputService.bindToggle(InputAction.moveBackward, playerMove.toggleNegativeY)
    this.inputService.bindToggle(InputAction.moveLeft, playerMove.toggleNegativeX)
    this.inputService.bindToggle(InputAction.moveRight, playerMove.togglePositiveX)
    this.inputService.bindDelta(
      InputAction.rotate,
      delta => character.movement.rotationInput.rotateY(delta)
    )
    this.inputService.bindDelta(
      InputAction.rotateCamera,
      delta => character.rotateActiveCameraPitch(delta)
    )
    this.inputService.bindDelta(
      InputAction.zoomCamera,
      delta => character.zoomActiveCamera(delta)
    )
    this.inputService.bindToggle(InputAction.shoot, character.shootAction.toggle)
    this.inputService.bindToggle(InputAction.toggleCamera, character.toggleCameraAction.toggle)
  }
}
