/* eslint-disable import/no-dynamic-require */
const { sep, resolve } = require('path');
const path = require('path');
const fs = require('fs');
const lodash = require('lodash');

const pathSep = sep;
const moduleContent = require(process.env.modulePath);

const { include = [], dependencies: dps, includePath } = moduleContent;
const originalDep = [...dps];
const modules = [...include];
const exclude = [];
const e = [...exclude];
let debounced = null;

if (process.env.type === 'biz') {
  dps.length = 0;
  const packageJson = require(path.resolve(process.env.projectRootPath, 'package.json'));
  const { dep } = packageJson;
  if (dep) {
    dps.push(...dep);
  }
}

dps.map(item => {
  const k = Object.keys(item)[0];
  const v = Object.values(item)[0];
  const key = k.toLowerCase();
  console.log(item, k, v);
  const content = require(path.resolve(__dirname, `${key}/${v}/${key}.modules.json`));
  const { includePath: ex } = content;
  e.push(...ex);
  return key;
});

const allEx = new Set(e);

function getDependencies(module) {
  const modulePath = resolve(process.env.projectRootPath, './node_modules', module, 'package.json');
  const packageJson = require(modulePath);
  return packageJson.dependencies ? Object.keys(packageJson.dependencies) : [];
}

modules.forEach(element => {
  findDependenciesDeeply(element);
});

function findDependenciesDeeply(module) {
  const deps = getDependencies(module);
  deps.map(item => {
    if (!modules.includes(item)) {
      modules.push(item);
      findDependenciesDeeply(item);
    }
    return item;
  });
}
function syncModules() {
  if (debounced) debounced.cancel();
  debounced = lodash.debounce(
    () => {
      const packed = process.env.moduleKeys.split(',');
      packed.pop();
      packed.push(...includePath);

      const content = {
        dependencies: originalDep,
        include,
        includePath: Array.from(new Set(packed)),
      };
      fs.writeFileSync(process.env.modulePath, JSON.stringify(content));
      if (!(process.env.dynamic === 'true' || process.env.force === 'true')) {
        delete content.include;
        delete content.includePath;
      }
      content.version = process.env.version;
      content.id = process.env.moduleName;
      fs.writeFileSync(path.join(process.env.outputPath, 'package.json'), JSON.stringify(content));
    },
    250,
    { maxWait: 2000 }
  );
  debounced();
}

const dependencies = modules;
const { projectRootPath } = process.env; // 获取命令行执行的目录，__dirname是nodejs提供的变量

const getPath = originalPath => {
  let name = '';
  if (originalPath.indexOf(`node_modules${pathSep}react-native${pathSep}Libraries${pathSep}`) > 0) {
    name = originalPath.substr(originalPath.lastIndexOf(pathSep) + 1); // 这里是去除路径中的'node_modules/react-native/Libraries/‘之前（包括）的字符串，可以减少包大小，可有可无
  } else if (originalPath.indexOf(projectRootPath) === 0) {
    name = originalPath.substr(projectRootPath.length + 1); // 这里是取相对路径，不这么弄的话就会打出_user_smallnew_works_....这么长的路径，还会把计算机名打进去
  }
  return name;
};
function createModuleIdFactory() {
  return getPath;
}

if (process.env.force === 'true') {
  console.log(modules);
}

function processModuleFilter(module) {
  const modulePath = module.path.substr(process.env.projectRootPath.length + 1);
  if (modulePath === process.env.entry.replace('./', '')) {
    process.env.moduleKeys = `${process.env.moduleKeys + modulePath},`;
    return true;
  }
  if (modulePath.startsWith('node_modules')) {
    const m = modulePath.split(pathSep)[1];
    if (allEx.has(modulePath)) {
      if (process.env.force !== 'true') {
        return false;
      }
    }
    if (dependencies.length > 0) {
      const fd = dependencies.filter(key => key.startsWith(m));
      for (let index = 0; index < fd.length; index++) {
        const key = fd[index];
        if (modulePath.indexOf(key) > -1) {
          process.env.moduleKeys = `${process.env.moduleKeys + modulePath},`;
          syncModules();
          return true;
        }
      }
      if (dependencies.includes(m)) {
        process.env.moduleKeys = `${process.env.moduleKeys + modulePath},`;
        syncModules();
        return true;
      }
    }
  }
  if (process.env.type === 'biz') syncModules();
  return true;
}

function getRunModuleStatement(entryFilePath) {
  if (entryFilePath === 'InitializeCore.js' && process.env.platform === 'android') {
    return '';
  }
  return `__r('${entryFilePath}')`;
}

module.exports = {
  projectRoot: projectRootPath,
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: false,
      },
    }),
    assetPlugins: [path.resolve(__dirname, './assetDataPlugin.js')],
  },
  serializer: {
    createModuleIdFactory,
    processModuleFilter,
    getRunModuleStatement,
    /* serializer options */
  },
};
