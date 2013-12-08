// to tell whether bootstrap's modal had Submit button pressed :(
var nd_save_ok = false;

// user clicked or asked for port changes to be submitted via ajax
function port_control (e) {
  var td = $(e).closest('td'),
      logmessage = $('#nd_portlog-log').val();
  $('#nd_portlog-log').val('');

  if (nd_save_ok == false) {
    td.find('.nd_editable-cell-content').text(td.data('default'));
    td.blur();
    return;
  }
  nd_save_ok = false;

  $.ajax({
    type: 'POST'
    ,url: uri_base + '/ajax/portcontrol'
    ,data: {
      device:  td.data('for-device')
      ,port:   td.data('for-port')
      ,field:  td.data('field')
      ,action: td.data('action')
      ,value:  td.text().trim()
      ,log:    logmessage,
    }
    ,success: function() {
      toastr.info('Submitted change request');

      // update all the screen furniture for port up/down control
      if ($.trim(td.data('action')) == 'down') {
        td.prev('td').html('<i class="icon-remove"></i>');
        $(e).toggleClass('icon-hand-down');
        $(e).toggleClass('icon-hand-up');
        $(e).data('tooltip').options.title = 'Click to Enable';
        td.data('action', 'up');
      }
      else if ($.trim(td.data('action')) == 'up') {
        td.prev('td').html('<i class="icon-refresh icon-spin"></i>');
        $(e).toggleClass('icon-hand-up');
        $(e).toggleClass('icon-hand-down');
        $(e).data('tooltip').options.title = 'Click to Disable';
        td.data('action', 'down');
      }
      else if ($.trim(td.data('action')) == 'false') {
        $(e).next('span').text('');
        $(e).toggleClass('nd_power-on');
        $(e).data('tooltip').options.title = 'Click to Enable';
        td.data('action', 'true');
      }
      else if ($.trim(td.data('action')) == 'true') {
        $(e).toggleClass('nd_power-on');
        $(e).data('tooltip').options.title = 'Click to Disable';
        td.data('action', 'false');
      }
    }
    ,error: function() {
      toastr.error('Failed to submit change request');
      td.find('.nd_editable-cell-content').text(td.data('default'));
      td.blur();
    }
  });
}

// on load, establish global delegations for now and future
$(document).ready(function() {
  // for growl-like functionality, check for notifications periodically
  if (nd_check_userlog) {
    (function worker() {
      $.ajax({
        url: uri_base + '/ajax/userlog'
        ,success: function(data) {
          for (var i = 0; i < data['error'].length; i++) {
            toastr.error(data['error'][i], 'Failed Job:');
          }
          for (var i = 0; i < data['done'].length; i++) {
            toastr.success(data['done'][i], 'Successful Job:');
          }
          // Schedule next request when the current one's complete
          setTimeout(worker, 5000);
        }
        ,error: function() {
          // after one failure, don't try again
          toastr.warning('Unable to retrieve change request log')
        }
      });
    })();
  }

  // toggle visibility of port up/down and edit controls
  $('.tab-content').on('mouseenter', '.nd_editable-cell', function() {
    $(this).children('.nd_hand-icon').show();
    if (! $(this).is(':focus')) {
      $(this).children('.nd_edit-icon').show(); // ports
      $(this).siblings('td').find('.nd_device-details-edit').show(); // details
    }
  });
  $('.tab-content').on('mouseleave', '.nd_editable-cell', function() {
    $(this).children('.nd_hand-icon').hide();
    if (! $(this).is(':focus')) {
      $(this).children('.nd_edit-icon').hide(); // ports
      $(this).siblings('td').find('.nd_device-details-edit').hide(); // details
    }
  });
  $('.tab-content').on('focus', '[contenteditable=true]', function() {
      $(this).children('.nd_edit-icon').hide(); // ports
      $(this).siblings('td').find('.nd_device-details-edit').hide(); // details
  });

  // to tell whether bootstrap's modal had Submit button pressed :(
  $('#ports_pane').on('click', '#nd_portlog-submit', function() {
    nd_save_ok = true;
  });

  // activity for port up/down control, power enable/disable control
  $('#ports_pane').on('click', '.icon-hand-up,.icon-hand-down,.nd_power-icon', function() {
    var clicked = this; // create a closure
    $('#nd_portlog').one('hidden', function() {
      port_control(clicked); // save
    });
    $('#nd_portlog').modal('show');
  });

  // has cell content changed?
  var dirty = false;

  // activity for contenteditable control
  $('.tab-content').on('keydown', '[contenteditable=true]', function(event) {
    var cell = this,
        td = $(cell).closest('td'),
        esc = event.which == 27,
        nl  = event.which == 13;

    if (esc) {
      $(cell).blur();
    }
    else if (nl) {
      event.preventDefault();

      if (td.data('field') == 'c_vlan') {
        $('#nd_portlog').one('hidden', function() {
          port_control(cell); // save
        });
        $('#nd_portlog').modal('show');
      }
      else {
        // no confirm for port descr change
        nd_save_ok = true;
        port_control(cell); // save
      }

      dirty = false;
      $(cell).blur();
    }
    else {
      dirty = true;
    }
  });

  // activity for contenteditable control
  $('.tab-content').on('blur', '[contenteditable=true]', function(event) {
    if (dirty) {
      document.execCommand('undo');
      dirty = false;
      $(this).blur();
    }
  });

});
