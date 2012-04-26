(function() {

  window.MP = {
    player: {},
    constants: {}
  };

  window.MP.constants.BASE_PTABLE = [0, 1712, 1616, 1525, 1440, 1357, 1281, 1209, 1141, 1077, 1017, 961, 907, 856, 808, 762, 720, 678, 640, 604, 570, 538, 508, 480, 453, 428, 404, 381, 360, 339, 320, 302, 285, 269, 254, 240, 226, 214, 202, 190, 180, 170, 160, 151, 143, 135, 127, 120, 113, 107, 101, 95, 90, 85, 80, 76, 71, 67, 64, 60, 57];

  $(function() {
    $('.stop').click(function(e) {
      return MP.PlayerInstance.stop();
    });
    return $('.mod').click(function(e) {
      var oReq, url;
      url = this.href;
      console.log(url);
      $(".mod").removeClass('active');
      $(this).addClass('active');
      oReq = new XMLHttpRequest();
      oReq.open("GET", url, true);
      oReq.responseType = "arraybuffer";
      oReq.onload = function(oEvent) {
        var arrayBuffer, mod;
        arrayBuffer = oReq.response;
        console.log(arrayBuffer);
        if (arrayBuffer) {
          console.log(arrayBuffer.byteLength);
          mod = new MP.Mod(arrayBuffer);
          MP.PlayerInstance.set_module(mod);
          return MP.PlayerInstance.play();
        }
      };
      oReq.send(null);
      e.preventDefault();
      return console.log("sent");
    });
  });

}).call(this);
