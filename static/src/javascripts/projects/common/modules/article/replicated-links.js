define([
    'fastdom',
    'qwery',
    'Promise',
    'common/utils/_',
    'common/utils/$',
    'common/utils/ajax-promise',
    'common/utils/config',
    'common/utils/detect',
    'common/utils/mediator',
    'common/utils/template',
    'common/modules/article/spacefinder',
    'common/modules/ui/images',
    'text!common/views/content/richLinkTag.html'
], function (
    fastdom,
    qwery,
    Promise,
    _,
    $,
    ajax,
    config,
    detect,
    mediator,
    template,
    spacefinder,
    imagesModule,
    richLinkTagTmpl
) {
    function upgradeLink(el) {
        var a = $('a', el),
            href = a.attr('href'),
            matches = href.match(/(?:^https?:\/\/(?:www\.|m\.code\.dev-)theguardian\.com)?(\/.*)/);

        if (matches && matches[1]) {
            return ajax({
                url: '/embed/headline' + matches[1] + '.json',
                crossOrigin: true
            }).then(function (resp) {
                if (resp.headline) {
                    fastdom.write(function () {
                        $(a).text(resp.headline)
                            .removeClass('element-replicated-link--not-upgraded')
                            .addClass('element-replicated-link--upgraded');
                        mediator.emit('replicated-link:loaded', el);
                    });
                }
            });
        } else {
            return Promise.resolve(null);
        }
    }

    function getSpacefinderRules() {
        return {
            minAbove: 200,
            minBelow: 250,
            clearContentMeta: 50,
            selectors: {
                ' > h2': {minAbove: detect.getBreakpoint() === 'mobile' ? 20 : 0, minBelow: 200},
                ' > *:not(p):not(h2):not(blockquote)': {minAbove: 35, minBelow: 300},
                ' .ad-slot': {minAbove: 150, minBelow: 200},
                ' .element-rich-link': {minAbove: 500, minBelow: 500}
            }
        };
    }

    function insertTagRichLink() {
        var richLinkHrefs = $('.element-rich-link a')
                .map(function (el) { return $(el).attr('href'); }),
            testIfDuplicate = function (richLinkHref) {
                // Tag-targeted rich links can be absolute
                return _.contains(config.page.richLink, richLinkHref);
            },
            isDuplicate = richLinkHrefs.some(testIfDuplicate),
            isSensitive = config.page.shouldHideAdverts || !config.page.showRelatedContent;

        if (config.page.richLink && config.page.richLink.indexOf(config.page.pageId) === -1
            && !isSensitive && !isDuplicate) {

            return spacefinder.getParaWithSpace(getSpacefinderRules()).then(function (space) {
                return new Promise(function (resolve) {
                    if (space) {
                        fastdom.write(function () {
                            var $el = $.create(template(richLinkTagTmpl, {href: config.page.richLink}));
                            $el.insertBefore(space);
                            resolve(upgradeLink($el[0]));
                        });
                    } else {
                        resolve(null);
                    }
                });
            });
        } else {
            return Promise.resolve(null);
        }
    }

    function upgradeLinks() {
        $('.element-replicated-link--not-upgraded').each(upgradeLink);
    }

    return {
        upgradeLinks: upgradeLinks
    };
});