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
  Euler,
  Quaternion,
  Raycaster,
  Vector2,
  Vector3
} from "three"
import BallActor from "./ball-actor"

const raycaster = new Raycaster()
const screenCenter = new Vector2()

// Reuse objects rather than creating new instances every time they are needed.
// This is a good practice to reduce the need for garbage colleciton, making the game perform better.
const ballForceVec = new Vector3()
const ballOriginVec = new Vector3()

@Component()
class ShootingComponent extends ActorComponent {
  private physics = inject(PhysicsSystem)
  public camera: Camera
  private world = inject(World)
  private actorFactory = inject(ActorFactory)
  private shootingStrength = 5
  public muzzlePosition: Vector3

  public trigger() {
    if (this.camera == null) {
      console.warn("Camera not set on shooting component")
      return
    }
    raycaster.setFromCamera(screenCenter, this.camera)
    raycaster.ray.origin

    // If no muzzle position is set, spawn the baall at the center of the screen
    const ballFrom = this.muzzlePosition ?? raycaster.ray.origin
    this.spawnBall(ballFrom, raycaster.ray.direction.normalize())
  }

  private async spawnBall(start: Vector3, direction: Vector3) {
    ballOriginVec.addVectors(start, direction.clone().normalize())
    const ball = await this.actorFactory.create(BallActor)
/*
// I Don't think I should be using the rotation of the projectile
// to determine the direction of particles. 

Velocity is currently independent of the direction of the emitter
Maybe should be relative to the direction of the 


    const quaternion = new Quaternion();
    const up = new Vector3(0, 1, 0); // Default 'up' direction (Y axis)
    quaternion.setFromUnitVectors(up, direction);

    const euler = new Euler();
    euler.setFromQuaternion(quaternion);
    */

    this.world.addActor(ball, ballOriginVec)
  
    ball.moveTo(ballOriginVec)
    ballForceVec.copy(direction).multiplyScalar(this.shootingStrength)
    this.physics.applyImpulse(
      ball,
      ballForceVec
    )
  }

}


export default ShootingComponent
