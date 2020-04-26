'use strict';


let pagination = require('hexo-pagination');
let _pick = require('lodash.pick');

// let toc = require('@scripts/markdown-toc-unlazy');
let toc = require('@scripts/markdown-toc');
let mila = require('markdown-it-link-attributes');
// let hljs = require("highlight.js");
let md = require('markdown-it')({
// let md = new Remarkable('full', {
  html: true,        // Enable HTML tags in source
  xhtmlOut: true,        // Use '/' to close single tags (<br />).
  // This is only for full CommonMark compatibility.
  breaks: true,        // Convert '\n' in paragraphs into <br>
  langPrefix: 'language-',  // CSS language prefix for fenced blocks. Can be
  // useful for external highlighters.

  linkify: true,
  typographer: false,
  quotes: '“”‘’',
  // highlight: function (str, lang) {
  //   return hljs.highlightAuto(str).value;
  // }
});
md.use(require('markdown-it-anchor').default, {});
md.use(require('markdown-it-emoji'), {});
md.use(require('markdown-it-container'), 'info', {});
md.use(require('markdown-it-container'), 'note', {});
md.use(require('markdown-it-container'), 'warning', {});
md.use(require('markdown-it-container'), 'alert', {});
md.use(mila, {
  attrs: {
    target: '_blank',
    rel: 'noopener'
  }
});

function buildURLForVue(url) {
  return url;
  // if (url.indexOf('#') > -1) return url
  // else return url;
}

function extractMore(content) {
  let match = content.match(/<!-+\s*more\s*-+>/);
  if (match === null) return {more: "", main: content};
  let more = content.substring(0, match.index);
  let main = content.substring(match.index, content.length - match.index);
  more = md.render(more);
  main = md.render(main);
  return {more, main};
}

function filterHTMLTags(str) {
  return str ? str
    .replace(/\<(?!img|br).*?\>/g, "")
    .replace(/\r?\n|\r/g, '')
    .replace(/<img(.*)>/g, ' [Figure] ') : null
}

function fetchCovers(str) {
  var temp,
    imgURLs = [],
    rex = /<img[^>]+src="?([^"\s]+)"(.*)>/g;
  while (temp = rex.exec(str)) {
    imgURLs.push(temp[1]);
  }
  return imgURLs.length > 0 ? imgURLs : null;
}

function fetchCover(str) {
  var covers = fetchCovers(str)
  return covers ? covers[0] : null;
}

module.exports = function (cfg, site) {

  var restful = cfg.hasOwnProperty('restful') ? cfg.restful :
    {
      site: true,
      posts_size: 10,
      posts_props: {
        title: true,
        slug: true,
        date: true,
        updated: true,
        comments: true,
        cover: true,
        path: true,
        raw: false,
        excerpt: false,
        content: false,
        categories: true,
        tags: true
      },
      categories: true,
      use_category_slug: false,
      tags: true,
      use_tag_slug: false,
      post: true,
      pages: false,
    },

    posts = site.posts.sort('-date').filter(function (post) {
      // return post.published;
      return true;
    }),

    posts_props = (function () {
      var props = restful.posts_props;

      return function (name, val) {
        return props[name] ? (typeof val === 'function' ? val() : val) : null;
      }
    })(),

    postMap = function (post) {
      return {
        title: post.title,
        subtitle: post.subtitle,
        author: post.author,
        excerpt: extractMore(post._content).more,
        // main: extractMore(post._content).main,
        // raw_content: post._content,
        // render_content: md.render(post._content),
        // toc: toc(post._content).json,
        // source: post.source,
        // raw: post.raw,
        slug: post.slug,
        published: post.published,
        date: post.date,
        updated: post.updated,
        // comments: post.comments,
        // photos: post.photos,
        // link: post.link,
        // content: post.content,
        path: buildURLForVue(post.path),
        // permalink: post.permalink,
        api_path: 'api/articles/' + post.slug + '.json',
        keywords: cfg.keywords,
        // cover: post.cover || fetchCover(post.content),
        // categories: posts_props('categories', function () {
        //   return post.categories.map(function (cat) {
        //     const name = (
        //       cfg.restful.use_category_slug && cat.slug
        //     ) ? cat.slug : cat.name;
        //     return {
        //       name: name,
        //       path: 'api/categories/' + name + '.json'
        //     };
        //   });
        // }),
        tags: posts_props('tags', function () {
          return post.tags.map(function (tag) {
            const name = (
              cfg.restful.use_tag_slug && tag.slug
            ) ? tag.slug : tag.name;
            return {
              name: name,
              path: 'api/tags/' + name + '.json'
            };
          });
        })
      };
    },

    cateReduce = function (cates, kind) {
      return cates.reduce(function (result, item) {
        if (!item.length) return result;

        let use_slug = null;
        switch (kind) {
          case 'categories':
            use_slug = cfg.restful.use_category_slug;
            break;
          case 'tags':
            use_slug = cfg.restful.use_tag_slug;
            break;
        }

        const name = (use_slug && item.slug) ? item.slug : item.name;

        return result.concat(pagination(item.path, posts, {
          perPage: 0,
          data: {
            name: name,
            path: 'api/' + kind + '/' + name + '.json',
            postlist: item.posts.map(postMap)
          }

        }));
      }, []);
    },

    catesMap = function (item) {
      return {
        name: item.data.name,
        path: item.data.path,
        count: item.data.postlist.length
      };
    },

    cateMap = function (item) {
      var itemData = item.data;
      return {
        path: itemData.path,
        data: JSON.stringify({
          name: itemData.name,
          postlist: itemData.postlist
        })
      };
    },

    apiData = [];


  if (restful.site) {
    apiData.push({
      path: 'api/site.json',
      data: JSON.stringify(restful.site instanceof Array ? _pick(cfg, restful.site) : cfg)
    });
  }

  if (restful.categories) {

    var cates = cateReduce(site.categories, 'categories');

    if (!!cates.length) {
      apiData.push({
        path: 'api/categories.json',
        data: JSON.stringify(cates.map(catesMap))
      });

      apiData = apiData.concat(cates.map(cateMap));
    }

  }

  if (restful.tags) {
    var tags = cateReduce(site.tags, 'tags');

    if (tags.length) {
      apiData.push({
        path: 'api/tags.json',
        data: JSON.stringify(tags.map(catesMap))
      });

      apiData = apiData.concat(tags.map(cateMap));
    }

  }

  var postlist = posts.map(postMap);

  if (restful.posts_size > 0) {

    var page_posts = [],
      i = 0,
      len = postlist.length,
      ps = restful.posts_size,
      pc = Math.ceil(len / ps);

    for (; i < len; i += ps) {
      page_posts.push({
        path: 'api/posts/' + Math.ceil((i + 1) / ps) + '.json',
        data: JSON.stringify({
          total: len,
          pageSize: ps,
          pageCount: pc,
          data: postlist.slice(i, i + ps)
        })
      });
    }

    apiData.push({
      path: 'api/posts.json',
      data: page_posts[0].data
    });

    apiData = apiData.concat(page_posts);

  } else {

    apiData.push({
      path: 'api/posts.json',
      data: JSON.stringify(postlist)
    });
  }

  if (restful.post) {
    apiData = apiData.concat(posts.map(function (post) {
      var path = 'api/articles/' + post.slug + '.json';
      return {
        path: path,
        data: JSON.stringify({
          title: post.title,
          subtitle: post.subtitle,
          author: post.author,
          excerpt: extractMore(post._content).more,
          main: extractMore(post._content).main,
          raw_content: post._content,
          render_content: md.render(post._content),
          toc: toc(post._content).json,
          source: post.source,
          raw: post.raw,
          slug: post.slug,
          published: post.published,
          date: post.date,
          updated: post.updated,
          comments: post.comments,
          photos: post.photos,
          link: post.link,
          content: post.content,
          path: buildURLForVue(post.path),
          permalink: post.permalink,
          api_path: 'api/articles/' + post.slug + '.json',
          keywords: cfg.keywords,
          cover: post.cover || fetchCover(post.content),
          categories: posts_props('categories', function () {
            return post.categories.map(function (cat) {
              const name = (
                cfg.restful.use_category_slug && cat.slug
              ) ? cat.slug : cat.name;
              return {
                name: name,
                path: 'api/categories/' + name + '.json'
              };
            });
          }),
          tags: posts_props('tags', function () {
            return post.tags.map(function (tag) {
              const name = (
                cfg.restful.use_tag_slug && tag.slug
              ) ? tag.slug : tag.name;
              return {
                name: name,
                path: 'api/tags/' + name + '.json'
              };
            });
          })
        })
      };
    }));
  }

  if (restful.pages) {
    apiData = apiData.concat(site.pages.data.map(function (page) {
      var safe_title = page.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()
      var path = 'api/pages/' + safe_title + '.json';

      return {
        path: path,
        data: JSON.stringify({
          title: page.title,
          date: page.date,
          updated: page.updated,
          comments: page.comments,
          path: path,
          covers: fetchCovers(page.content),
          excerpt: filterHTMLTags(page.excerpt),
          content: page.content
        })
      };
    }));
  }

  return apiData;
};
