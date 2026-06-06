


import { Actor, BaseActor, inject, ViewController } from "@hology/core/gameplay";
import { InputService, Keybind, Mousebind } from "@hology/core/gameplay/input";
import { NetActorRole, NetService, RunIfServer, RunOnClient } from "@hology/core/gameplay/net";
import CharacterActor from "./character-actor";
import { BasePlayerController } from "@hology/core/gameplay/actors";
import {Wheelbind} from '@hology/core/gameplay/input';



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

@Actor({replicate: true, relevancy: {ownerOnly: true}})
export class PlayerController extends BasePlayerController {
  public character?: CharacterActor


  private inputService = inject(InputService)
  private net = inject(NetService)
  private view = inject(ViewController)


  onInit(): void | Promise<void> {
    console.log(`PlayerController onInit. Net id: ${this.__netid}`)
  }

  onBeginPlay() {
    console.log(`PlayerController onBeginPlay`)
  }

  onEndPlay() {

  }

  setup(character: CharacterActor) {
    // This should only be called on the server
    character.owner = this
    console.log('setup on server')

    this.character = character
    this.clientSetup(character)
  }

  @RunOnClient()
  private clientSetup(character: CharacterActor) {
    // thsi could also be done with property replication
    // then use onRep_character to call an onPosess function
    // on server, call onPosses when calling setup directly. 
    // setup is only called on server

    this.character = character
    console.log("Client setup ", character)
    console.log("Locally controlled: ", this.isLocallyControlled)

    /*
    If we are a listen server, we should also call this
    */
    if (this.isLocallyControlled) {
      this.character?.setCameraMode('third')

      this.setupLocally()
      // we ca not setup input here because we need the actor.
    } else {
      console.log(`Client is not locally controlled yet `)
    }
  }

  setupLocally() {
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
      delta => this.character.rotateActiveCameraPitch(delta)
    )
    this.inputService.bindDelta(
      InputAction.zoomCamera,
      delta => this.character.zoomActiveCamera(delta)
    )
    this.inputService.bindToggle(InputAction.shoot, this.character.shootAction.toggle)
    this.inputService.bindToggle(InputAction.toggleCamera, this.character.toggleCameraAction.toggle)

    this.inputService.start()
  }

}
