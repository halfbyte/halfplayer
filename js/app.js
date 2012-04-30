(function() {

  window.MP = {
    player: {},
    constants: {}
  };

  window.MP.constants.BASE_PTABLE = [0, 1712, 1616, 1525, 1440, 1357, 1281, 1209, 1141, 1077, 1017, 961, 907, 856, 808, 762, 720, 678, 640, 604, 570, 538, 508, 480, 453, 428, 404, 381, 360, 339, 320, 302, 285, 269, 254, 240, 226, 214, 202, 190, 180, 170, 160, 151, 143, 135, 127, 120, 113, 107, 101, 95, 90, 85, 80, 76, 71, 67, 64, 60, 57];

  $(function() {
    var set_sample_names;
    if (!MP.PlayerInstance) {
      $('.notice').append("<div class='error'>This Browser does not support realtime audio output. Please use Firefox, Chrome or install Flash.</div>");
      return null;
    }
    set_sample_names = function(mod) {
      var list;
      list = $('.samples');
      list.html("");
      return _(mod.samples).each(function(sample) {
        return list.append("<li>" + sample.name + "</li>");
      });
    };
    $('.stop').click(function(e) {
      var me;
      e.preventDefault();
      me = $(this);
      if (me.hasClass('inactive')) return;
      $('.button.play').removeClass('active');
      me.addClass('active');
      return MP.PlayerInstance.stop();
    });
    $('.play').click(function(e) {
      var me;
      e.preventDefault();
      me = $(this);
      if (me.hasClass('inactive')) return;
      MP.PlayerInstance.play();
      me.addClass('active');
      return $('.button.stop').removeClass('active');
    });
    return $('.mod').click(function(e) {
      var oReq, url;
      url = this.href;
      $(".mod").removeClass('active');
      $(this).addClass('active');
      oReq = new XMLHttpRequest();
      oReq.open("GET", url, true);
      oReq.responseType = "arraybuffer";
      oReq.onload = function(oEvent) {
        var arrayBuffer, mod;
        arrayBuffer = oReq.response;
        if (arrayBuffer) {
          mod = new MP.Mod(arrayBuffer);
          set_sample_names(mod);
          MP.PlayerInstance.set_module(mod);
          MP.PlayerInstance.play();
          $('.button.stop,.button.play').removeClass('inactive');
          return $('.button.play').addClass('active');
        }
      };
      oReq.send(null);
      return e.preventDefault();
    });
  });

}).call(this);
