import { Actor, BaseActor, PhysicsBodyType, attach } from "@hology/core/gameplay"
import { ShapeMeshComponent, createShapeGeometry } from "@hology/core/gameplay/actors"
import { Parameter } from "@hology/core/shader/parameter"
import { Color, MeshStandardMaterial, Vector3 } from "three"

const boxMaterial = new MeshStandardMaterial({ color: 0x0000ff })

@Actor()
class BoxActor extends BaseActor {
  @Parameter()
  private color: Color = new Color(0x0000ff)

  private mesh = attach(ShapeMeshComponent, {
    geometry: createShapeGeometry("roundedBox", {
      width: 1,
      height: 1,
      depth: 1,
      segments: 4,
      radius: 0.05,
    }),
    position: new Vector3(0, 0.5, 0),
    materialInstance: boxMaterial,
    mass: 10,
    friction: 0.1,
    restitution: 0.01,
    bodyType: PhysicsBodyType.dynamic,
    castShadow: true,
    receiveShadow: true,
  })

  onInit(): void | Promise<void> {
    if (this.color != null) {
      this.mesh.setMaterialParameter("color", this.color)
    }
  }
}

export default BoxActor
