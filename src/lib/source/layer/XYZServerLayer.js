import request from 'request-promise-native'
import Layer from './Layer'
import * as Vendor from '../../vendor'
import superagent from 'superagent'

export default class XYZServerLayer extends Layer {
  _extent
  _style

  async initialize () {
    this._extent = this.extent

    // this.renderOverviewTile()
    return this
  }

  get configuration () {
    return {
      filePath: this.filePath,
      sourceLayerName: this.sourceLayerName,
      name: this.name,
      extent: this.extent,
      id: this.id,
      pane: 'tile',
      layerType: 'XYZServer',
      overviewTilePath: this.overviewTilePath,
      style: this.style,
      shown: this.shown || true,
      credentials: this.credentials
    }
  }

  get extent () {
    if (this._configuration.extent) {
      return this._configuration.extent
    }
    this._configuration.extent = [-180, -90, 180, 90]
    return this._configuration.extent
  }

  get style () {
    this._style = this._style || {
      opacity: 1
    }
    return this._style
  }

  get mapLayer () {
    if (this._mapLayer) return this._mapLayer
    let TileLayerWithHeaders = Vendor.L.TileLayer.extend({
      initialize: function (url, options, headers) {
        Vendor.L.TileLayer.WMS.prototype.initialize.call(this, url, options)
        this.headers = headers
      },
      createTile (coords, done) {
        const url = this.getTileUrl(coords)
        const img = document.createElement('img')
        let getUrl = superagent.get(url)

        for (let i = 0; i < this.headers.length; i++) {
          getUrl = getUrl.set(this.headers[i].header, this.headers[i].value)
        }
        getUrl.responseType('blob')
          .then((response) => {
            img.src = URL.createObjectURL(response.body)
            done(null, img)
          })
        return img
      }
    })
    let tileLayerWithHeaders = function (url, options, headers) {
      return new TileLayerWithHeaders(url, options, headers)
    }
    const headers = []
    if (this.credentials && this.credentials.type === 'basic') {
      headers.push({ header: 'Authorization', value: this.credentials.authorization })
    }
    let options = {
      pane: this.configuration.pane === 'tile' ? 'tilePane' : 'overlayPane'
    }
    this._mapLayer = tileLayerWithHeaders(this.filePath, options, headers)
    this._mapLayer.id = this.id
    return this._mapLayer
  }

  async renderImageryTile (coords, tileCanvas, done) {
    if (!tileCanvas) {
      tileCanvas = document.createElement('canvas')
      tileCanvas.width = 256
      tileCanvas.height = 256
    }
    let ctx = tileCanvas.getContext('2d')
    ctx.clearRect(0, 0, tileCanvas.width, tileCanvas.height)
    let options = {
      method: 'GET',
      url: this.filePath.replace('{z}', coords.z).replace('{x}', coords.x).replace('{y}', coords.y),
      encoding: null
    }
    if (this.credentials) {
      if (this.credentials.type === 'basic') {
        if (!options.headers) {
          options.headers = {}
        }
        options.headers['Authorization'] = this.credentials.authorization
      }
    }
    return request(options)
  }
}
