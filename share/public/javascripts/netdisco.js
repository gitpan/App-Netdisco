// parameterised for the active tab - submits search form and injects
// HTML response into the tab pane, or an error/empty-results message
function do_search (event, tab) {
  var form = '#' + tab + '_form';
  var target = '#' + tab + '_pane';

  // stop form from submitting normally
  event.preventDefault();

  // page title
  var pgtitle = 'Netdisco';
  if ($('#nd_device-name').text().length) {
    var pgtitle = $('#nd_device-name').text() +' - '+ $('#'+ tab + '_link').text();
  }

  // each sidebar search form has a hidden copy of the main navbar search
  // query. when the tab query takes place, copy the navbar locally, then
  // replicate to all other tabs.
  if (path != 'report' && path != 'admin') {
    if ($('#nq').val()) {
      $(form).find("input[name=q]").val( $('#nq').val() );
    }
    $('form').find("input[name=q]").each( function() {
      $(this).val( $(form).find("input[name=q]").val() );
    });
  }

  // hide or show sidebars depending on previous state,
  // and whether the sidebar contains any content (detected by TT)
  if (has_sidebar[tab] == 0) {
    $('.nd_sidebar, #nd_sidebar-toggle-img-out').hide();
    $('.content').css('margin-right', '10px');
  }
  else {
    if (sidebar_hidden) {
      $('#nd_sidebar-toggle-img-out').show();
    }
    else {
      $('.content').css('margin-right', '215px');
      $('.nd_sidebar').show();
    }
  }

  // get the form params
  var query = $(form).serialize();

  // update browser search history with the new query.
  // however if it's the same tab, this is a *replace* of the query url.
  // and just skip this bit if it's the report or admin display.
  if (path != 'report' && path != 'admin' && window.History && window.History.enabled) {
    is_from_history_plugin = 1;
    window.History.replaceState(
      {name: tab, fields: $(form).serializeArray()},
      pgtitle, uri_base + '/' + path + '?' + query
    );
    is_from_history_plugin = 0;
  }

  // in case of slow data load, let the user know
  $(target).html(
    '<div class="span2 alert">Waiting for results...</div>'
  );

  // submit the query and put results into the tab pane
  $(target).load( uri_base + '/ajax/content/' + path + '/' + tab + '?' + query,
    function(response, status, xhr) {
      if (status !== "success") {
        $(target).html(
          '<div class="span5 alert alert-error">' +
          'Search failed! Please contact your site administrator.</div>'
        );
        return;
      }
      if (response === "") {
        $(target).html(
          '<div class="span2 alert alert-info">No matching records.</div>'
        );
      }

      // delegate to any [device|search] specific JS code
      inner_view_processing(tab);
    }
  );
}

// keep track of which tabs have a sidebar, for when switching tab
var has_sidebar = {};
var sidebar_hidden = 0;

// the history.js plugin is great, but fires statechange at pushState
// so we have these semaphpores to help avoid messing the History.

// set true when faking a user click on a tab
var is_from_state_event = 0;
// set true when the history plugin does pushState - to prevent loop
var is_from_history_plugin = 0;

// on tab change, hide previous tab's search form and show new tab's
// search form. also trigger to load the content for the newly active tab.
function update_content(from, to) {
  $('#' + from + '_search').toggleClass('active');
  $('#' + to + '_search').toggleClass('active');

  var to_form = '#' + to + '_form';
  var from_form = '#' + from + '_form';

  // page title
  var pgtitle = 'Netdisco';
  if ($('#nd_device-name').text().length) {
    var pgtitle = $('#nd_device-name').text() +' - '+ $('#'+ to + '_link').text();
  }

  if (window.History && window.History.enabled && is_from_state_event == 0) {
    is_from_history_plugin = 1;
    window.History.pushState(
      {name: to, fields: $(to_form).serializeArray()},
      pgtitle, uri_base + '/' + path + '?' + $(to_form).serialize()
    );
    is_from_history_plugin = 0;
  }

  $(to_form).trigger("submit");
}

// handler for ajax navigation
if (window.History && window.History.enabled) {
  var History = window.History;
  History.Adapter.bind(window, "statechange", function() {
    if (is_from_history_plugin == 0) {
      is_from_state_event = 1;
      var State = History.getState();
      // History.log(State.data.name, State.title, State.url);
      $('#'+ State.data.name + '_form').deserialize(State.data.fields);
      $('#'+ State.data.name + '_link').click();
      is_from_state_event = 0;
    }
  });
}

// if any field in Search Options has content, highlight in green
function device_form_state(e) {
  if (e.prop('value') != "") {
    e.parent(".clearfix").addClass('success');

    if (e.parents('#device_form').length) {
      $('#nq').css('text-decoration', 'line-through');

      if (e.attr('type') == 'text') {
        $('.nd_field-copy-icon').hide();
      }
    }

    var id = '#' + e.attr('name') + '_clear_btn';
    $(id).show();
  }
  else {
    e.parent(".clearfix").removeClass('success');
    var id = '#' + e.attr('name') + '_clear_btn';
    $(id).hide();

    var num_empty = $.grep(form_inputs,
                           function(n,i) {return($(n).val() != "")}).length;
    if (num_empty === 3) {
      $('#nq').css('text-decoration', 'none');
      $('.nd_field-copy-icon').show();
    }
  }
}

$(document).ready(function() {
  // sidebar form fields should change colour and have bin/copy icon
  $('.nd_field-copy-icon').hide();
  $('.nd_field-clear-icon').hide();

  // activate typeahead on the main search box, for device names only
  $('#nq').typeahead({
    source: function (query, process) {
      return $.get( uri_base + '/ajax/data/devicename/typeahead', { query: query }, function (data) {
        return process(data);
      });
    }
    ,matcher: function () { return true; } // trust backend
    ,minLength: 3
  });

  // activate tooltips
  $("[rel=tooltip]").tooltip({live: true});

  // bind submission to the navbar go icon
  $('#navsearchgo').click(function() {
    $('#navsearchgo').parents('form').submit();
  });

  // fix green background on search checkboxes
  // https://github.com/twitter/bootstrap/issues/742
  syncCheckBox = function() {
    $(this).parents('.add-on').toggleClass('active', $(this).is(':checked'));
  };
  $('.add-on :checkbox').each(syncCheckBox).click(syncCheckBox);

  // sidebar toggle - pinning
  $('.nd_sidebar-pin').click(function() {
    $('.nd_sidebar').toggleClass('nd_sidebar-pinned');
    $('.nd_sidebar-pin').toggleClass('nd_sidebar-pin-clicked');
    // update tooltip note for current state
    if ($('.nd_sidebar-pin').hasClass('nd_sidebar-pin-clicked')) {
      $('.nd_sidebar-pin').first().data('tooltip').options.title = 'Unpin Sidebar';
    }
    else {
      $('.nd_sidebar-pin').first().data('tooltip').options.title = 'Pin Sidebar';
    }
  });

  // sidebar toggle - trigger in/out on image click()
  $('#nd_sidebar-toggle-img-in').click(function() {
    $('.nd_sidebar').toggle(250);
    $('#nd_sidebar-toggle-img-out').toggle();
    $('.content').css('margin-right', '10px');
    sidebar_hidden = 1;
  });
  $('#nd_sidebar-toggle-img-out').click(function() {
    $('#nd_sidebar-toggle-img-out').toggle();
    $('.content').css('margin-right', '215px');
    $('.nd_sidebar').toggle(250);
    if (! $('.nd_sidebar').hasClass('nd_sidebar-pinned')) {
        $(window).scrollTop(0);
    }
    sidebar_hidden = 0;
  });

  // could not get twitter bootstrap tabs to behave, so implemented this
  // but warning! will probably not work for dropdowns in tabs
  $('#nd_search-results li').delegate('a', 'click', function(event) {
    event.preventDefault();
    var from_li = $('.nav-tabs').find('> .active').first();
    var to_li = $(this).parent('li')

    from_li.toggleClass('active');
    to_li.toggleClass('active');

    var from_id = from_li.find('a').attr('href');
    var to_id = $(this).attr('href');

    if (from_id == to_id) {
      return;
    }

    $(from_id).toggleClass('active');
    $(to_id).toggleClass('active');

    update_content(
      from_id.replace(/^#/,"").replace(/_pane$/,""),
      to_id.replace(/^#/,"").replace(/_pane$/,"")
    );
  });
});
