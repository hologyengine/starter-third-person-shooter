import {
  Actor,
  BaseActor,
  PhysicsBodyType,
  PhysicsSystem,
  attach,
  inject
} from "@hology/core/gameplay"
import { ShapeMeshComponent, createShapeGeometry } from "@hology/core/gameplay/actors"
import { Parameter } from "@hology/core/shader/parameter"
import { MeshStandardMaterial, Vector3 } from "three"

const ballMaterial = new MeshStandardMaterial({ color: 0xeff542, roughness: 0.3 })

@Actor()
class BallActor extends BaseActor {
  private physicsSystem = inject(PhysicsSystem)

  private mesh = attach(ShapeMeshComponent, {
    geometry: createShapeGeometry("sphere", {
      radius: 0.3,
      withSegments: 20,
      heightSegments: 10,
    }),
    materialInstance: ballMaterial,
    bodyType: PhysicsBodyType.dynamic,
    mass: 1,
    friction: 0.1,
    restitution: 1,
    continuousCollisionDetection: true,
  })

  moveTo(position: Vector3) {
    this.object.position.copy(position)
    this.physicsSystem.updateActorTransform(this)
  }
}

export default BallActor
