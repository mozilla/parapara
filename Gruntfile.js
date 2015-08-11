module.exports = function (grunt) {
  grunt.initConfig({
    dirs: {
      shared: 'shared/js',
      editor: {
        src: 'editor/lib/js',
        dest: 'editor/public/js'
      }
    },
    concat: {
      options: {
        separator: ';'
      },
      editor: {
        src: ['<%= dirs.editor.src %>/*.js', '<%= dirs.shared %>/xhr.js'],
        dest: '<%= dirs.editor.dest %>/parapara-dev.core.js'
      }
    },
    uglify: {
      editor: {
        src: '<%= concat.editor.dest %>',
        dest: '<%= dirs.editor.dest %>/parapara.core.js'
      }
    },
    watch: {
      editor: {
        files: '<%= concat.editor.src %>',
        tasks: ['concat', 'uglify']
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  
  grunt.registerTask('default', ['concat', 'uglify']);
};
