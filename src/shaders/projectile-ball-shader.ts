
import { NodeShader, NodeShaderOutput, Parameter } from "@hology/core/shader/shader";
import { float, fragmentLinearEyeDepth, fresnelEffect, linearEyeDepth, log, max, oneMinus, particleUniforms, pow, rgb, rgba, standardMaterial, step, varyingFloat } from "@hology/core/shader-nodes";
import { Color } from 'three';

export default class ProjectileBallShader extends NodeShader {
  @Parameter()
  color: Color = new Color(0x000000)

  output(): NodeShaderOutput {

    const fresnel = max((float(0.7), varyingFloat(fresnelEffect(.5))), float(.1))

    const depth = linearEyeDepth.subtract(fragmentLinearEyeDepth).divide(log(linearEyeDepth))
    const edge = pow(depth, float(1))
    const alpha = edge
    
    return {
      //color: standardMaterial({color: rgb(this.color)})
      color: rgba(rgb(this.color).multiplyScalar(fresnel), fresnel.multiply(alpha)),
      //color: rgba(rgb(this.color).multiplyScalar(alpha), 1),
      transparent: true
    }
  } 

}
