import { withPluginApi } from "discourse/lib/plugin-api";

export default {
  name: "discourse-reply-template-component-setup",

  initialize() {
    withPluginApi("0.8", api => {
      const minimumOffset = require("discourse/lib/offset-calculator").minimumOffset;
      const { iconHTML } = require("discourse-common/lib/icon-library");
      const { run } = Ember;

      const mobileView = $("html").hasClass("mobile-view");

      const linkIcon = iconHTML(settings.anchor_icon);
      const closeIcon = iconHTML("times");
      const dtodoIcon = iconHTML("align-left");
      const dtodoHeading = I18n.t(themePrefix("todo"));
      const currUser = api.getCurrentUser();
      const currUserTrustLevel = currUser ? currUser.trust_level : "";
      const minimumTrustLevel = settings.minimum_trust_level_to_create_TODO;

      const SCROLL_THROTTLE = 300;
      const SMOOTH_SCROLL_SPEED = 300;
      const TODO_ANIMATION_SPEED = 300;

      const setUpTodoItem = function(item) {
        const unique = item.attr("id");
        const checked = item.hasClass("checked");
        const todoCheckList = $('<span />', { style: 'cursor: pointer;' });

        todoCheckList.addClass(item.attr("class"));

        const todoItem = $("<li/>", {
          class: "d-todo-item",
          "data-d-todo": unique
        });

        if (checked) {
          todoCheckList.prop('checked', true);
        }

        todoCheckList.click((ev) => {
          let checked = item.hasClass("checked");
          item.click();
          checked ? item.removeClass("checked") : item.addClass("checked");
          todoCheckList.removeAttr("class");
          todoCheckList.addClass(item.attr("class"));
        });

        todoItem.append(todoCheckList);
        todoItem.append(
          $("<a/>", {
            text: item[0].nextSibling.textContent
          })
        );

        return todoItem;
      };

      (function(dTodo) {
        dTodo($, window);
        $.widget("discourse.dTodo", {
          _create: function() {
            this.generateDtodo();
            this.setEventHandlers();
          },

          generateDtodo: function() {
            const self = this;

            const primaryHeadings = this.options.headings;

            self.element.addClass("d-todo");

            $.each(primaryHeadings, function(index, value) {
              const selectors = self.options.selectors,
                ul = $("<ul/>", {
                  id: `d-todo-top-heading-${index}`,
                  class: "d-todo-heading"
                });

              ul.append(setUpTodoItem($(this)));

              self.element.append(ul);

            });
          },

          setEventHandlers: function() {
            const self = this;

            const dtodoMobile = () => {
              $(".d-todo").toggleClass("d-todo-mobile");
            };

            this.element.on("click.d-todo", "li", function() {
              self.element.find(".d-todo-active").removeClass("d-todo-active");
              $(this).addClass("d-todo-active");
              if (mobileView) {
                dtodoMobile();
              } else {
                let elem = $(`li[data-d-todo="${$(this).attr("data-d-todo")}"]`);
              }
            });

            $("#main").on(
              "click.toggleDtodo",
              ".d-todo-toggle, .d-todo-close",
              dtodoMobile
            );
          },
        });
      })(() => {});

      api.decorateCooked($elem => {
        run.scheduleOnce("actions", () => {
          if ($elem.hasClass("d-editor-preview")) return;
          if ($elem.parents("article#post_1").length) return;

          const dTodo = $elem.find(`[data-theme-todo="true"]`);

          if (!dTodo.length) return this;
          const body = $elem;

          let dTodoHeadingSelectors = ".chcklst-box";
          let dTodoHeadings = [];
          body.find(dTodoHeadingSelectors).each(function() {
            if ($(this).hasClass("permanent")) return;
            dTodoHeadings.push($(this));

            $(this).parent().css("display", "none");
          });

          body
            .addClass("d-todo-cooked")
            .prepend(
              `<span class="d-todo-toggle">
                    ${dtodoIcon} ${I18n.t(themePrefix("todo"))}
                    </span>`
            )
            .parents(".regular")
            .addClass("d-todo-regular")
            .parents("article")
            .addClass("d-todo-article")
            .append(
              `<section><h3>${dtodoHeading}</h3><ul id="d-todo">
                      <div class="d-todo-close-wrapper">
                        <div class="d-todo-close">
                          ${closeIcon}
                        </div>
                      </div>
                    </ul></section>`
            )
            .parents(".topic-post")
            .addClass("d-todo-post")
            .parents("body")
            .addClass("d-todo-timeline");

          $("#d-todo").dTodo({
            cooked: body,
            selectors: dTodoHeadingSelectors,
            headings: dTodoHeadings
          });
        });
      }, {id: "disco-todo"});

      api.cleanupStream(() => {
        $(window).off("scroll.d-todo");
        $("#main").off("click.toggleDtodo");
        $(".d-todo-timeline").removeClass("d-todo-timeline d-todo-timeline-visible");
      });

      api.onAppEvent("topic:current-post-changed", post => {
        if (!$(".d-todo-timeline").length) return;
        run.scheduleOnce("afterRender", () => {
          if (post.post.post_number <= 2) {
            $("body").removeClass("d-todo-timeline-visible");
            $(".d-todo-toggle").fadeIn(100);
          } else {
            $("body").addClass("d-todo-timeline-visible");
            $(".d-todo-toggle").fadeOut(100);
          }
        });
      });

      if (currUserTrustLevel >= minimumTrustLevel) {
        if (!I18n.translations[I18n.currentLocale()].js.composer) {
          I18n.translations[I18n.currentLocale()].js.composer = {};
        }
        I18n.translations[I18n.currentLocale()].js.composer.contains_dtodo = " ";


        api.addToolbarPopupMenuOptionsCallback(() => {
          const composerController = api.container.lookup("controller:composer");
          return {
            action: "insertDtodo",
            icon: "align-left",
            label: themePrefix("insert_todo_list"),
            condition: !composerController.get("model.canCategorize")
          };
        });

        api.modifyClass("controller:composer", {
          actions: {
            insertDtodo() {
              this.get("toolbarEvent").applySurround(
                `<div data-theme-todo="true">`,
                `</div>`,
                "contains_dtodo"
              );
            }
          }
        });
      }
    });
  }
};