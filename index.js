'use strict';

const path = require('path');
const fs = require('fs');

class FingerPrintsRevReplacePlugin {
  constructor(config) {
    this.config = config.plugins.fingerprintRevReplace || {};
    this.fingerPrintConfig = config.plugins.fingerprint || {};

    if (typeof this.config.canonicalUris === 'undefined') {
      this.config.canonicalUris = true;
    }

    this.config.prefix = this.config.prefix || '';
    this.config.replaceInExtensions = this.config.replaceInExtensions || ['.js', '.css', '.html'];
    this.config.manifest = this.fingerPrintConfig.manifest || 'assets.json';
    this.config.srcBasePath = config.plugins.fingerprint && config.plugins.fingerprint.srcBasePath || '';
    this.config.srcBasePath = this.canonicalizeUri(this.config.srcBasePath);
    this.config.destBasePath = config.plugins.fingerprint && config.plugins.fingerprint.destBasePath || '';
    this.config.destBasePath = this.canonicalizeUri(this.config.destBasePath);
  }

  onCompile(files, assets) {
    var allFiles = files.concat(assets.map(function (asset) {
      return {path: asset.destinationPath};
    }));
    this.renames = [];
    this.readManifest();
    this.replaceContents(allFiles);
  }

  readManifest() {
    var that = this;
    var manifest = JSON.parse(fs.readFileSync(this.config.manifest, 'utf8').toString());
    Object.keys(manifest).forEach(function (srcFile) {
      that.renames.push({
        unreved: that.canonicalizeUri(srcFile),
        reved: that.canonicalizeUri(manifest[srcFile])
      });
    });
  }

  canonicalizeUri(filePath) {
    if (path.sep !== '/' && this.config.canonicalUris) {
      filePath = filePath.split(path.sep).join('/');
    }

    return filePath;
  }

  replaceContents(files) {
    var that = this;
    this.renames = this.renames.sort(this.byLongestUnreved);

    files.forEach(function replaceInFile(file) {
      if (that.config.replaceInExtensions.indexOf(path.extname(file.path)) > -1) {
        var realPath = that.findRealPath(file);

        if (realPath) {
          var contents = fs.readFileSync(realPath, 'utf8').toString();

          that.renames.forEach(function replaceOnce(rename) {
            var unreved = that.config.modifyUnreved ? that.config.modifyUnreved(rename.unreved) : rename.unreved;
            var reved = that.config.modifyReved ? that.config.modifyReved(that.config.prefix + rename.reved) : that.config.prefix + rename.reved;
            contents = contents.split(unreved).join(reved);
            if (that.config.prefix) {
              contents = contents.split('/' + that.config.prefix).join(that.config.prefix + '/');
            }
          });

          fs.writeFileSync(realPath, contents, 'utf8');
        }
      }
    });
  }

  findRealPath(file) {
    var realPath;
    if (fs.existsSync(file.path)) {
      realPath = file.path;
    } else {
      var manifestPath = this.canonicalizeUri(file.path).substring(this.config.srcBasePath.length);
      var revedPath = this.findReved(manifestPath);
      if (revedPath) {
        realPath = this.config.destBasePath + revedPath;
      }
    }
    return realPath;
  }

  byLongestUnreved(a, b) {
    return b.unreved.length - a.unreved.length;
  }

  findReved(unreved) {
    var reved;
    this.renames.forEach(function (rename) {
      if (unreved === rename.unreved) {
        reved = rename.reved;
      }
    });

    return reved;
  }
}

FingerPrintsRevReplacePlugin.prototype.brunchPlugin = true;
FingerPrintsRevReplacePlugin.prototype.defaultEnv = 'production';

module.exports = FingerPrintsRevReplacePlugin;
