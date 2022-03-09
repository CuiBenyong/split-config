/* eslint-disable no-param-reassign */
function getAssetData(assetData) {
  const { httpServerLocation } = assetData;
  const path = `/${process.env.packName}${httpServerLocation}`;
  assetData.httpServerLocation = path;
  return assetData;
}

module.exports = getAssetData;
