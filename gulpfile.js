const gulp = require('gulp');
const prefix = require('gulp-autoprefixer');
const sass = require('gulp-sass')(require('sass'));
const fs = require('fs');
const path = require('path');
const through2 = require('through2');

/* ----------------------------------------- */
/* Configurations
/* ----------------------------------------- */

const SYSTEM_SCSS = ["scss/**/*.scss"];
const MACRO_FOLDERS = ['hotbar_0e', 'hotbar_1e', 'triggered_0e', 'triggered_1e'];
const SRC_DIR = 'temp_macros';
const DIST_DIR = 'temp_js';

/* ----------------------------------------- */
/* Helpers
/* ----------------------------------------- */

function handleError(err) {
  console.error('❌ Ошибка:', err.toString());
  this.emit('end');
}

/* ----------------------------------------- */
/* Compile Sass
/* ----------------------------------------- */

function compileScss() {
  return gulp.src(SYSTEM_SCSS)
    .pipe(sass({ outputStyle: 'expanded' }).on('error', handleError))
    .pipe(prefix({ cascade: false }))
    .pipe(gulp.dest("./css"));
}

/* ----------------------------------------- */
/* Macro Tasks (Extract & Build)
/* ----------------------------------------- */

// Из JSON (temp_macros) -> в JS (temp_js)
function extractMacros() {
  // Формируем массив путей: temp_macros/hotbar_0e/*.json и т.д.
  const paths = MACRO_FOLDERS.map(f => path.join(SRC_DIR, f, '*.json'));
  
  console.log(`🔍 Начинаю извлечение из ${SRC_DIR} в ${DIST_DIR}...`);

  return gulp.src(paths, { base: SRC_DIR }) // Указываем базовую папку, чтобы сохранить структуру подпапок
    .pipe(through2.obj(function(file, enc, cb) {
      if (file.isBuffer()) {
        try {
          const content = JSON.parse(file.contents.toString());
          file.contents = Buffer.from(content.command || '');
          
          // Меняем расширение пути файла для новой папки
          file.path = file.path.replace(/\.json$/, '.js');
          
          console.log(`✅ Создан JS: ${path.relative(process.cwd(), file.path).replace(SRC_DIR, DIST_DIR)}`);
        } catch (e) {
          console.log(`❌ Ошибка парсинга JSON в ${file.path}: ${e.message}`);
        }
      }
      cb(null, file);
    }))
    .pipe(gulp.dest(DIST_DIR));
}

// Из JS (temp_js) -> обновляем JSON (temp_macros)
function buildMacros() {
  const paths = MACRO_FOLDERS.map(f => path.join(DIST_DIR, f, '*.js'));

  console.log(`🔄 Обновляю JSON файлы в ${SRC_DIR} данными из ${DIST_DIR}...`);

  return gulp.src(paths, { base: DIST_DIR })
    .pipe(through2.obj(function(file, enc, cb) {
      if (file.isBuffer()) {
        // Вычисляем путь к оригинальному JSON файлу
        // file.relative вернет "hotbar_0e/file.js"
        const relativePath = file.relative;
        const jsonPath = path.join(SRC_DIR, relativePath.replace(/\.js$/, '.json'));
        
        if (fs.existsSync(jsonPath)) {
          try {
            const jsonContent = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            jsonContent.command = file.contents.toString();
            
            file.contents = Buffer.from(JSON.stringify(jsonContent, null, 2));
            file.path = path.resolve(jsonPath); // Устанавливаем путь назначения как путь к JSON
            
            console.log(`💾 Обновлен макрос: ${jsonPath}`);
          } catch (e) {
            console.log(`❌ Ошибка при записи в ${jsonPath}: ${e.message}`);
          }
        } else {
          console.log(`⚠️ Пропущен: Файл ${jsonPath} не найден. Некуда записывать код.`);
        }
      }
      cb(null, file);
    }))
    .pipe(gulp.dest(SRC_DIR)); // Записываем результат обратно в папку с макросами
}

/* ----------------------------------------- */
/* Watch & Export
/* ----------------------------------------- */

function watchUpdates() {
  gulp.watch(SYSTEM_SCSS, compileScss);
}

exports.default = gulp.series(compileScss, watchUpdates);
exports.css = gulp.series(compileScss);
exports.extract = extractMacros;
exports.build = buildMacros;