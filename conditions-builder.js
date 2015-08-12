(function (reNamespace, Polymer) {
  'use strict';
  if (Polymer === undefined) {
    console.error('conditions-builder.js requires Polymer');
    return;
  }

  reNamespace.conditionsBuilder = function (options) {
    var builder = new ConditionsBuilder(this, options);
    return builder;
  };

  function ConditionsBuilder(element, options) {
    //this.element = element;
    this.options = options || {
      fields: []
    };
    this.init();
  }

  ConditionsBuilder.prototype = {
    init: function () {
      this.fields = this.options.fields;
      this.data = this.options.data || {
        "all": []
      };
      //this.element.conditionsHtml = conditionsHtml;

      // init microevents
      this._initEventsObject();
    },

    /*
      This is infrastructure for microevents
      private function _initEventsObject - initializes the event object store
      public function on - attaches an eventHandler to the desired event
      public function off - detaches an eventHandler from the desired event
      private function _triggerEvent - triggers the desired event with given event data
     */

    _initEventsObject: function () {
      // eventObjectStore for each event holds an array of function pointers (which are event handlers)
      // currently the only supported and needed event is update
      this.eventObjectStore = {
        update: []
      };
    },

    on: function (eventName, eventHandler) {
      if (this.eventObjectStore.hasOwnProperty(eventName)) {
        this.eventObjectStore[eventName].push(eventHandler);
      }
    },

    off: function (eventName, eventHandler) {
      if (this.eventObjectStore.hasOwnProperty(eventName)) {
        if (this.eventObjectStore[eventName].indexOf(eventHandler) !== -1) {
          this.eventObjectStore[eventName].remove(eventHandler);
        }
      }
    },

    _triggerEvent: function(eventName, eventData) {
      var event, handlerIndex, handlerArray, eventHandler;
      if (this.eventObjectStore.hasOwnProperty(eventName)) {
        handlerArray = this.eventObjectStore[eventName];
        if (handlerArray.length && handlerArray.length > 0) {
          event = {
            type: eventName,
            detail: eventData
          };
          for (handlerIndex = 0; handlerIndex < handlerArray.length; handlerIndex += 1) {
            eventHandler = handlerArray[handlerIndex];
            eventHandler.apply(this, event);
          }
        }
      }
    },

    setConditions: function (conditions) {
      this.fields = conditions;
    },

    setData: function (data) {
      this.data = data;
    },

    buildConditionsHtml: function () {
      var conditionsHtml = this.buildConditions(this.data);
      var _builder = this;
      setTimeout(function () {
         //trigger the update event
        _builder._triggerEvent('update', {});
      }, 200);
      return conditionsHtml;
    },

    collectData: function (conditionsHtml) {
      return this.collectDataFromNode(conditionsHtml);
    },

    collectDataFromNode: function (element) {
      var klass = null;
      var _this = this;

      if (element.classList.contains("conditional")) {
        var found = jquerySimulateFind(Polymer.dom(element), "all-any-none-wrapper", "all-any-none");
        if (found && found.length && found.length === 1) {
          klass = found[0].value;
        }
        //klass = element.find("> .all-any-none-wrapper > .all-any-none").val();
      }

      if (klass) {
        var out = {};
        out[klass] = [];
        //        var rules = Polymer.dom(element).querySelectorAll(".conditional > .rule");
        var rules = jquerySimulateFindType2(Polymer.dom(element), "conditional", "rule");
        if (rules.length > 0) {
          for (var k = 0; k < rules.length; k += 1) {
            out[klass].push(_this.collectDataFromNode(rules[k]));
          }
        }
        //element.find("> .conditional, > .rule").each(function() {});
        return out;
      } else {
        var values = Polymer.dom(element).querySelectorAll(".value");
        var lastValue = values[values.length - 1];
        return {
          name: Polymer.dom(element).querySelector(".field").value,
          operator: Polymer.dom(element).querySelector(".operator").value,
          value: lastValue.value,
          isFieldComparison: values.length > 1 && values[0].value === 'field'
        };
      }
    },

    buildRules: function (ruleData) {
      var conds = this.buildConditional(ruleData);
      var rules = this.buildRule(ruleData);
      return conds || rules;
    },

    buildConditions: function (ruleData) {
      var kind;
      if (ruleData.all) {
        kind = "all";
      } else if (ruleData.any) {
        kind = "any";
      } else if (ruleData.none) {
        kind = "none";
      }
      if (!kind) {
        return;
      }

      var div = document.createElement("div");
      div.classList.add("conditional");
      div.classList.add(kind);

      var selectWrapper = document.createElement("div");
      selectWrapper.classList.add("all-any-none-wrapper");

      var select = document.createElement("select");
      select.classList.add("all-any-none");

      var option = createSelectOption("all", "All", kind === "all");
      select.appendChild(option);
      option = createSelectOption("any", "Any", kind === "any");
      select.appendChild(option);
      option = createSelectOption("none", "None", kind === "none");
      select.appendChild(option);
      selectWrapper.appendChild(select);

      var span = document.createElement("span");
      span.textContent = "of the following conditions:";
      selectWrapper.appendChild(span);
      div.appendChild(selectWrapper);

      var addRuleLink = document.createElement("button");
//      addRuleLink.href = "#";
      addRuleLink.classList.add("add-rule");
      var addRuleText = document.createTextNode("Add Condition");
      addRuleLink.appendChild(addRuleText);
//      addRuleLink.text = "Add Condition";
      var _this = this;
      addRuleLink.addEventListener('click', function (e) {
        e.preventDefault();
        var f = _this.fields[0];
        var newField = {
          name: f.value,
          operator: f.operators[0],
          value: null
        };
        Polymer.dom(div).appendChild(_this.buildRule(newField));
        // trigger the update event
        _this._triggerEvent('update', {});
      });
      div.appendChild(addRuleLink);

      var addConditionLink = document.createElement("button");
//      addConditionLink.href = "#";
      var addConditionLinkText= document.createTextNode("Add Sub-Condition");
      addConditionLink.appendChild(addConditionLinkText);
      addConditionLink.classList.add("add-condition");
//      addConditionLink.text = "Add Sub-Condition";
      addConditionLink.addEventListener('click', function (e) {
        e.preventDefault();
        var f = _this.fields[0];
        var newField = {
          "all": [{
            name: f.value,
            operator: f.operators[0],
            value: null
          }]
        };
        Polymer.dom(div).appendChild(_this.buildConditions(newField));
        // trigger the update event
        _this._triggerEvent('update', {});
      });
      div.appendChild(addConditionLink);

      var removeLink = document.createElement("button");
//      removeLink.href = "#";
      removeLink.classList.add("remove");
      var removeLinkText = document.createTextNode('Remove This Sub-Condition');
      removeLink.appendChild(removeLinkText);
//      removeLink.value = "Remove This Sub-Condition";
      removeLink.addEventListener('click', function (e) {
        e.preventDefault();
        Polymer.dom(div.parentElement).removeChild(div);
        // trigger the update event
        _this._triggerEvent('update', {});
      });
      div.appendChild(removeLink);

      var rules = ruleData[kind];
      for (var i = 0; i < rules.length; i++) {
        var ruleHtml = this.buildRule(rules[i]);
        div.appendChild(ruleHtml);
      }

      return div;
    },

    buildRule: function (ruleData) {
      var ruleDiv = document.createElement("div");
      ruleDiv.classList.add("rule");
      var fieldSelect = getFieldSelect(this.fields, ruleData);
      var operatorSelect = getOperatorSelect();
      var _builder = this;
      // rule div hosts selects and inputs
      // its impractical to provide conditionsBuilder context deep in functions
      // catching bubbling events is much simpler
      ruleDiv.addEventListener('change', function (event) {
        // trigger the update event
        _builder._triggerEvent('update', {});
      });

      fieldSelect.addEventListener('change', function (e) {
        var fieldName = e.target.value;
        var fieldRuleData = _builder.GetRuleDataFor(fieldName);
        var operators = _builder.operatorsFor(fieldName);
        operatorSelect.innerHTML = "";
        if (operators !== undefined) {
          for (var i = 0; i < operators.length; i++) {
            var operator = operators[i];
            var option = createSelectOption(operator.name, operator.label || operator.name, fieldRuleData.operator == operator.name);
            option.setAttribute('dataFieldType', operator.fieldType);
            operatorSelect.appendChild(option);
          }
        }
        var event = document.createEvent('Event');
        event.initEvent('change', true, true);
        //var event = new Event("change");
        operatorSelect.dispatchEvent(event);
        // *ij* why setTimeout here?
        // triggering the update without delay causes the conditions data to be collected on empty conditionsHtml
        // which causes conditions data on which conditionsHtml is build to be lost
      });

      ruleDiv.appendChild(fieldSelect);
      ruleDiv.appendChild(operatorSelect);
      var _removeLink = removeLink();
      var self = this;
      _removeLink.addEventListener('click', function (event) {
        self._triggerEvent('update', {});
      });
      ruleDiv.appendChild(_removeLink);

      var event = document.createEvent('Event');
      event.initEvent('change', true, true);
      //var event = new Event("change");
      fieldSelect.dispatchEvent(event);

      var classValueElems = Polymer.dom(ruleDiv).querySelectorAll(".value");
      for (var j = 0; j < classValueElems.length; j++) {
        var cvElem = classValueElems[j];
        cvElem.value = ruleData.value;
      }

      return ruleDiv;
    },

    operatorsFor: function (fieldName) {
      for (var i = 0; i < this.fields.length; i++) {
        var field = this.fields[i];
        if (field.name == fieldName) {
          return field.operators;
        }
      }
    },

    GetRuleDataFor: function (fieldName) {
      var kind;
      if (this.data.all) {
        kind = "all";
      } else if (this.data.any) {
        kind = "any";
      } else if (this.data.none) {
        kind = "none";
      }
      if (kind) {
        var rules = this.data[kind];

        for (var i = 0; i < rules.length; i += 1) {
          if (rules[i].name === fieldName) {
            return rules[i];
          }
        }
      }

      return {
        name: fieldName,
        operator: '',
        value: ''
      };
    }
  };

  // this function simulates the > .class1 > .class2 jquery unique selector behavior
  // this function is used in two places in collectData and collectDataFromNode functions
  // this function returns an array of elements
  function jquerySimulateFind(element, class1, class2) {
    var result = [],
      elementsChildren,
      childrenIndex,
      childElement,
      subchildrenElements,
      subchildrenIndex,
      subchildElement;

    elementsChildren = element.children;

    for (childrenIndex = 0; childrenIndex < elementsChildren.length; childrenIndex += 1) {
      childElement = elementsChildren[childrenIndex];
      if (childElement.classList.contains(class1)) {
        subchildrenElements = childElement.children;
        for (subchildrenIndex = 0; subchildrenIndex < subchildrenElements.length; subchildrenIndex += 1) {
          subchildElement = subchildrenElements[subchildrenIndex];
          if (subchildElement.classList.contains(class2)) {
            result.push(subchildElement);
          }
        }
      }
    }

    return result;
  }

  // this function simulates the > .class1, > .class2 jquery unique selector behavior <- please note the semi-colon character (,)
  // this function is used in two places in collectData and collectDataFromNode functions
  // this function returns an array of elements
  function jquerySimulateFindType2(element, class1, class2) {
    var result = [],
      elementsChildren,
      childrenIndex,
      childElement;

    elementsChildren = element.children;

    for (childrenIndex = 0; childrenIndex < elementsChildren.length; childrenIndex += 1) {
      childElement = elementsChildren[childrenIndex];
      if (childElement.classList.contains(class1) || childElement.classList.contains(class2)) {
        result.push(childElement);
      }
    }

    return result;
  }

  function createSelectOption(value, text, selected) {
    var option = document.createElement("option");
    option.value = value;
    option.text = text;
    option.selected = selected;

    return option;
  }

  function getFieldSelect(fields, ruleData) {
    var select = document.createElement("select");
    select.classList.add("field");
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      var option = createSelectOption(field.name, field.label, ruleData.name === field.name);
      option.dataset.options = JSON.stringify(field.options);
      select.appendChild(option);
    }

    return select;
  }

  function getOperatorSelect() {
    var select = document.createElement("select");
    select.classList.add("operator");
    select.addEventListener('change', onOperatorSelectChange);
    return select;
  }

  function removeLink() {
    var removeLink = document.createElement("button");
    removeLink.classList.add("remove");
//    removeLink.href = "#";
//    removeLink.text = "Remove";
    var removeLinkText = document.createTextNode("Remove");
    removeLink.appendChild(removeLinkText);
    removeLink.addEventListener('click', onRemoveLinkClicked);
    return removeLink;
  }

  function onRemoveLinkClicked(e) {
    e.preventDefault();
    Polymer.dom(this.parentElement.parentElement).removeChild(this.parentElement);
  }

  function onOperatorSelectChange(e) {
    var option = Polymer.dom(this).querySelector("option:checked");
    var self = this;
    if (option !== undefined) {
      var container = option.parentElement.parentElement;
      var fieldSelect = Polymer.dom(container).querySelector(".field");
      var currentValue = Polymer.dom(container).querySelectorAll(".value");
      var fieldType = option.getAttribute("dataFieldType");
      switch (fieldType) {
      case "none":
        var nElem = document.createElement("input");
        nElem.type = "hidden";
        nElem.classList.add("value");
        container.appendChild(nElem);
        break;
      case "text":
        nElem = document.createElement("input");
        nElem.type = "text";
        nElem.classList.add("value");
        container.appendChild(nElem);
        break;
      case "textarea":
        nElem = document.createElement("textarea");
        nElem.classList.add("value");
        container.appendChild(nElem);
        break;
      case "select":
        nElem = document.createElement("select");
        nElem.classList.add("value");
        var options = Polymer.dom(fieldSelect).querySelector("option:checked").attributes.getNamedItem("data-options").value;
        options = JSON.parse(options);
        for (var i = 0; i < options.length; i++) {
          var opt = options[i];
          var htmlOption = createSelectOption(opt.name, opt.label || opt.name, false);
          htmlOption.setAttribute('fieldType', opt.fieldType);
          htmlOption.setAttribute('options', JSON.stringify(opt.options));
          nElem.appendChild(htmlOption);
        }
        container.appendChild(nElem);

        nElem.addEventListener('change', function (e) {
          var type = e.target.value;
          // remove the previous item
          var nextSibling = e.target.nextElementSibling;
          if (nextSibling !== null && nextSibling.classList.contains('remove') === false) {
            nextSibling.remove();
          }
          switch (type) {
          case 'static':
            var option = Polymer.dom(e.target).querySelector('option[value="static"]');
            var optionType = option.getAttribute('fieldType');
            var optionOptions = option.getAttribute('options') !== "undefined" ? option.getAttribute('options') : "{}";
            var optionData = JSON.parse(optionOptions);
            var input = undefined;
            if (optionType === 'select') {
              // create select here
              input = document.createElement('select');
              input.classList.add('value');
              for (var i = 0; i < optionData.length; i++) {
                var selectOption = createSelectOption(optionData[i].name, optionData[i].label, false);
                input.appendChild(selectOption);
              }
            } else {
              // create text input here
              input = document.createElement('input');
              input.setAttribute('type', 'text');
              input.classList.add('value');
            }
            var refElement = e.target.parentElement.lastChild === e.target ? null : e.target.parentElement.lastChild;
            e.target.parentElement.insertBefore(input, refElement);
            break;
          case 'field':
            var option = Polymer.dom(e.target).querySelector('option[value="field"]');
            var optionOptions = option.getAttribute('options') !== "undefined" ? option.getAttribute('options') : "{}";
            var optionData = JSON.parse(optionOptions);

            // create select here
            var selectInput = document.createElement('select');
            selectInput.classList.add('value');
            for (var i = 0; i < optionData.length; i++) {
              var selectOption = createSelectOption(optionData[i].name, optionData[i].label, false);
              selectInput.appendChild(selectOption);
            }
            var refElement = e.target.parentElement.lastChild === e.target ? null : e.target.parentElement.lastChild;
            e.target.parentElement.insertBefore(selectInput, refElement);
            break;
          default:
            break;
          }

          // trigger the update event
          //          self._triggerEvent('update', {});
        });
        var changeEvent = document.createEvent('Event');
        changeEvent.initEvent('change', true, true);
        nElem.dispatchEvent(changeEvent);

        // trigger the update event
        //        this._triggerEvent('update', {});
        break;
      case "rule":
        debugger;
        break;
      }
      var removeLink = container.getElementsByTagName("button")[0];
      removeLink.remove();
      container.appendChild(removeLink);
      if (currentValue !== undefined) {
        for (var k = 0; k < currentValue.length; k++) {
          currentValue[k].remove();
        }
      }
    }
  }

})(window.RuleEngineHelpers = window.RuleEngineHelpers || {}, window.Polymer);
