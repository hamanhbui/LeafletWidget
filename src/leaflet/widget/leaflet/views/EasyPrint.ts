import L = require("./../../../libs/leaflet-src");
import saveAs = require("./../../../libs/FileSaver");
var util = newUtil();
var inliner = newInliner();
var fontFaces = newFontFaces();
var images = newImages();

// Default impl options
var defaultOptions = {
    // Default is to fail on error, no placeholder
    imagePlaceholder: undefined,
    // Default cache bust is false, it will use the cache
    cacheBust: false
};

var domtoimage = {
    toSvg: toSvg,
    toPng: toPng,
    toJpeg: toJpeg,
    toBlob: toBlob,
    toPixelData: toPixelData,
    impl: {
        fontFaces: fontFaces,
        images: images,
        util: util,
        inliner: inliner,
        options: {}
    }
};
/**
    * @param {Node} node - The DOM Node object to render
    * @param {Object} options - Rendering options
    * @param {Function} options.filter - Should return true if passed node should be included in the output
    *          (excluding node means excluding it's children as well). Not called on the root node.
    * @param {String} options.bgcolor - color for the background, any valid CSS color value.
    * @param {Number} options.width - width to be applied to node before rendering.
    * @param {Number} options.height - height to be applied to node before rendering.
    * @param {Object} options.style - an object whose properties to be copied to node's style before rendering.
    * @param {Number} options.quality - a Number between 0 and 1 indicating image quality (applicable to JPEG only),
               defaults to 1.0.
    * @param {String} options.imagePlaceholder - dataURL to use as a placeholder for failed images, default behaviour is to fail fast on images we can't fetch
    * @param {Boolean} options.cacheBust - set to true to cache bust by appending the time to the request url
    * @return {Promise} - A promise that is fulfilled with a SVG image data URL
    * */
function toSvg(node, options) {
    options = options || {};
    copyOptions(options);
    return Promise.resolve(node)
        .then(function (node) {
            return cloneNode(node, options.filter, true);
        })
        .then(embedFonts)
        .then(inlineImages)
        .then(applyOptions)
        .then(function (clone) {
            return makeSvgDataUri(clone,
                options.width || util.width(node),
                options.height || util.height(node)
            );
        });

    function applyOptions(clone) {
        if (options.bgcolor) clone.style.backgroundColor = options.bgcolor;

        if (options.width) clone.style.width = options.width + 'px';
        if (options.height) clone.style.height = options.height + 'px';

        if (options.style)
            Object.keys(options.style).forEach(function (property) {
                clone.style[property] = options.style[property];
            });

        return clone;
    }
}

/**
 * @param {Node} node - The DOM Node object to render
 * @param {Object} options - Rendering options, @see {@link toSvg}
 * @return {Promise} - A promise that is fulfilled with a Uint8Array containing RGBA pixel data.
 * */
function toPixelData(node, options) {
    return draw(node, options || {})
        .then(function (canvas) {
            return canvas.getContext('2d').getImageData(
                0,
                0,
                util.width(node),
                util.height(node)
            ).data;
        });
}

/**
 * @param {Node} node - The DOM Node object to render
 * @param {Object} options - Rendering options, @see {@link toSvg}
 * @return {Promise} - A promise that is fulfilled with a PNG image data URL
 * */
function toPng(node, options) {
    return draw(node, options || {})
        .then(function (canvas) {
            return canvas.toDataURL();
        });
}

/**
 * @param {Node} node - The DOM Node object to render
 * @param {Object} options - Rendering options, @see {@link toSvg}
 * @return {Promise} - A promise that is fulfilled with a JPEG image data URL
 * */
function toJpeg(node, options) {
    options = options || {};
    return draw(node, options)
        .then(function (canvas) {
            return canvas.toDataURL('image/jpeg', options.quality || 1.0);
        });
}

/**
 * @param {Node} node - The DOM Node object to render
 * @param {Object} options - Rendering options, @see {@link toSvg}
 * @return {Promise} - A promise that is fulfilled with a PNG image blob
 * */
function toBlob(node, options) {
    return draw(node, options || {})
        .then(util.canvasToBlob);
}

function copyOptions(options) {
    // Copy options to impl options for use in impl
    if (typeof (options.imagePlaceholder) === 'undefined') {
        domtoimage.impl.options.imagePlaceholder = defaultOptions.imagePlaceholder;
    } else {
        domtoimage.impl.options.imagePlaceholder = options.imagePlaceholder;
    }

    if (typeof (options.cacheBust) === 'undefined') {
        domtoimage.impl.options.cacheBust = defaultOptions.cacheBust;
    } else {
        domtoimage.impl.options.cacheBust = options.cacheBust;
    }
}

function draw(domNode, options) {
    return toSvg(domNode, options)
        .then(util.makeImage)
        .then(util.delay(100))
        .then(function (image) {
            var canvas = newCanvas(domNode);
            canvas.getContext('2d').drawImage(image, 0, 0);
            return canvas;
        });

    function newCanvas(domNode) {
        var canvas = document.createElement('canvas');
        canvas.width = options.width || util.width(domNode);
        canvas.height = options.height || util.height(domNode);

        if (options.bgcolor) {
            var ctx = canvas.getContext('2d');
            ctx.fillStyle = options.bgcolor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        return canvas;
    }
}

function cloneNode(node, filter, root) {
    if (!root && filter && !filter(node)) return Promise.resolve();

    return Promise.resolve(node)
        .then(makeNodeCopy)
        .then(function (clone) {
            return cloneChildren(node, clone, filter);
        })
        .then(function (clone) {
            return processClone(node, clone);
        });

    function makeNodeCopy(node) {
        if (node instanceof HTMLCanvasElement) return util.makeImage(node.toDataURL());
        return node.cloneNode(false);
    }

    function cloneChildren(original, clone, filter) {
        var children = original.childNodes;
        if (children.length === 0) return Promise.resolve(clone);

        return cloneChildrenInOrder(clone, util.asArray(children), filter)
            .then(function () {
                return clone;
            });

        function cloneChildrenInOrder(parent, children, filter) {
            var done = Promise.resolve();
            children.forEach(function (child) {
                done = done
                    .then(function () {
                        return cloneNode(child, filter);
                    })
                    .then(function (childClone) {
                        if (childClone) parent.appendChild(childClone);
                    });
            });
            return done;
        }
    }

    function processClone(original, clone) {
        if (!(clone instanceof Element)) return clone;

        return Promise.resolve()
            .then(cloneStyle)
            .then(clonePseudoElements)
            .then(copyUserInput)
            .then(fixSvg)
            .then(function () {
                return clone;
            });

        function cloneStyle() {
            copyStyle(window.getComputedStyle(original), clone.style);

            function copyStyle(source, target) {
                if (source.cssText) target.cssText = source.cssText;
                else copyProperties(source, target);

                function copyProperties(source, target) {
                    util.asArray(source).forEach(function (name) {
                        target.setProperty(
                            name,
                            source.getPropertyValue(name),
                            source.getPropertyPriority(name)
                        );
                    });
                }
            }
        }

        function clonePseudoElements() {
            [':before', ':after'].forEach(function (element) {
                clonePseudoElement(element);
            });

            function clonePseudoElement(element) {
                var style = window.getComputedStyle(original, element);
                var content = style.getPropertyValue('content');

                if (content === '' || content === 'none') return;

                var className = util.uid();
                clone.className = clone.className + ' ' + className;
                var styleElement = document.createElement('style');
                styleElement.appendChild(formatPseudoElementStyle(className, element, style));
                clone.appendChild(styleElement);

                function formatPseudoElementStyle(className, element, style) {
                    var selector = '.' + className + ':' + element;
                    var cssText = style.cssText ? formatCssText(style) : formatCssProperties(style);
                    return document.createTextNode(selector + '{' + cssText + '}');

                    function formatCssText(style) {
                        var content = style.getPropertyValue('content');
                        return style.cssText + ' content: ' + content + ';';
                    }

                    function formatCssProperties(style) {

                        return util.asArray(style)
                            .map(formatProperty)
                            .join('; ') + ';';

                        function formatProperty(name) {
                            return name + ': ' +
                                style.getPropertyValue(name) +
                                (style.getPropertyPriority(name) ? ' !important' : '');
                        }
                    }
                }
            }
        }

        function copyUserInput() {
            if (original instanceof HTMLTextAreaElement) clone.innerHTML = original.value;
            if (original instanceof HTMLInputElement) clone.setAttribute("value", original.value);
        }

        function fixSvg() {
            if (!(clone instanceof SVGElement)) return;
            clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

            if (!(clone instanceof SVGRectElement)) return;
            ['width', 'height'].forEach(function (attribute) {
                var value = clone.getAttribute(attribute);
                if (!value) return;

                clone.style.setProperty(attribute, value);
            });
        }
    }
}

function embedFonts(node) {
    return fontFaces.resolveAll()
        .then(function (cssText) {
            var styleNode = document.createElement('style');
            node.appendChild(styleNode);
            styleNode.appendChild(document.createTextNode(cssText));
            return node;
        });
}

function inlineImages(node) {
    return images.inlineAll(node)
        .then(function () {
            return node;
        });
}

function makeSvgDataUri(node, width, height) {
    return Promise.resolve(node)
        .then(function (node) {
            node.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
            return new XMLSerializer().serializeToString(node);
        })
        .then(util.escapeXhtml)
        .then(function (xhtml) {
            return '<foreignObject x="0" y="0" width="100%" height="100%">' + xhtml + '</foreignObject>';
        })
        .then(function (foreignObject) {
            return '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' +
                foreignObject + '</svg>';
        })
        .then(function (svg) {
            return 'data:image/svg+xml;charset=utf-8,' + svg;
        });
}

function newUtil() {
    return {
        escape: escape,
        parseExtension: parseExtension,
        mimeType: mimeType,
        dataAsUrl: dataAsUrl,
        isDataUrl: isDataUrl,
        canvasToBlob: canvasToBlob,
        resolveUrl: resolveUrl,
        getAndEncode: getAndEncode,
        uid: uid(),
        delay: delay,
        asArray: asArray,
        escapeXhtml: escapeXhtml,
        makeImage: makeImage,
        width: width,
        height: height
    };

    function mimes() {
        /*
         * Only WOFF and EOT mime types for fonts are 'real'
         * see http://www.iana.org/assignments/media-types/media-types.xhtml
         */
        var WOFF = 'application/font-woff';
        var JPEG = 'image/jpeg';

        return {
            'woff': WOFF,
            'woff2': WOFF,
            'ttf': 'application/font-truetype',
            'eot': 'application/vnd.ms-fontobject',
            'png': 'image/png',
            'jpg': JPEG,
            'jpeg': JPEG,
            'gif': 'image/gif',
            'tiff': 'image/tiff',
            'svg': 'image/svg+xml'
        };
    }

    function parseExtension(url) {
        var match = /\.([^\.\/]*?)$/g.exec(url);
        if (match) return match[1];
        else return '';
    }

    function mimeType(url) {
        var extension = parseExtension(url).toLowerCase();
        return mimes()[extension] || '';
    }

    function isDataUrl(url) {
        return url.search(/^(data:)/) !== -1;
    }

    function toBlob(canvas) {
        return new Promise(function (resolve) {
            var binaryString = window.atob(canvas.toDataURL().split(',')[1]);
            var length = binaryString.length;
            var binaryArray = new Uint8Array(length);

            for (var i = 0; i < length; i++)
                binaryArray[i] = binaryString.charCodeAt(i);

            resolve(new Blob([binaryArray], {
                type: 'image/png'
            }));
        });
    }

    function canvasToBlob(canvas) {
        if (canvas.toBlob)
            return new Promise(function (resolve) {
                canvas.toBlob(resolve);
            });

        return toBlob(canvas);
    }

    function resolveUrl(url, baseUrl) {
        var doc = document.implementation.createHTMLDocument();
        var base = doc.createElement('base');
        doc.head.appendChild(base);
        var a = doc.createElement('a');
        doc.body.appendChild(a);
        base.href = baseUrl;
        a.href = url;
        return a.href;
    }

    function uid() {
        var index = 0;

        return function () {
            return 'u' + fourRandomChars() + index++;

            function fourRandomChars() {
                /* see http://stackoverflow.com/a/6248722/2519373 */
                return ('0000' + (Math.random() * Math.pow(36, 4) << 0).toString(36)).slice(-4);
            }
        };
    }

    function makeImage(uri) {
        return new Promise(function (resolve, reject) {
            var image = new Image();
            image.onload = function () {
                resolve(image);
            };
            image.onerror = reject;
            image.src = uri;
        });
    }

    function getAndEncode(url) {
        var TIMEOUT = 30000;
        if (domtoimage.impl.options.cacheBust) {
            // Cache bypass so we dont have CORS issues with cached images
            // Source: https://developer.mozilla.org/en/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest#Bypassing_the_cache
            url += ((/\?/).test(url) ? "&" : "?") + (new Date()).getTime();
        }

        return new Promise(function (resolve) {
            var request = new XMLHttpRequest();

            request.onreadystatechange = done;
            request.ontimeout = timeout;
            request.responseType = 'blob';
            request.timeout = TIMEOUT;
            request.open('GET', url, true);
            request.send();

            var placeholder;
            if (domtoimage.impl.options.imagePlaceholder) {
                var split = domtoimage.impl.options.imagePlaceholder.split(/,/);
                if (split && split[1]) {
                    placeholder = split[1];
                }
            }

            function done() {
                if (request.readyState !== 4) return;

                if (request.status !== 200) {
                    if (placeholder) {
                        resolve(placeholder);
                    } else {
                        fail('cannot fetch resource: ' + url + ', status: ' + request.status);
                    }

                    return;
                }

                var encoder = new FileReader();
                encoder.onloadend = function () {
                    var content = encoder.result.split(/,/)[1];
                    resolve(content);
                };
                encoder.readAsDataURL(request.response);
            }

            function timeout() {
                if (placeholder) {
                    resolve(placeholder);
                } else {
                    fail('timeout of ' + TIMEOUT + 'ms occured while fetching resource: ' + url);
                }
            }

            function fail(message) {
                console.error(message);
                resolve('');
            }
        });
    }

    function dataAsUrl(content, type) {
        return 'data:' + type + ';base64,' + content;
    }

    function escape(string) {
        return string.replace(/([.*+?^${}()|\[\]\/\\])/g, '\\$1');
    }

    function delay(ms) {
        return function (arg) {
            return new Promise(function (resolve) {
                setTimeout(function () {
                    resolve(arg);
                }, ms);
            });
        };
    }

    function asArray(arrayLike) {
        var array = [];
        var length = arrayLike.length;
        for (var i = 0; i < length; i++) array.push(arrayLike[i]);
        return array;
    }

    function escapeXhtml(string) {
        return string.replace(/#/g, '%23').replace(/\n/g, '%0A');
    }

    function width(node) {
        var leftBorder = px(node, 'border-left-width');
        var rightBorder = px(node, 'border-right-width');
        return node.scrollWidth + leftBorder + rightBorder;
    }

    function height(node) {
        var topBorder = px(node, 'border-top-width');
        var bottomBorder = px(node, 'border-bottom-width');
        return node.scrollHeight + topBorder + bottomBorder;
    }

    function px(node, styleProperty) {
        var value = window.getComputedStyle(node).getPropertyValue(styleProperty);
        return parseFloat(value.replace('px', ''));
    }
}

function newInliner() {
    var URL_REGEX = /url\(['"]?([^'"]+?)['"]?\)/g;

    return {
        inlineAll: inlineAll,
        shouldProcess: shouldProcess,
        impl: {
            readUrls: readUrls,
            inline: inline
        }
    };

    function shouldProcess(string) {
        return string.search(URL_REGEX) !== -1;
    }

    function readUrls(string) {
        var result = [];
        var match;
        while ((match = URL_REGEX.exec(string)) !== null) {
            result.push(match[1]);
        }
        return result.filter(function (url) {
            return !util.isDataUrl(url);
        });
    }

    function inline(string, url, baseUrl, get) {
        return Promise.resolve(url)
            .then(function (url) {
                return baseUrl ? util.resolveUrl(url, baseUrl) : url;
            })
            .then(get || util.getAndEncode)
            .then(function (data) {
                return util.dataAsUrl(data, util.mimeType(url));
            })
            .then(function (dataUrl) {
                return string.replace(urlAsRegex(url), '$1' + dataUrl + '$3');
            });

        function urlAsRegex(url) {
            return new RegExp('(url\\([\'"]?)(' + util.escape(url) + ')([\'"]?\\))', 'g');
        }
    }

    function inlineAll(string, baseUrl, get) {
        if (nothingToInline()) return Promise.resolve(string);

        return Promise.resolve(string)
            .then(readUrls)
            .then(function (urls) {
                var done = Promise.resolve(string);
                urls.forEach(function (url) {
                    done = done.then(function (string) {
                        return inline(string, url, baseUrl, get);
                    });
                });
                return done;
            });

        function nothingToInline() {
            return !shouldProcess(string);
        }
    }
}

function newFontFaces() {
    return {
        resolveAll: resolveAll,
        impl: {
            readAll: readAll
        }
    };

    function resolveAll() {
        return readAll(document)
            .then(function (webFonts) {
                return Promise.all(
                    webFonts.map(function (webFont) {
                        return webFont.resolve();
                    })
                );
            })
            .then(function (cssStrings) {
                return cssStrings.join('\n');
            });
    }

    function readAll() {
        return Promise.resolve(util.asArray(document.styleSheets))
            .then(getCssRules)
            .then(selectWebFontRules)
            .then(function (rules) {
                return rules.map(newWebFont);
            });

        function selectWebFontRules(cssRules) {
            return cssRules
                .filter(function (rule) {
                    return rule.type === CSSRule.FONT_FACE_RULE;
                })
                .filter(function (rule) {
                    return inliner.shouldProcess(rule.style.getPropertyValue('src'));
                });
        }

        function getCssRules(styleSheets) {
            var cssRules = [];
            styleSheets.forEach(function (sheet) {
                try {
                    util.asArray(sheet.cssRules || []).forEach(cssRules.push.bind(cssRules));
                } catch (e) {
                    console.log('Error while reading CSS rules from ' + sheet.href, e.toString());
                }
            });
            return cssRules;
        }

        function newWebFont(webFontRule) {
            return {
                resolve: function resolve() {
                    var baseUrl = (webFontRule.parentStyleSheet || {}).href;
                    return inliner.inlineAll(webFontRule.cssText, baseUrl);
                },
                src: function () {
                    return webFontRule.style.getPropertyValue('src');
                }
            };
        }
    }
}

function newImages() {
    return {
        inlineAll: inlineAll,
        impl: {
            newImage: newImage
        }
    };

    function newImage(element) {
        return {
            inline: inline
        };

        function inline(get) {
            if (util.isDataUrl(element.src)) return Promise.resolve();

            return Promise.resolve(element.src)
                .then(get || util.getAndEncode)
                .then(function (data) {
                    return util.dataAsUrl(data, util.mimeType(element.src));
                })
                .then(function (dataUrl) {
                    return new Promise(function (resolve, reject) {
                        element.onload = resolve;
                        element.onerror = reject;
                        element.src = dataUrl;
                    });
                });
        }
    }

    function inlineAll(node) {
        if (!(node instanceof Element)) return Promise.resolve(node);

        return inlineBackground(node)
            .then(function () {
                if (node instanceof HTMLImageElement)
                    return newImage(node).inline();
                else
                    return Promise.all(
                        util.asArray(node.childNodes).map(function (child) {
                            return inlineAll(child);
                        })
                    );
            });

        function inlineBackground(node) {
            var background = node.style.getPropertyValue('background');

            if (!background) return Promise.resolve(node);

            return inliner.inlineAll(background)
                .then(function (inlined) {
                    node.style.setProperty(
                        'background',
                        inlined,
                        node.style.getPropertyPriority('background')
                    );
                })
                .then(function () {
                    return node;
                });
        }
    }
}
export function easyPrint() {

    L.Control.EasyPrint = L.Control.extend({
        options: {
            download: false,
            title: 'Download map',
            position: 'topleft',
            sizeModes: ['Current'],
            filename: 'map',
            exportOnly: false,
            hidden: false,
            tileWait: 500,
            hideControlContainer: true,
            hideClasses: [],
            customWindowTitle: window.document.title,
            spinnerBgCOlor: '#0DC5C1',
            customSpinnerClass: 'epLoader',
            defaultSizeTitles: {
                // Current: 'Current Size',
                A4Landscape: 'A4 Landscape',
                // A4Portrait: 'A4 Portrait'
            }
        },

        _a4PageSize: {
            height: 715,
            width: 1045
        },

        setA4Size() {
            const mapContainer = document.getElementById("mapContainer");
            if (!mapContainer) return;
            this._a4PageSize.width = mapContainer.offsetWidth;
            this._a4PageSize.height = mapContainer.offsetHeight;
        },

        onAdd: function () {
            this.setA4Size();
            this.mapContainer = this._map.getContainer();
            this.options.sizeModes = this.options.sizeModes.map(function (sizeMode) {
                // if (sizeMode === 'Current') {
                //     return {
                //         name: this.options.defaultSizeTitles.Current,
                //         className: 'CurrentSize'
                //     }
                // }
                if (sizeMode === 'A4Landscape') {
                    return {
                        height: this._a4PageSize.height,
                        width: this._a4PageSize.width,
                        name: this.options.defaultSizeTitles.A4Landscape,
                        className: 'A4Landscape page'
                    }
                }
                // if (sizeMode === 'A4Portrait') {
                //     return {
                //         height: this._a4PageSize.width,
                //         width: this._a4PageSize.height,
                //         name: this.options.defaultSizeTitles.A4Portrait,
                //         className: 'A4Portrait page'
                //     }
                // };
                return sizeMode;
            }, this);

            var container = L.DomUtil.create('div', 'leaflet-control-easyPrint leaflet-bar leaflet-control');
            if (!this.options.hidden) {
                this._addCss();

                L.DomEvent.addListener(container, 'mouseover', this._togglePageSizeButtons, this);
                L.DomEvent.addListener(container, 'mouseout', this._togglePageSizeButtons, this);

                var btnClass = 'leaflet-control-easyPrint-button'
                if (this.options.exportOnly) btnClass = btnClass + '-export'

                this.link = L.DomUtil.create('a', btnClass, container);
                this.link.id = "leafletEasyPrint";
                this.link.title = this.options.title;
                this.holder = L.DomUtil.create('ul', 'easyPrintHolder', container);
                L.DomEvent.addListener(this.link, 'click', this.printMap, this);
                // this.options.sizeModes.forEach(function (sizeMode) {
                //     var btn = L.DomUtil.create('li', 'easyPrintSizeMode', this.holder);
                //     btn.title = sizeMode.name;
                //     var link = L.DomUtil.create('a', sizeMode.className, btn);
                //     L.DomEvent.addListener(btn, 'click', this.printMap, this);
                // }, this);

                L.DomEvent.disableClickPropagation(container);
            }
            return container;
        },

        printMap: function (event, filename) {
            if (filename) {
                this.options.filename = filename
            }
            if (!this.options.exportOnly) {
                this._page = window.open("", "_blank", 'toolbar=no,status=no,menubar=no,scrollbars=no,resizable=no,left=10, top=10, width=200, height=250, visible=none');
                this._page.document.write(this._createSpinner(this.options.customWindowTitle, this.options.customSpinnerClass, this.options.spinnerBgCOlor));
            }
            this.originalState = {
                mapWidth: this.mapContainer.style.width,
                widthWasAuto: false,
                widthWasPercentage: false,
                mapHeight: this.mapContainer.style.height,
                zoom: this._map.getZoom(),
                center: this._map.getCenter()
            };
            if (this.originalState.mapWidth === 'auto') {
                this.originalState.mapWidth = this._map.getSize().x + 'px'
                this.originalState.widthWasAuto = true
            } else if (this.originalState.mapWidth.includes('%')) {
                this.originalState.percentageWidth = this.originalState.mapWidth
                this.originalState.widthWasPercentage = true
                this.originalState.mapWidth = this._map.getSize().x + 'px'
            }
            this._map.fire("easyPrint-start", { event: event });
            if (!this.options.hidden) {
                this._togglePageSizeButtons({ type: null });
            }
            if (this.options.hideControlContainer) {
                this._toggleControls();
            }
            if (this.options.hideClasses) {
                this._toggleClasses(this.options.hideClasses);
            }
            var sizeMode = typeof event !== 'string' ? event.target.className : event;
            if (sizeMode === 'CurrentSize') {
                return this._printOpertion(sizeMode);
            }
            this.outerContainer = this._createOuterContainer(this.mapContainer)
            if (this.originalState.widthWasAuto) {
                this.outerContainer.style.width = this.originalState.mapWidth
            }
            this._createImagePlaceholder(sizeMode)
        },

        _createImagePlaceholder: function (sizeMode) {
            var plugin = this;
            domtoimage.toPng(this.mapContainer, {
                width: parseInt(this.originalState.mapWidth.replace('px')),
                height: parseInt(this.originalState.mapHeight.replace('px'))
            })
                .then(function (dataUrl) {
                    plugin.blankDiv = document.createElement("div");
                    var blankDiv = plugin.blankDiv;
                    plugin.outerContainer.parentElement.insertBefore(blankDiv, plugin.outerContainer);
                    blankDiv.className = 'epHolder';
                    blankDiv.style.backgroundImage = 'url("' + dataUrl + '")';
                    blankDiv.style.position = 'absolute';
                    blankDiv.style.zIndex = 1011;
                    blankDiv.style.display = 'initial';
                    blankDiv.style.width = plugin.originalState.mapWidth;
                    blankDiv.style.height = plugin.originalState.mapHeight;
                    plugin._resizeAndPrintMap(sizeMode);
                })
                .catch(function (error) {
                    plugin.blankDiv = document.createElement("div");
                    plugin.outerContainer.parentElement.insertBefore(plugin.blankDiv, plugin.outerContainer);
                    var a = document.createElement("a");
                    document.body.appendChild(a);
                    a.style = "display: none";
                    const fileName = plugin.options.filename + '.png';
                    a.download = fileName;
                    a.click();
                    document.body.removeChild(a);

                    plugin._toggleControls(true);
                    plugin._toggleClasses(plugin.options.hideClasses, true);

                    if (plugin.outerContainer) {
                        if (plugin.originalState.widthWasAuto) {
                            plugin.mapContainer.style.width = 'auto'
                        } else if (plugin.originalState.widthWasPercentage) {
                            plugin.mapContainer.style.width = plugin.originalState.percentageWidth
                        }
                        else {
                            plugin.mapContainer.style.width = plugin.originalState.mapWidth;
                        }
                        plugin.mapContainer.style.height = plugin.originalState.mapHeight;
                        plugin._removeOuterContainer(plugin.mapContainer, plugin.outerContainer, plugin.blankDiv)
                        plugin._map.invalidateSize();
                        plugin._map.setView(plugin.originalState.center);
                        plugin._map.setZoom(plugin.originalState.zoom);
                    }
                    plugin._map.fire("easyPrint-finished");
                    console.error('oops, something went wrong!', error);
                });
        },

        _resizeAndPrintMap: function (sizeMode) {
            // this.outerContainer.style.opacity = 0;
            var pageSize = this.options.sizeModes.filter(function (item) {
                return item.className.indexOf("A4Landscape page") > -1;
            });
            pageSize = pageSize[0];
            const mapContainer = document.getElementById("mapContainer");
            this.mapContainer.style.width = mapContainer!.offsetWidth + 'px';
            this.mapContainer.style.height = mapContainer!.offsetHeight + 'px';
            if (this.mapContainer.style.width > this.mapContainer.style.height) {
                this.orientation = 'portrait';
            } else {
                this.orientation = 'landscape';
            }
            this._map.setView(this.originalState.center);
            this._map.setZoom(this.originalState.zoom);
            this._map.invalidateSize();
            if (this.options.tileLayer) {
                this._pausePrint(sizeMode)
            } else {
                this._printOpertion(sizeMode)
            }
        },

        _pausePrint: function (sizeMode) {
            var plugin = this
            var loadingTest = setInterval(function () {
                if (!plugin.options.tileLayer.isLoading()) {
                    clearInterval(loadingTest);
                    plugin._printOpertion(sizeMode)
                }
            }, plugin.options.tileWait);
        },

        _printOpertion: function (sizemode) {
            var plugin = this;
            var widthForExport = this.mapContainer.style.width
            if (this.originalState.widthWasAuto && sizemode === 'CurrentSize' || this.originalState.widthWasPercentage && sizemode === 'CurrentSize') {
                widthForExport = this.originalState.mapWidth
            }
            domtoimage.toPng(plugin.mapContainer, {
                width: parseInt(widthForExport),
                height: parseInt(plugin.mapContainer.style.height.replace('px'))
            })
                .then(function (dataUrl) {
                    var blob = plugin._dataURItoBlob(dataUrl);
                    if (plugin.options.exportOnly) {
                        if (plugin.options.download) {
                            var a = document.createElement("a");
                            document.body.appendChild(a);
                            a.style = "display: none";
                            const fileName = plugin.options.filename + '.png';
                            var url = window.URL.createObjectURL(blob)
                            a.href = url;
                            a.download = fileName;
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                            // saveAs(blob, plugin.options.filename + '.png');
                        }
                        else plugin._map.fire("clickOnScreenShot", { blob: blob });

                    } else {
                        plugin._sendToBrowserPrint(dataUrl, plugin.orientation);
                    }
                    plugin._toggleControls(true);
                    plugin._toggleClasses(plugin.options.hideClasses, true);

                    if (plugin.outerContainer) {
                        if (plugin.originalState.widthWasAuto) {
                            plugin.mapContainer.style.width = 'auto'
                        } else if (plugin.originalState.widthWasPercentage) {
                            plugin.mapContainer.style.width = plugin.originalState.percentageWidth
                        }
                        else {
                            plugin.mapContainer.style.width = plugin.originalState.mapWidth;
                        }
                        plugin.mapContainer.style.height = plugin.originalState.mapHeight;
                        plugin._removeOuterContainer(plugin.mapContainer, plugin.outerContainer, plugin.blankDiv)
                        plugin._map.invalidateSize();
                        plugin._map.setView(plugin.originalState.center);
                        plugin._map.setZoom(plugin.originalState.zoom);
                    }
                    plugin._map.fire("easyPrint-finished");
                })
                .catch(function (error) {
                    console.error('Print operation failed', error);
                });
        },

        _sendToBrowserPrint: function (img, orientation) {
            this._page.resizeTo(600, 800);
            var pageContent = this._createNewWindow(img, orientation, this)
            this._page.document.body.innerHTML = ''
            this._page.document.write(pageContent);
            this._page.document.close();
        },

        _createSpinner: function (title, spinnerClass, spinnerColor) {
            return `<html><head><title>` + title + `</title></head><body><style>
      body{
        background: ` + spinnerColor + `;
      }
      .epLoader,
      .epLoader:before,
      .epLoader:after {
        border-radius: 50%;
      }
      .epLoader {
        color: #ffffff;
        font-size: 11px;
        text-indent: -99999em;
        margin: 55px auto;
        position: relative;
        width: 10em;
        height: 10em;
        box-shadow: inset 0 0 0 1em;
        -webkit-transform: translateZ(0);
        -ms-transform: translateZ(0);
        transform: translateZ(0);
      }
      .epLoader:before,
      .epLoader:after {
        position: absolute;
        content: '';
      }
      .epLoader:before {
        width: 5.2em;
        height: 10.2em;
        background: #0dc5c1;
        border-radius: 10.2em 0 0 10.2em;
        top: -0.1em;
        left: -0.1em;
        -webkit-transform-origin: 5.2em 5.1em;
        transform-origin: 5.2em 5.1em;
        -webkit-animation: load2 2s infinite ease 1.5s;
        animation: load2 2s infinite ease 1.5s;
      }
      .epLoader:after {
        width: 5.2em;
        height: 10.2em;
        background: #0dc5c1;
        border-radius: 0 10.2em 10.2em 0;
        top: -0.1em;
        left: 5.1em;
        -webkit-transform-origin: 0px 5.1em;
        transform-origin: 0px 5.1em;
        -webkit-animation: load2 2s infinite ease;
        animation: load2 2s infinite ease;
      }
      @-webkit-keyframes load2 {
        0% {
          -webkit-transform: rotate(0deg);
          transform: rotate(0deg);
        }
        100% {
          -webkit-transform: rotate(360deg);
          transform: rotate(360deg);
        }
      }
      @keyframes load2 {
        0% {
          -webkit-transform: rotate(0deg);
          transform: rotate(0deg);
        }
        100% {
          -webkit-transform: rotate(360deg);
          transform: rotate(360deg);
        }
      }
      </style>
    <div class="`+ spinnerClass + `">Loading...</div></body></html>`;
        },

        _createNewWindow: function (img, orientation, plugin) {
            return `<html><head>
        <style>@media print {
          img { max-width: 98%!important; max-height: 98%!important; }
          @page { size: ` + orientation + `;}}
        </style>
        <script>function step1(){
        setTimeout('step2()', 10);}
        function step2(){window.print();window.close()}
        </script></head><body onload='step1()'>
        <img src="` + img + `" style="display:block; margin:auto;"></body></html>`;
        },

        _createOuterContainer: function (mapDiv) {
            var outerContainer = document.createElement('div');
            mapDiv.parentNode.insertBefore(outerContainer, mapDiv);
            mapDiv.parentNode.removeChild(mapDiv);
            outerContainer.appendChild(mapDiv);
            outerContainer.style.width = mapDiv.style.width;
            outerContainer.style.height = mapDiv.style.height;
            // outerContainer.style.display = 'inline-block'
            outerContainer.style.overflow = 'hidden';
            return outerContainer;
        },

        _removeOuterContainer: function (mapDiv, outerContainer, blankDiv) {
            if (outerContainer.parentNode) {
                outerContainer.parentNode.insertBefore(mapDiv, outerContainer);
                outerContainer.parentNode.removeChild(blankDiv);
                outerContainer.parentNode.removeChild(outerContainer);
            }
        },

        _addCss: function () {
            var css = document.createElement("style");
            css.type = "text/css";
            css.innerHTML = `.leaflet-control-easyPrint-button { 
      background-image: url(data:image/svg+xml;utf8;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pgo8IS0tIEdlbmVyYXRvcjogQWRvYmUgSWxsdXN0cmF0b3IgMTYuMC4wLCBTVkcgRXhwb3J0IFBsdWctSW4gLiBTVkcgVmVyc2lvbjogNi4wMCBCdWlsZCAwKSAgLS0+CjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iQ2FwYV8xIiB4PSIwcHgiIHk9IjBweCIgd2lkdGg9IjE2cHgiIGhlaWdodD0iMTZweCIgdmlld0JveD0iMCAwIDUxMiA1MTIiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDUxMiA1MTI7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4KPGc+Cgk8cGF0aCBkPSJNMTI4LDMyaDI1NnY2NEgxMjhWMzJ6IE00ODAsMTI4SDMyYy0xNy42LDAtMzIsMTQuNC0zMiwzMnYxNjBjMCwxNy42LDE0LjM5OCwzMiwzMiwzMmg5NnYxMjhoMjU2VjM1Mmg5NiAgIGMxNy42LDAsMzItMTQuNCwzMi0zMlYxNjBDNTEyLDE0Mi40LDQ5Ny42LDEyOCw0ODAsMTI4eiBNMzUyLDQ0OEgxNjBWMjg4aDE5MlY0NDh6IE00ODcuMTk5LDE3NmMwLDEyLjgxMy0xMC4zODcsMjMuMi0yMy4xOTcsMjMuMiAgIGMtMTIuODEyLDAtMjMuMjAxLTEwLjM4Ny0yMy4yMDEtMjMuMnMxMC4zODktMjMuMiwyMy4xOTktMjMuMkM0NzYuODE0LDE1Mi44LDQ4Ny4xOTksMTYzLjE4Nyw0ODcuMTk5LDE3NnoiIGZpbGw9IiMwMDAwMDAiLz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8L3N2Zz4K);
      background-size: 16px 16px; 
      cursor: pointer; 
    }
    .leaflet-control-easyPrint-button-export { 
      background-image: url(data:image/svg+xml;utf8;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pgo8IS0tIEdlbmVyYXRvcjogQWRvYmUgSWxsdXN0cmF0b3IgMTYuMC4wLCBTVkcgRXhwb3J0IFBsdWctSW4gLiBTVkcgVmVyc2lvbjogNi4wMCBCdWlsZCAwKSAgLS0+CjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iQ2FwYV8xIiB4PSIwcHgiIHk9IjBweCIgd2lkdGg9IjE2cHgiIGhlaWdodD0iMTZweCIgdmlld0JveD0iMCAwIDQzMy41IDQzMy41IiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCA0MzMuNSA0MzMuNTsiIHhtbDpzcGFjZT0icHJlc2VydmUiPgo8Zz4KCTxnIGlkPSJmaWxlLWRvd25sb2FkIj4KCQk8cGF0aCBkPSJNMzk1LjI1LDE1M2gtMTAyVjBoLTE1M3YxNTNoLTEwMmwxNzguNSwxNzguNUwzOTUuMjUsMTUzeiBNMzguMjUsMzgyLjV2NTFoMzU3di01MUgzOC4yNXoiIGZpbGw9IiMwMDAwMDAiLz4KCTwvZz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8L3N2Zz4K);
      background-size: 16px 16px; 
      cursor: pointer; 
    }
    .easyPrintHolder a {
      background-size: 16px 16px;
      cursor: pointer;
    }
    .easyPrintHolder .CurrentSize{
      background-image: url(data:image/svg+xml;utf8;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCFET0NUWVBFIHN2ZyBQVUJMSUMgIi0vL1czQy8vRFREIFNWRyAxLjEvL0VOIiAiaHR0cDovL3d3dy53My5vcmcvR3JhcGhpY3MvU1ZHLzEuMS9EVEQvc3ZnMTEuZHRkIj4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMTZweCIgdmVyc2lvbj0iMS4xIiBoZWlnaHQ9IjE2cHgiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgNjQgNjQiPgogIDxnPgogICAgPGcgZmlsbD0iIzFEMUQxQiI+CiAgICAgIDxwYXRoIGQ9Ik0yNS4yNTUsMzUuOTA1TDQuMDE2LDU3LjE0NVY0Ni41OWMwLTEuMTA4LTAuODk3LTIuMDA4LTIuMDA4LTIuMDA4QzAuODk4LDQ0LjU4MiwwLDQ1LjQ4MSwwLDQ2LjU5djE1LjQwMiAgICBjMCwwLjI2MSwwLjA1MywwLjUyMSwwLjE1NSwwLjc2N2MwLjIwMywwLjQ5MiwwLjU5NCwwLjg4MiwxLjA4NiwxLjA4N0MxLjQ4Niw2My45NDcsMS43NDcsNjQsMi4wMDgsNjRoMTUuNDAzICAgIGMxLjEwOSwwLDIuMDA4LTAuODk4LDIuMDA4LTIuMDA4cy0wLjg5OC0yLjAwOC0yLjAwOC0yLjAwOEg2Ljg1NWwyMS4yMzgtMjEuMjRjMC43ODQtMC43ODQsMC43ODQtMi4wNTUsMC0yLjgzOSAgICBTMjYuMDM5LDM1LjEyMSwyNS4yNTUsMzUuOTA1eiIgZmlsbD0iIzAwMDAwMCIvPgogICAgICA8cGF0aCBkPSJtNjMuODQ1LDEuMjQxYy0wLjIwMy0wLjQ5MS0wLjU5NC0wLjg4Mi0xLjA4Ni0xLjA4Ny0wLjI0NS0wLjEwMS0wLjUwNi0wLjE1NC0wLjc2Ny0wLjE1NGgtMTUuNDAzYy0xLjEwOSwwLTIuMDA4LDAuODk4LTIuMDA4LDIuMDA4czAuODk4LDIuMDA4IDIuMDA4LDIuMDA4aDEwLjU1NmwtMjEuMjM4LDIxLjI0Yy0wLjc4NCwwLjc4NC0wLjc4NCwyLjA1NSAwLDIuODM5IDAuMzkyLDAuMzkyIDAuOTA2LDAuNTg5IDEuNDIsMC41ODlzMS4wMjctMC4xOTcgMS40MTktMC41ODlsMjEuMjM4LTIxLjI0djEwLjU1NWMwLDEuMTA4IDAuODk3LDIuMDA4IDIuMDA4LDIuMDA4IDEuMTA5LDAgMi4wMDgtMC44OTkgMi4wMDgtMi4wMDh2LTE1LjQwMmMwLTAuMjYxLTAuMDUzLTAuNTIyLTAuMTU1LTAuNzY3eiIgZmlsbD0iIzAwMDAwMCIvPgogICAgPC9nPgogIDwvZz4KPC9zdmc+Cg==)
    }
    .easyPrintHolder .page {
      background-image: url(data:image/svg+xml;utf8;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pgo8IS0tIEdlbmVyYXRvcjogQWRvYmUgSWxsdXN0cmF0b3IgMTguMS4xLCBTVkcgRXhwb3J0IFBsdWctSW4gLiBTVkcgVmVyc2lvbjogNi4wMCBCdWlsZCAwKSAgLS0+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iQ2FwYV8xIiB4PSIwcHgiIHk9IjBweCIgdmlld0JveD0iMCAwIDQ0NC44MzMgNDQ0LjgzMyIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgNDQ0LjgzMyA0NDQuODMzOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSIgd2lkdGg9IjUxMnB4IiBoZWlnaHQ9IjUxMnB4Ij4KPGc+Cgk8Zz4KCQk8cGF0aCBkPSJNNTUuMjUsNDQ0LjgzM2gzMzQuMzMzYzkuMzUsMCwxNy03LjY1LDE3LTE3VjEzOS4xMTdjMC00LjgxNy0xLjk4My05LjM1LTUuMzgzLTEyLjQ2N0wyNjkuNzMzLDQuNTMzICAgIEMyNjYuNjE3LDEuNywyNjIuMzY3LDAsMjU4LjExNywwSDU1LjI1Yy05LjM1LDAtMTcsNy42NS0xNywxN3Y0MTAuODMzQzM4LjI1LDQzNy4xODMsNDUuOSw0NDQuODMzLDU1LjI1LDQ0NC44MzN6ICAgICBNMzcyLjU4MywxNDYuNDgzdjAuODVIMjU2LjQxN3YtMTA4LjhMMzcyLjU4MywxNDYuNDgzeiBNNzIuMjUsMzRoMTUwLjE2N3YxMzAuMzMzYzAsOS4zNSw3LjY1LDE3LDE3LDE3aDEzMy4xNjd2MjI5LjVINzIuMjVWMzR6ICAgICIgZmlsbD0iIzAwMDAwMCIvPgoJPC9nPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+Cjwvc3ZnPgo=);
    }
    .easyPrintHolder .A4Landscape { 
      transform: rotate(-90deg);
    }

    .leaflet-control-easyPrint-button{
      display: inline-block;
    }
    .easyPrintHolder{
      margin-top:-31px;
      margin-bottom: -5px;
      margin-left: 30px;
      padding-left: 0px;
      display: none;
    }

    .easyPrintSizeMode {
      display: inline-block;
    }
    .easyPrintHolder .easyPrintSizeMode a {
      border-radius: 0px;
    }

    .easyPrintHolder .easyPrintSizeMode:last-child a{
      border-top-right-radius: 2px;
      border-bottom-right-radius: 2px;
      margin-left: -1px;
    }

    .easyPrintPortrait:hover, .easyPrintLandscape:hover{
      background-color: #757570;
      cursor: pointer;
    }`;
            document.body.appendChild(css);
        },

        _dataURItoBlob: function (dataURI) {
            var byteString = atob(dataURI.split(',')[1]);
            var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
            var ab = new ArrayBuffer(byteString.length);
            var dw = new DataView(ab);
            for (var i = 0; i < byteString.length; i++) {
                dw.setUint8(i, byteString.charCodeAt(i));
            }
            return new Blob([ab], { type: mimeString });
        },

        _togglePageSizeButtons: function (e) {
            var holderStyle = this.holder.style
            var linkStyle = this.link.style
            if (e.type === 'mouseover') {
                // holderStyle.display = 'block';
                // linkStyle.borderTopRightRadius = '0'
                // linkStyle.borderBottomRightRadius = '0'
            } else {
                holderStyle.display = 'none';
                linkStyle.borderTopRightRadius = '2px'
                linkStyle.borderBottomRightRadius = '2px'
            }
        },

        _toggleControls: function (show) {
            var controlContainer = document.getElementsByClassName("leaflet-control-container")[0];
            if (show) return controlContainer.style.display = 'block';
            controlContainer.style.display = 'none';
        },
        _toggleClasses: function (classes, show) {
            classes.forEach(function (className) {
                var div = document.getElementsByClassName(className)[0];
                if (show) return div.style.display = 'block';
                div.style.display = 'none';
            });
        }

    });

    L.easyPrint = function (options) {
        return new L.Control.EasyPrint(options);
    };

}