import { BoxCollisionShape, PhysicalShapeMesh } from "@hology/core"
import { Actor, BaseActor, inject, PhysicsBodyType, PhysicsSystem } from "@hology/core/gameplay"
import { MeshComponent } from "@hology/core/gameplay/actors"
import { NetRole, RunOnAll } from "@hology/core/gameplay/net"
import { Parameter } from "@hology/core/shader/parameter"
import { Color, Euler, MeshStandardMaterial, Quaternion, Vector3 } from "three"
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
    if (this.netRole === NetRole.authority) {
      if (this.hasSyncedUpdate) {
        if (this.position.equals(this.latestPosition) && this.quaternion.equals(this.latestRotation)) {
          return
        }
      }
      this.clientSyncTransform(this.position, this.quaternion)
    } else if (this.hasSyncedUpdate) {
      this.position.lerp(this.latestPosition, 0.2)
      this.quaternion.slerp(this.latestRotation, 0.2)
      this.physics.updateActorTransform(this)
    }
  }

  clientSyncTransform(position: Vector3, quaternion: Quaternion) {
    const payload = new Uint8Array(6 * 4);
    const view = new DataView(payload.buffer);
    view.setFloat32(0, position.x)
    view.setFloat32(4, position.y)
    view.setFloat32(8, position.z)

    tmpEuler.setFromQuaternion(quaternion)
    view.setFloat32(12, tmpEuler.x)
    view.setFloat32(16, tmpEuler.y)
    view.setFloat32(20, tmpEuler.z)

    this.clientSyncTransformPacked(payload)
  }

  // wish there was a 
  @RunOnAll(false)
  clientSyncTransformPacked(payload: Uint8Array) {

    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    this.latestPosition.set(
      view.getFloat32(0),
      view.getFloat32(4),
      view.getFloat32(8)
    )

    tmpEuler.set(
      view.getFloat32(12),
      view.getFloat32(16),
      view.getFloat32(20)
    )
    this.latestRotation.setFromEuler(tmpEuler)

    // this.latestPosition.copy(position)
    // this.latestRotation.copy(quaternion)
    this.hasSyncedUpdate = true
  }

  private hasSyncedUpdate = false
  private latestPosition = new Vector3()
  private latestRotation = new Quaternion()
}

export default BoxActor


const tmpEuler = new Euler()