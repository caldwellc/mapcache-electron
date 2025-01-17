import proj4 from 'proj4'
var defs = require('../projection/proj4Defs')
for (var name in defs) {
  if (defs[name]) {
    proj4.defs(name, defs[name])
  }
}

export default class TileBoundingBoxUtils {
  static WEB_MERCATOR_HALF_WORLD_WIDTH = proj4('EPSG:4326', 'EPSG:3857').forward([180, 0])[0]

  /**
 * Get the Web Mercator tile bounding box from the Standard Maps API tile
 * coordinates and zoom level
 *
 *  @param x    x
 *  @param y    y
 *  @param zoom zoom level
 *
 *  @return web mercator bounding box
 */
  static getWebMercatorBoundingBoxFromXYZ (x, y, zoom, options) {
    var tilesPerSide = TileBoundingBoxUtils.tilesPerSideWithZoom(zoom)
    var tileSize = TileBoundingBoxUtils.tileSizeWithTilesPerSide(tilesPerSide)

    var meterBuffer = 0
    if (options && options.buffer && options.tileSize) {
      var pixelBuffer = options.buffer
      var metersPerPixel = tileSize / options.tileSize
      meterBuffer = metersPerPixel * pixelBuffer
    }

    var minLon = (-1 * TileBoundingBoxUtils.WEB_MERCATOR_HALF_WORLD_WIDTH) + (x * tileSize) - meterBuffer
    var maxLon = (-1 * TileBoundingBoxUtils.WEB_MERCATOR_HALF_WORLD_WIDTH) + ((x + 1) * tileSize) + meterBuffer
    var minLat = TileBoundingBoxUtils.WEB_MERCATOR_HALF_WORLD_WIDTH - ((y + 1) * tileSize) - meterBuffer
    var maxLat = TileBoundingBoxUtils.WEB_MERCATOR_HALF_WORLD_WIDTH - (y * tileSize) + meterBuffer

    minLon = Math.max((-1 * TileBoundingBoxUtils.WEB_MERCATOR_HALF_WORLD_WIDTH), minLon)
    maxLon = Math.min(TileBoundingBoxUtils.WEB_MERCATOR_HALF_WORLD_WIDTH, maxLon)
    minLat = Math.max((-1 * TileBoundingBoxUtils.WEB_MERCATOR_HALF_WORLD_WIDTH), minLat)
    maxLat = Math.min(TileBoundingBoxUtils.WEB_MERCATOR_HALF_WORLD_WIDTH, maxLat)

    return {minLon, maxLon, minLat, maxLat}
  }

  /**
   *  Get the tile size in meters
   *
   *  @param tilesPerSide tiles per side
   *
   *  @return meters
   */
  static tileSizeWithTilesPerSide (tilesPerSide) {
    return (2 * TileBoundingBoxUtils.WEB_MERCATOR_HALF_WORLD_WIDTH) / tilesPerSide
  }

  /**
   *  Get the tiles per side, width and height, at the zoom level
   *
   *  @param zoom zoom level
   *
   *  @return tiles per side
   */
  static tilesPerSideWithZoom (zoom) {
    return Math.pow(2, zoom)
  }

  static determineImageDimensionsFromExtent (ll, ur) {
    let width = 150
    let height = 150
    let widthHeightRatio = (ur[0] - ll[0]) / (ur[1] - ll[1])
    // 2 / 1  > 1 = wider than tall
    // 1/ 2 < 1 = taller than wide
    if (widthHeightRatio > 1) {
      width = Math.ceil(height * widthHeightRatio)
    } else {
      height = Math.ceil(width * widthHeightRatio)
    }
    return {
      width,
      height
    }
  }

  static determineXYZTileInsideExtent (ll, ur) {
    try {
      var llwm = proj4('EPSG:4326', 'EPSG:3857').forward(ll)
      var urwm = proj4('EPSG:4326', 'EPSG:3857').forward(ur)

      let webMercatorBoundingBox = {
        minLongitude: llwm[0],
        minLatitude: llwm[1],
        maxLongitude: urwm[0],
        maxLatitude: urwm[1]
      }

      let minX = 0
      let maxX = 0
      let maxY = 0
      let minY = 0
      let x = 0
      let y = 0
      for (let z = 0; z < 19; z++) {
        let tilesPerSide = TileBoundingBoxUtils.tilesPerSideWithZoom(z)
        let tileSize = TileBoundingBoxUtils.tileSizeWithTilesPerSide(tilesPerSide)

        minX = Math.floor((webMercatorBoundingBox.minLongitude - (-1 * TileBoundingBoxUtils.WEB_MERCATOR_HALF_WORLD_WIDTH)) / tileSize)
        maxX = Math.max(0, Math.floor(((webMercatorBoundingBox.maxLongitude - (-1 * TileBoundingBoxUtils.WEB_MERCATOR_HALF_WORLD_WIDTH)) / tileSize) - 1))
        maxY = Math.max(0, Math.ceil(((-1 * (webMercatorBoundingBox.minLatitude - TileBoundingBoxUtils.WEB_MERCATOR_HALF_WORLD_WIDTH)) / tileSize) - 1))
        minY = Math.floor((-1 * (webMercatorBoundingBox.maxLatitude - TileBoundingBoxUtils.WEB_MERCATOR_HALF_WORLD_WIDTH)) / tileSize)
        if ((minX < maxX && minX !== maxX && ((maxX - minX) >= 2)) || ((minY !== maxY) && (maxY - minY) >= 2)) {
          return {
            x: minX + 1,
            y: minY + 1,
            z: z
          }
        }
        x = minX
        y = minY
      }
      return {
        x: x,
        y: y,
        z: 18
      }
    } catch (e) {
      return {
        x: 0,
        y: 0,
        z: 0
      }
    }
  }

  static tileIntersects (tileBboxUR, tileBboxLL, geotiffBboxUR, geotiffBboxLL) {
    let r2 = {
      left: tileBboxLL[0],
      right: tileBboxUR[0],
      top: tileBboxUR[1],
      bottom: tileBboxLL[1]
    }
    let r1 = {
      left: geotiffBboxLL[0],
      right: geotiffBboxUR[0],
      top: geotiffBboxUR[1],
      bottom: geotiffBboxLL[1]
    }

    return !(r2.left > r1.right ||
  r2.right < r1.left ||
  r2.top < r1.bottom ||
  r2.bottom > r1.top)
  }
}
