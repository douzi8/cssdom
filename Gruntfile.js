module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.initConfig({
    jshint: {
      all: [
        './cssdom.js',
        './lib/*.js',
        '!./lib/cssdom.front.js'
      ]
    }
  });
};