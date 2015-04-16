(function() {
  var DEFAULT_TEXT = 'input css code';
  var editor = CodeMirror.fromTextArea(document.getElementById("code"), {
    theme: 'default',
    lineNumbers: true,
    styleActiveLine: true,
    matchBrackets: true
  });
  editor.setValue(DEFAULT_TEXT);
  var editorDom = CodeMirror.fromTextArea(document.getElementById("code-dom"), {
    theme: 'default',
    lineNumbers: true,
    styleActiveLine: true,
    matchBrackets: true,
    readOnly: true
  });

  $('.CodeMirror').click(function() {
    if (editor.getValue() == DEFAULT_TEXT) {
      editor.setValue('');
    }
  });

  $('.js-create').click(function() {
    var value = editor.getValue();
    if (!value) return;
    $('.js-uglify-wrap').hide();
    $('.js-dom-wrap').show();


    var domeValue = '';
    try {
      var css = new CssDom(value);
      domeValue = JSON.stringify(css.dom);
      domeValue = js_beautify(domeValue, {
        'indent_size': 1,
        'indent_char': '\t'
      });
    } catch (e) {
      domeValue = e.message;
    }

    editorDom.setValue(domeValue);
  });


  $('.js-uglify').click(function() {
    var value = editor.getValue();
    if (!value) return;

    $('.js-dom-wrap').hide();
    $('.js-uglify-wrap').show();


    var domeValue = '';
    try {
      var css = new CssDom(value);
      domeValue = css.stringify();
    } catch (e) {
      domeValue = e.message;
    }

    $('.js-uglify-txt').val(domeValue);

  });

})();