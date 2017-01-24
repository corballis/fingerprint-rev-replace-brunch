'use strict';

const path = require('path');
const fs = require('fs');

class FingerPrintsRevReplacePlugin {
  constructor(config) {
    this.config = config.plugins.fingerprintsRevReplace || {};

    if (!this.config.canonicalUris) {
      this.config.canonicalUris = true;
    }

    this.config.prefix = this.config.prefix || '';
    this.config.replaceInExtensions = this.config.replaceInExtensions || ['.js', '.css', '.html'];
    this.config.manifest = this.config.manifest || './' + path.join(config.paths.public, 'assets.json');
  }

  onCompile(files) {
    this.renames = [];
    this.readManifest();
    this.replaceContents(files);
  }

  readManifest() {
    var that = this;
    var manifest = JSON.parse(fs.readFileSync(this.config.manifest, 'utf8').toString());
    Object.keys(manifest).forEach(function (srcFile) {
      that.renames.push({
        unreved: that.canonicalizeUri(srcFile),
        reved: that.config.prefix + that.canonicalizeUri(manifest[srcFile])
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
        var contents = fs.readFileSync(file.path, 'utf8').toString();

        that.renames.forEach(function replaceOnce(rename) {
          var unreved = that.config.modifyUnreved ? that.config.modifyUnreved(rename.unreved) : rename.unreved;
          var reved = that.config.modifyReved ? that.config.modifyReved(rename.reved) : rename.reved;
          contents = contents.split(unreved).join(reved);
          if (that.config.prefix) {
            contents = contents.split('/' + that.config.prefix).join(that.config.prefix + '/');
          }
        });

        fs.writeFileSync(file.path, contents, 'utf8');
      }
    });
  }

  byLongestUnreved(a, b) {
    return b.unreved.length - a.unreved.length;
  }
}

FingerPrintsRevReplacePlugin.prototype.brunchPlugin = true;
FingerPrintsRevReplacePlugin.prototype.defaultEnv = 'production';

module.exports = FingerPrintsRevReplacePlugin;
