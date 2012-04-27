
window.MP = { player: {}, constants: {}}

window.MP.constants.BASE_PTABLE = [
    0, 1712,1616,1525,1440,1357,1281,1209,1141,1077,1017, 961, 907,
    856, 808, 762, 720, 678, 640, 604, 570, 538, 508, 480, 453,
    428, 404, 381, 360, 339, 320, 302, 285, 269, 254, 240, 226,
    214, 202, 190, 180, 170, 160, 151, 143, 135, 127, 120, 113,
    107, 101,  95,  90,  85,  80,  76,  71,  67,  64,  60,  57]

$ ->

  set_sample_names = (mod) ->
    list = $('.samples')
    list.html("");
    _(mod.samples).each (sample) ->
      list.append("<li>" + sample.name + "</li>")


  $('.stop').click (e) ->
    MP.PlayerInstance.stop()
    e.preventDefault()

  $('.play').click (e) ->
    MP.PlayerInstance.play()
    e.preventDefault()

  $('.mod').click (e) ->
    url = @href
    $(".mod").removeClass('active');
    $(this).addClass('active');

    oReq = new XMLHttpRequest()
    oReq.open "GET", url, true
    oReq.responseType = "arraybuffer"
  
    oReq.onload = (oEvent) ->
      arrayBuffer = oReq.response
      if arrayBuffer
        mod = new MP.Mod(arrayBuffer)
        set_sample_names(mod)
        MP.PlayerInstance.set_module(mod);
        MP.PlayerInstance.play();
    oReq.send(null);  

    e.preventDefault()
