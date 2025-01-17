import Source from './Source'
import WMSLayer from './layer/tile/WMSLayer'

export default class WMSSource extends Source {
  async retrieveLayers () {
    this.wmsLayers = []
    for (const layer of this.layers) {
      this.wmsLayers.push(new WMSLayer({filePath: this.filePath, sourceLayerName: layer.name, extent: layer.extent, credentials: this.credentials}))
    }
    return this.wmsLayers
  }
}
