import { NativeModules, Platform } from 'react-native';
import 'react';
import path from 'react-native-path';
import { setCustomSourceTransformer } from 'react-native/Libraries/Image/resolveAssetSource';
const assetPathUtils = require('react-native/Libraries/Image/assetPathUtils');

if (!__DEV__) {
  setCustomSourceTransformer(function (resolver) {
    const assetObj = resolver.defaultAsset();
    const { scriptURL } = NativeModules.SourceCode;
    const { asset, jsbundleUrl } = resolver;
    const { httpServerLocation } = asset;
    const folderName = httpServerLocation.split('/')[1].toLowerCase();

    if (Platform.OS === 'ios') {
      const bizAssetURL = path.dirname(jsbundleUrl);
      if (!scriptURL.startsWith('http')) {
        const fileName = `${httpServerLocation}/${asset.name}`.replace(/^\//, '');
        assetObj.uri = `${bizAssetURL}/${folderName}/${fileName}.${asset.type}`;
      }
    } else if (Platform.OS === 'android') {
      if (!scriptURL.startsWith('http')) {
        const bundleFolder = path.dirname(path.dirname(scriptURL));
        const { scale } = assetObj;
        const drawbleFolder = assetPathUtils.getAndroidResourceFolderName(asset, scale);
        const fileName = assetPathUtils.getAndroidResourceIdentifier(asset);
        assetObj.uri = `file://${bundleFolder}/${folderName}/${drawbleFolder}/${fileName}.${asset.type}`;
      }
    }
    return assetObj;
  });
}
