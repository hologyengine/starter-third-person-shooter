import { BoxCollisionShape, PhysicalShapeMesh } from "@hology/core"
import { Actor, BaseActor, inject, PhysicsBodyType, PhysicsSystem } from "@hology/core/gameplay"
import { MeshComponent } from "@hology/core/gameplay/actors"
import { NetActorRole, RunOnAll } from "@hology/core/gameplay/net"
import { Parameter } from "@hology/core/shader/parameter"
import { Color, MeshStandardMaterial, Quaternion, Vector3 } from "three"
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry"

@Actor({replicate: true})
class BoxActor extends BaseActor {
  @Parameter()
  private color: Color = new Color(0x0000ff)

  private physics = inject(PhysicsSystem)

  private mesh = this.attach(MeshComponent<PhysicalShapeMesh>, {
    object: new PhysicalShapeMesh(
      new RoundedBoxGeometry(1, 1, 1, 4, 0.05),
      new MeshStandardMaterial({ color: this.color }),
      new BoxCollisionShape(new Vector3(1, 1, 1)).withOffset(
        new Vector3(0, 0.5, 0)
      )
    ),
    mass: 10,
    restitution: 0.01,
    bodyType: PhysicsBodyType.dynamic,
  })

  onInit(): void | Promise<void> {
    const material = this.mesh.object.material as MeshStandardMaterial
    if (this.color != null) {
      material.color.copy(this.color)
    }
    this.mesh.object.castShadow = true
    this.mesh.object.receiveShadow = true
    this.mesh.object.geometry.translate(0, 0.5, 0)
  }

  onLateUpdate(deltaTime: number): void {
    if (this.netRole === NetActorRole.authority) {
      this.clientSyncTransform(this.position, this.quaternion)
    } else if (this.hasSyncedUpdate) {
      this.position.lerp(this.latestPosition, 0.2)
      this.quaternion.slerp(this.latestRotation, 0.2)
      this.physics.updateActorTransform(this)
    }
  }

  // wish there was a 
  @RunOnAll(false)
  clientSyncTransform(position: Vector3, quaternion: Quaternion) {
    this.latestPosition.copy(position)
    this.latestRotation.copy(quaternion)
    this.hasSyncedUpdate = true
  }

  private hasSyncedUpdate = false
  private latestPosition = new Vector3()
  private latestRotation = new Quaternion()
}

export default BoxActor
