import { NativeModules, Platform, AppRegistry } from 'react-native';
import 'react';
import path from 'react-native-path';
import { setCustomSourceTransformer } from 'react-native/Libraries/Image/resolveAssetSource';
const assetPathUtils = require('react-native/Libraries/Image/assetPathUtils');

function isBiz(folderName, bizName) {
  const fUiid = folderName.split('_')[0];
  const bUiid = bizName.split('_')[0];
  return fUiid === bUiid;
}

const oldRun = AppRegistry.runApplication;
AppRegistry.runApplication = (appKey, appParameters) => {
  const { devInfo } = appParameters.initialProps;
  global.__devInfo = devInfo || { uiPhase: 'release' };
  oldRun(appKey, appParameters);
};

if (!__DEV__) {
  setCustomSourceTransformer(function (resolver) {
    const assetObj = resolver.defaultAsset();
    const { scriptURL } = NativeModules.SourceCode;
    const { asset, jsbundleUrl } = resolver;
    const { httpServerLocation } = asset;
    const folderName = httpServerLocation.split('/')[1].toLowerCase();
    const f = scriptURL.split('/');
    f.pop();
    const bizName = f.pop().toLowerCase();

    if (Platform.OS === 'ios') {
      const uiid = folderName.split('_')[0];
      const isBizFolder = uiid.length === 10 && uiid.startsWith('0');
      const bizFolder = `${uiid}_RN_${global.__devInfo.uiPhase}_1`;
      const sourceFolder = isBizFolder ? bizFolder : folderName;
      const bizAssetURL = path.dirname(jsbundleUrl);
      if (!scriptURL.startsWith('http')) {
        const fileName = `${httpServerLocation}/${asset.name}`.replace(/^\//, '');
        const { scale } = assetObj;
        const s = scale > 1 ? `@${scale}x` : '';
        assetObj.uri = `${bizAssetURL}/${sourceFolder}/${fileName}${s}.${asset.type}`;
      }
    } else if (Platform.OS === 'android') {
      const isBizFolder = isBiz(folderName, bizName);
      const sourceFolder = isBizFolder ? bizName : folderName;

      if (!scriptURL.startsWith('http')) {
        const bundleFolder = path.dirname(path.dirname(scriptURL));
        const { scale } = assetObj;
        const drawbleFolder = assetPathUtils.getAndroidResourceFolderName(asset, scale);
        const fileName = assetPathUtils.getAndroidResourceIdentifier(asset);
        assetObj.uri = `file://${bundleFolder}/${sourceFolder}/${drawbleFolder}/${fileName}.${asset.type}`;
      }
    }
    return assetObj;
  });
}
