
import { DataAssetDefinition, Parameter } from "@hology/core/gameplay";

@DataAssetDefinition("item")
class ItemDefinition {
  @Parameter({type: String})
  displayName = ""
}

export default ItemDefinition
