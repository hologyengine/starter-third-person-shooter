import {
  ActorComponent,
  ActorFactory,
  Component,
  inject,
  PhysicsSystem,
  World
} from "@hology/core/gameplay"
import {
  Camera,
  Raycaster,
  Vector2,
  Vector3
} from "three"
import BallActor from "./ball-actor"
import { Replicated, RunOnAll, RunOnServer } from "@hology/core/gameplay/net"

const raycaster = new Raycaster()
const screenCenter = new Vector2()

// Reuse objects rather than creating new instances every time they are needed.
// This is a good practice to reduce the need for garbage colleciton, making the game perform better.
const ballForceVec = new Vector3()
const ballOriginVec = new Vector3()
const ballDirectionVec = new Vector3()

@Component()
class ShootingComponent extends ActorComponent {
  private physics = inject(PhysicsSystem)
  public camera: Camera
  private world = inject(World)
  private actorFactory = inject(ActorFactory)
  private shootingStrength = 7
  public muzzlePosition: Vector3

  @Replicated()
  public ammo = 10

  public trigger() {
    if (this.camera == null) {
      console.warn("Camera not set on shooting component")
      return
    }
    raycaster.setFromCamera(screenCenter, this.camera)
    raycaster.ray.origin

    // If no muzzle position is set, spawn the baall at the center of the screen
    const ballFrom = this.muzzlePosition ?? raycaster.ray.origin
    this.serverSpawnBall(ballFrom, raycaster.ray.direction.normalize())
  }

  public triggerFromRay(origin: Vector3, direction: Vector3) {
    this.spawnBall(origin, direction)
  }

  @RunOnServer()
  private async serverSpawnBall(start: Vector3, direction: Vector3) {
    if (this.ammo <= 0) return
    this.ammo--
    this.spawnBall(start, direction)
  }

  @RunOnAll()
  private async spawnBall(start: Vector3, direction: Vector3) {
    ballDirectionVec.copy(direction).normalize()
    ballOriginVec.addVectors(start, ballDirectionVec)
    const ball = await this.actorFactory.create(BallActor)
    this.world.addActor(ball, ballOriginVec)
  
    ball.moveTo(ballOriginVec)
    ballForceVec.copy(ballDirectionVec).multiplyScalar(this.shootingStrength)
    this.physics.applyImpulse(
      ball,
      ballForceVec
    )
  }

}


export default ShootingComponent
