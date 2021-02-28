'use strict';

var generator = require('./lib/generator');

console.log("restful plugin loaded");

hexo.extend.generator.register('restful', function(site) {
    return generator(Object.assign({}, hexo.config, hexo.theme.config), site);
});
