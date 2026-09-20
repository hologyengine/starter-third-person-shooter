import { Actor, ActorLifetime, BaseActor, inject } from "@hology/core/gameplay";
import { BasePlayerController } from "@hology/core/gameplay/actors";
import { InputService, Keybind, Mousebind, Wheelbind } from "@hology/core/gameplay/input";
import CharacterActor from "./character-actor";



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
  toggleCamera,
}

@Actor({ lifetime: ActorLifetime.game, replicate: true, relevancy: {ownerOnly: true} })
export class PlayerController extends BasePlayerController {
  private inputService = inject(InputService)
  private inputConfigured = false

  get character(): CharacterActor | undefined {
    return this.pawn instanceof CharacterActor ? this.pawn : undefined
  }


  onInit(): void | Promise<void> {
    console.log(`PlayerController onInit. Net id: ${this.__netid}`)
  }

  onBeginPlay() {
    console.log(`PlayerController onBeginPlay`)
  }

  onEndPlay() {

  }

  protected override onPossess(pawn: BaseActor): void {
    console.log('PlayerController possessed pawn', pawn)
  }

  protected override onLocalPossess(pawn: BaseActor): void {
    if (!(pawn instanceof CharacterActor)) return
    pawn.setCameraMode('third')
    this.setupLocally()
  }

  setupLocally() {
    if (this.inputConfigured) return
    this.inputConfigured = true
    this.inputService.setKeybind(InputAction.jump, new Keybind(" "))
    this.inputService.setKeybind(InputAction.sprint, new Keybind("Shift"))
    this.inputService.setKeybind(InputAction.crouch, new Keybind("c"))
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
    
    this.inputService.bindToggle(InputAction.jump, active => this.character?.movement.jumpInput.toggle(active))
    this.inputService.bindToggle(InputAction.sprint, active => this.character?.movement.sprintInput.toggle(active))
    this.inputService.bindToggle(InputAction.crouch, active => this.character?.movement.crouchInput.toggle(active))
    this.inputService.bindToggle(InputAction.moveForward, active => this.character?.movement.directionInput.togglePositiveY(active))
    this.inputService.bindToggle(InputAction.moveBackward, active => this.character?.movement.directionInput.toggleNegativeY(active))
    this.inputService.bindToggle(InputAction.moveLeft, active => this.character?.movement.directionInput.toggleNegativeX(active))
    this.inputService.bindToggle(InputAction.moveRight, active => this.character?.movement.directionInput.togglePositiveX(active))
    this.inputService.bindDelta(
      InputAction.rotate,
      delta => this.character?.movement.rotationInput.rotateY(delta)
    )
    this.inputService.bindDelta(
      InputAction.rotateCamera,
      delta => this.character?.rotateActiveCameraPitch(delta)
    )
    this.inputService.bindDelta(
      InputAction.zoomCamera,
      delta => this.character?.zoomActiveCamera(delta)
    )
    this.inputService.bindToggle(InputAction.shoot, active => this.character?.shootAction.toggle(active))
    this.inputService.bindToggle(InputAction.toggleCamera, active => this.character?.toggleCameraAction.toggle(active))

    this.inputService.start()
  }

}
