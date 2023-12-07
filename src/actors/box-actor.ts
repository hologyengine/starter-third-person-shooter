import { BoxCollisionShape, PhysicalShapeMesh } from "@hology/core"
import { Actor, BaseActor, PhysicsBodyType } from "@hology/core/gameplay"
import { MeshComponent } from "@hology/core/gameplay/actors"
import { Parameter } from "@hology/core/shader/parameter"
import { Color, MeshStandardMaterial, Vector3 } from "three"
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry"

@Actor()
class BoxActor extends BaseActor {
  @Parameter()
  private color: Color = new Color(0x0000ff)

  private mesh = this.attach(MeshComponent<PhysicalShapeMesh>, {
    object: new PhysicalShapeMesh(
      new RoundedBoxGeometry(1, 1, 1, 4, 0.05),
      new MeshStandardMaterial({ color: this.color }),
      new BoxCollisionShape(new Vector3(1, 1, 1)).withOffset(
        new Vector3(0, 0.5, 0)
      )
    ),
    mass: 10,
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
}

export default BoxActor
