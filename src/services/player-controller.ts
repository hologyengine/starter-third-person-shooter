import { inject, Service } from "@hology/core/gameplay"
import {
  InputService,
  Keybind,
  Mousebind,
  Wheelbind
} from "@hology/core/gameplay/input"
import CharacterActor from "../actors/character-actor"

enum InputAction {
  moveForward,
  moveBackward,
  moveLeft,
  moveRight,
  jump,
  sprint,
  crouch,
  rotate,
  rotateCamera,
  zoomCamera,
  shoot,
}

@Service()
class PlayerController {
  private inputService = inject(InputService)
  private character: CharacterActor

  public start() {
    this.inputService.setKeybind(InputAction.jump, new Keybind(" "))
    this.inputService.setKeybind(InputAction.sprint, new Keybind("Shift"))
    this.inputService.setKeybind(InputAction.moveForward, new Keybind("w"))
    this.inputService.setKeybind(InputAction.moveBackward, new Keybind("s"))
    this.inputService.setKeybind(InputAction.moveLeft, new Keybind("a"))
    this.inputService.setKeybind(InputAction.moveRight, new Keybind("d"))
    this.inputService.setMousebind(
      InputAction.rotate,
      new Mousebind(0.01, true, "x")
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
  }

  public setup(character: CharacterActor) {
    this.character = character
    this.bindCharacterInput()
  }

  private bindCharacterInput() {
    const playerMove = this.character.movement.directionInput
    const playerJump = this.character.movement.jumpInput
    const playerSprint = this.character.movement.sprintInput

    this.inputService.bindToggle(InputAction.jump, playerJump.toggle)
    this.inputService.bindToggle(InputAction.sprint, playerSprint.toggle)
    this.inputService.bindToggle(InputAction.moveForward, playerMove.togglePositiveY)
    this.inputService.bindToggle(InputAction.moveBackward, playerMove.toggleNegativeY)
    this.inputService.bindToggle(InputAction.moveLeft, playerMove.toggleNegativeX)
    this.inputService.bindToggle(InputAction.moveRight, playerMove.togglePositiveX)
    this.inputService.bindDelta(
      InputAction.rotate,
      this.character.movement.rotationInput.rotateY
    )
    this.inputService.bindDelta(
      InputAction.rotateCamera,
      this.character.thirdPersonCamera.rotationInput.rotateX
    )
    this.inputService.bindDelta(
      InputAction.zoomCamera,
      this.character.thirdPersonCamera.zoomInput.increment
    )
    this.inputService.bindToggle(InputAction.shoot, this.character.shootAction.toggle)

  }
}

export default PlayerController
