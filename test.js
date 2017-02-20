'use strict';

const expect = require('chai').expect;
const Plugin = require('./');
const path = require('path');
const mock = require('mock-fs');
const fs = require('fs');

const assetsJson = '{\
  "css/master.css": "css/master-364b42a1.css",\
  "js/master.js": "js/master-cb70c02b.js",\
  "ajs/master.js": "ajs/master-cb60c02b.js",\
  "img/troll.png": "img/troll-5f2d5cbe.png",\
  "fonts/font.eot": "fonts/font-45d860a3.eot",\
  "fonts/font.woff": "fonts/font-6ced13b9.woff",\
  "fonts/font.ttf": "fonts/font-82c653e7.ttf",\
  "fonts/font.svg": "fonts/font-52343d4f.svg",\
  "js/app.js.map": "js/app-12345.js.map",\
  "sample.css": "sample.a1be45.css",\
  "sample.js": "sample.a2c442.js"\
}';

const indexHtmlPath = path.join(__dirname, 'public', 'index.html');

const indexHtml = '<html>\
  <head>\
  <link rel="stylesheet" href="/css/master.css"/>\
  </head>\
  <body>\
  <img src="/img/troll.png"/><img src="/img/troll.png"/>\
  <script type="javascript" src="/ajs/master.js"></script>\
  </body>\
  </html>';

const expectedIndexHtml = '<html>\
  <head>\
  <link rel="stylesheet" href="/css/master-364b42a1.css"/>\
  </head>\
  <body>\
  <img src="/img/troll-5f2d5cbe.png"/><img src="/img/troll-5f2d5cbe.png"/>\
  <script type="javascript" src="/ajs/master-cb60c02b.js"></script>\
  </body>\
  </html>';

const expectedPrefixIndexHtml = '<html>\
  <head>\
  <link rel="stylesheet" href="http://example.com/css/master-364b42a1.css"/>\
  </head>\
  <body>\
  <img src="http://example.com/img/troll-5f2d5cbe.png"/><img src="http://example.com/img/troll-5f2d5cbe.png"/>\
  <script type="javascript" src="http://example.com/ajs/master-cb60c02b.js"></script>\
  </body>\
  </html>';

const sampleCssPath = path.join(__dirname, 'public', 'sample.css');

const sampleCss = '\
body {\
  background-color: royalblue;\
  background-image: url(/img/troll.png) center center;\
}\
\
@font-face {\
  font-family: "font";\
  src:url("/fonts/font.eot");\
  src:url("/fonts/font.eot?#iefix") format("embedded-opentype"),\
    url("/fonts/font.woff") format("woff"),\
    url("/fonts/font.ttf") format("truetype"),\
    url("/fonts/font.svg#font") format("svg");\
  font-weight: normal;\
  font-style: normal;\
\
}';

const expectedSampleCss = '\
body {\
  background-color: royalblue;\
  background-image: url(/img/troll-5f2d5cbe.png) center center;\
}\
\
@font-face {\
  font-family: "font";\
  src:url("/fonts/font-45d860a3.eot");\
  src:url("/fonts/font-45d860a3.eot?#iefix") format("embedded-opentype"),\
    url("/fonts/font-6ced13b9.woff") format("woff"),\
    url("/fonts/font-82c653e7.ttf") format("truetype"),\
    url("/fonts/font-52343d4f.svg#font") format("svg");\
  font-weight: normal;\
  font-style: normal;\
\
}';

const expectedPrefixSampleCss = '\
body {\
  background-color: royalblue;\
  background-image: url(http://example.com/img/troll-5f2d5cbe.png) center center;\
}\
\
@font-face {\
  font-family: "font";\
  src:url("http://example.com/fonts/font-45d860a3.eot");\
  src:url("http://example.com/fonts/font-45d860a3.eot?#iefix") format("embedded-opentype"),\
    url("http://example.com/fonts/font-6ced13b9.woff") format("woff"),\
    url("http://example.com/fonts/font-82c653e7.ttf") format("truetype"),\
    url("http://example.com/fonts/font-52343d4f.svg#font") format("svg");\
  font-weight: normal;\
  font-style: normal;\
\
}';

const sampleJsPath = path.join(__dirname, 'public', 'sample.js');

const sampleJs = 'var path="/img/troll.png";';
const expectedSampleJs = 'var path="/img/troll-5f2d5cbe.png";';
const expectedPrefixSampleJs = 'var path="http://example.com/img/troll-5f2d5cbe.png";';

const mapJsPath = path.join(__dirname, 'public', 'map.js');

const mapJsFileBody = 'console.log("Hello world"); //# sourceMappingURL=app.js.map';
const expectedMapJsFileBody = 'console.log("Hello world"); //# sourceMappingURL=app-12345.js.map';

describe('Plugin', () => {
  let plugin;

  beforeEach(() => {
    mock({
      'assets.json': assetsJson,
      'public': {
        'index.html': indexHtml,
        'sample.css': sampleCss,
        'sample.js': sampleJs
      }
    });
  });

  afterEach(mock.restore);

  describe('default configuration', () => {
    beforeEach(() => {
      plugin = new Plugin({
        plugins: {},
        paths: {
          public: 'public'
        }
      });
    });

    it('should replace revs', () => {
      plugin.onCompile([{path: sampleCssPath}, {path: sampleJsPath}], [{destinationPath: indexHtmlPath}]);

      expectFileContent(indexHtmlPath, expectedIndexHtml);
      expectFileContent(sampleCssPath, expectedSampleCss);
      expectFileContent(sampleJsPath, expectedSampleJs);
    });
  });

  describe('replaceInExtensions override', () => {
    beforeEach(() => {
      plugin = new Plugin({
        plugins: {
          fingerprintsRevReplace: {
            replaceInExtensions: ['.css']
          }
        },
        paths: {
          public: 'public'
        }
      });
    });

    it('should only replace revs in requested file types', () => {
      plugin.onCompile([{path: sampleCssPath}, {path: sampleJsPath}], [{destinationPath: indexHtmlPath}]);

      expectFileContent(indexHtmlPath, indexHtml);
      expectFileContent(sampleCssPath, expectedSampleCss);
      expectFileContent(sampleJsPath, sampleJs);
    });
  });

  describe('manifest path override', () => {
    beforeEach(() => {
      mock({
        'public': {
          'assets1.json': assetsJson,
          'index.html': indexHtml,
          'sample.css': sampleCss,
          'sample.js': sampleJs
        }
      });

      plugin = new Plugin({
        plugins: {
          fingerprint: {
            manifest: 'public/assets1.json'
          }
        },
        paths: {
          public: 'public'
        }
      });
    });

    it('should replace revs', () => {
      plugin.onCompile([{path: sampleCssPath}, {path: sampleJsPath}], [{destinationPath: indexHtmlPath}]);

      expectFileContent(indexHtmlPath, expectedIndexHtml);
      expectFileContent(sampleCssPath, expectedSampleCss);
      expectFileContent(sampleJsPath, expectedSampleJs);
    });
  });

  describe('prefix', () => {
    beforeEach(() => {
      plugin = new Plugin({
        plugins: {
          fingerprintsRevReplace: {
            prefix: 'http://example.com'
          }
        },
        paths: {
          public: 'public'
        }
      });
    });

    it('should replace revs', () => {
      plugin.onCompile([{path: sampleCssPath}, {path: sampleJsPath}], [{destinationPath: indexHtmlPath}]);

      expectFileContent(indexHtmlPath, expectedPrefixIndexHtml);
      expectFileContent(sampleCssPath, expectedPrefixSampleCss);
      expectFileContent(sampleJsPath, expectedPrefixSampleJs);
    });
  });

  describe('modifyUnreved and modifyReved options', () => {
    beforeEach(() => {
      mock({
        'assets.json': assetsJson,
        'public': {
          'sample.css': sampleCss,
          'map.js': mapJsFileBody
        }
      });

      plugin = new Plugin({
        plugins: {
          fingerprintsRevReplace: {
            modifyUnreved: replaceJsIfMap,
            modifyReved: replaceJsIfMap
          }
        },
        paths: {
          public: 'public'
        }
      });
    });

    it('should replace revs', () => {
      plugin.onCompile([{path: sampleCssPath}, {path: mapJsPath}], []);

      expectFileContent(sampleCssPath, expectedSampleCss);
      expectFileContent(mapJsPath, expectedMapJsFileBody);
    });

    function replaceJsIfMap(filename) {
      if (filename.indexOf('.map') > -1) {
        return filename.replace('js/', '');
      }
      return filename;
    }
  });

  describe('src and dest base path', () => {
    const sampleCssReved = 'sample.a1be45.css';
    const sampleJsReved = 'sample.a2c442.js';
    const sampleCssRevedPath = path.join(__dirname, 'public', sampleCssReved);
    const sampleJsRevedPath = path.join(__dirname, 'public', sampleJsReved);

    beforeEach(() => {
      var fileSystem = {
        'public': {
          'assets1.json': assetsJson,
          'index.html': indexHtml
        }
      };
      fileSystem.public[sampleCssReved] = sampleCss;
      fileSystem.public[sampleJsReved] = sampleJs;

      mock(fileSystem);

      plugin = new Plugin({
        plugins: {
          fingerprint: {
            manifest: 'public/assets1.json',
            srcBasePath: 'public/',
            destBasePath: 'public/'
          }
        },
        paths: {
          public: 'public'
        }
      });
    });

    it('should replace revs', () => {
      plugin.onCompile([{path: path.join('public', 'sample.css')}, {path: path.join('public', 'sample.js')}], [{destinationPath: indexHtmlPath}]);

      expectFileContent(indexHtmlPath, expectedIndexHtml);
      expectFileContent(sampleCssRevedPath, expectedSampleCss);
      expectFileContent(sampleJsRevedPath, expectedSampleJs);
    });
  });

  function expectFileContent(path, expectedContent) {
    var actualContent = fs.readFileSync(path).toString();
    expect(actualContent).to.equal(expectedContent);
  }
});
