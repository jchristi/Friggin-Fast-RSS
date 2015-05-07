module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish'),
      },
      /*ignore_warning: {
        '-W084': true,
      },*/
      all: {
        files: {
          src: ['Gruntfile.js', '*.js', 'include/*.js', 'test/**/*.js']
        },
        options: {
          ignores: ['node_modules/*', '.git/*'],
        },
      },
    },
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');

  // Default task(s).
  grunt.registerTask('default', ['jshint']);

  // Test suite
  grunt.registerTask('test', 'Run Mocha tests', function() {
    // TODO: Try doing this in package.json
  });

};
