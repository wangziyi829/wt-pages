//gulp自动化构建
// 1.样式、脚本、页面模板编译(gulp任务，src，dest)
// 2.图片、文字编译转换
// 3.其他文件及清除  del清除
// 4.开发热更新服务器,并监视变化自动刷新浏览器 browser-sync
// 5.html文件引用处理-useref
// 6.文件压缩()
// 7.规划构建过程，组合任务

const { src, dest, parallel, series, watch } = require('gulp')
const plugins = require('gulp-load-plugins')() //自动加载package.json文件里的gulp插件,使用plugins.插件名来代替,原始插件名去掉gulp-前缀，之后再转换为驼峰命名
const del = require('del') //清除文件
const babel = require('gulp-babel')
const bs = require('browser-sync').create();

const cwd = process.cwd();
const path = require('path')

let config = {
  build: {
    src: 'src',
    dist: 'dist',
    temp: 'temp',
    public: 'public',
    paths: {
      styles: 'assets/styles/*.scss',
      scripts: 'assets/scripts/*.js',
      pages: '*.html',
      images: 'assets/images/**',
      fonts: 'assets/fonts/**'
    }
  }
};

try {
  const loadConfig = require(path.join(cwd, 'page.config.js'))
  config = Object.assign({}, config, loadConfig)
  console.log(config)
} catch (e) {}

//文件清除
const clean = () => {
  return del([config.build.dist, config.build.temp])
}
//编译css  gulp-sass 不转换_开头的命名文件
const style = () => {  //base指定基准目录，后面目录结构保持不变
  return src(config.build.paths.styles, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.sass({ outputStyle: 'compressed' }))  //outputStyle配置选项，nested(默认）expanded：展开compact：单行,compressed：压缩
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true })) //以流的方式向浏览器推送
}

//编译脚本 gulp-bable 将ES6代码编译成ES5，需要安装@babel/core，@babel/preset-env
const script = () => {
  return src(config.build.paths.scripts, { base: config.build.src, cwd: config.build.src }).pipe(plugins.babel({ presets: [require('@babel/preset-env')] }))   // preset 可以作为 Babel 插件的组合，甚至可以作为可以共享的 options 配置。 preset-env转换最新的JavaScript
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }))
}
//编译页面模板 gulp-swig 动态数据模板编译 swig是js的模板引擎
const page = () => {
  return src(config.build.paths.pages, { base: config.build.src, cwd: config.build.src }).pipe(plugins.swig({ data: config.data, defaults: { cache: false } })) // 防止模板缓存导致页面不能及时更新
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }))
}

//图片编译压缩 gulp-imagemin 无损压缩
const image = () => {
  return src(config.build.paths.images, { base: config.build.src, cwd: config.build.src }).pipe(plugins.imagemin()).pipe(dest(config.build.dist))
}

//文字编译
const font = () => {
  return src(config.build.paths.fonts, { base: config.build.src, cwd: config.build.src }).pipe(plugins.imagemin()).pipe(dest(config.build.dist))
}

//其他文件编译，如public
const extra = () => {
  return src('**', { base: config.build.src, cwd: config.build.public }).pipe(dest(config.build.dist))
}

//开发热更新服务器
const serve = () => {
  //watch() 方法利用文件系统的监控程序(file system watcher)将 globs(定位文件)与任务(task)进行关联，如果有文件被修改了就执行关联的任务(task)
  watch(config.build.paths.styles, style)
  watch(config.build.paths.script, script)
  watch(config.build.paths.pages, page)
  // watch([
  //   'src/assets/images**',
  //   'src/assets/fonts/**',
  //   'public/**'
  // ],bs.reload())
  watch([
    config.build.paths.images,
    config.build.paths.fonts
  ], { cwd: config.build.src }, bs.reload)

  watch('**', { cwd: config.build.public }, bs.reload)
  bs.init({
    notify: false, //不显示在浏览器中的任何通知。
    port: 8090,
    // files:'config.build.temp/**', //监听文件变化，可以使用reload替代
    server: { //使用内置的静态服务器创建基本的HTML / JS / CSS的网站。
      baseDir: [config.build.temp, config.build.src, config.build.public],
      routes: {
        '/node_modules': 'node_modules'
      }
    }
  })
}
//gulp-useref 对html页面中的js，css引用进行合并，压缩等操作
const useref = () => {
  return src(config.build.paths.pages).pipe(plugins.useref({ searchPath: [config.build.temp, '.'] }))
    .pipe(plugins.if(/\.scss$/, plugins.cleanCss()))//压缩css
    .pipe(plugins.if(/\.js$/, plugins.uglify()))//压缩js
    .pipe(plugins.if(/\.html$/, plugins.htmlmin({
      removeComments: true,       // 清除HTML注释
      collapseWhitespace: true,   // 压缩HTML
      minifyJS: true,             // 压缩页面JS
      minifyCSS: true             // 压缩页面CSS
    })))//压缩html
    .pipe(dest(config.build.dist))
}

//编译任务组合
const compile = parallel(style, script, page)
//开发阶段任务组合
const develop = series(compile, serve)
// 上线前执行的任务
const build = series(
  clean,
  parallel(series(compile, useref), image, font, extra))

module.exports = {
  clean,
  build,
  develop
}

//折叠快捷键 ctrl+K ctrl+0
//展开快捷键 ctrl+K ctrl+j
// 命令行输入code . -a在同一个vs窗口中打开2个项目