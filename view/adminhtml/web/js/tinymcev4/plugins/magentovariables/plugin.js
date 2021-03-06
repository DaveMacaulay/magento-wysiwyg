/**
 * Magento Variables plugin
 *
 * @author Dave Macaulay <dmacaulay@magento.com>
 */

/**
 * Build a basic bridge to the Variables window component, has to be in window scope due to window.Variables current
 * implementation
 *
 * @todo this and the window.Variables object would be re-written to provide a generic interface to all WYSIWYG types
 */
window.MagentoVariablesBridge = {
    variables: null,
    callback: null,

    /**
     * Open the variables slide out panel
     * @param url
     * @param callback
     * @returns {boolean}
     */
    open: function (url, callback) {
        this.callback = callback;
        if (this.variables === null) {
            new Ajax.Request(url, {
                parameters: {},
                onComplete: function (transport) {
                    if (transport.responseText.isJSON()) {
                        window.Variables.init(null, 'MagentoVariablesBridge.insertVariable');
                        this.variables = transport.responseText.evalJSON();
                        window.Variables.openVariableChooser(this.variables);
                    }
                }.bind(this)
            });
        } else {
            window.Variables.openVariableChooser(this.variables);
        }
        return false;
    },

    /**
     * Run the callback when a variable in inserted
     */
    insertVariable: function () {
        this.callback.apply(this, arguments);
        window.Variables.closeDialogWindow();
    }
};

tinymce.PluginManager.add(
    'magentovariables',
    function(editor) {
        /**
         * Add the context toolbar for the variable controls
         */
        function addContextToolbar() {
            editor.addButton('changevariable', {
                title: 'Change Variable',
                icon: 'editimage',
                onclick: function() {
                    var currentNode = editor.selection.getNode();
                    MagentoVariablesBridge.open(tinymce.typeConfig.variableActionUrl, function (variable) {
                        editor.selection.select(currentNode);
                        editor.execCommand('magentoRemoveVariable');
                        editor.insertContent(variable);
                    });
                }
            });
            editor.addCommand('magentoRemoveVariable', function () {
                editor.selection.setCursorLocation(editor.selection.getNode(), 1);
                editor.dom.remove(editor.selection.getNode());
            });
            editor.addButton('removevariable', {
                title: 'Remove',
                icon: 'remove',
                cmd: 'magentoRemoveVariable'
            });
            editor.addContextToolbar(
                function (node) {
                    return selectorMatched = editor.dom.is(node, 'span.magento-variable');
                },
                'changevariable | removevariable'
            );
        }

        // Style our variables wrapping element
        if (typeof editor.settings['content_style'] === 'undefined') {
            editor.settings['content_style'] = '';
        }
        editor.settings['content_style'] =
            editor.settings['content_style'] +
            '.magento-variable { display: inline-block; font-family:Consolas,Monaco,Lucida Console,Liberation Mono,DejaVu Sans Mono,Bitstream Vera Sans Mono,Courier New;border: 1px solid #cccccc; padding: 4px; margin: 0 2px;border-radius: 4px; }';

        // Add a button that opens a window
        editor.addButton('magentovariables', {
            text: 'V',
            icon: false,
            onclick: function () {
                MagentoVariablesBridge.open(tinymce.typeConfig.variableActionUrl, function (variable) {
                    editor.insertContent(variable);
                });
            }
        });

        /**
         * Encode any matched {{config path="..."}} nodes into span elements
         *
         * @param event
         */
        function wrapConfigNodes(event) {
            event.content = event.content.replace(
                /\{\{config path=".*"\}\}+(?![^\<span.*>]*\<\/span\>)/g,
                '<span class="magento-variable mceNonEditable" >\$&</span>'
            );
        }

        /**
         * Decode the elements removing the
         * @param event
         */
        function unwrapConfigNodes(event) {
            event.content = event.content.replace(
                /\<span.*\>\{\{config path=".*"\}\}\<\/span\>/g,
                '$1'
            );
        }

        // Observe the set content event so we can modify the appearance of our element
        editor.on('beforeSetContent', wrapConfigNodes);
        editor.on('PostProcess', unwrapConfigNodes);

        addContextToolbar();
    },
    ['noneditable']
);